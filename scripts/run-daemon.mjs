#!/usr/bin/env node
// scripts/run-daemon.mjs
//
// Daemon entry point invoked from .github/workflows/kernel-daemon.yml every
// 6 hours. Replaces the prior `timeout 600 node src/kernel.mjs` invocation,
// which booted the kernel into an idle loop with operators=0 and produced
// zero canon rows.
//
// Each tick runs a real, value-producing witness step (not just a heartbeat):
//
//   1. Open canon, verify the chain.
//   2. Load the witness rotation from claims/witness-queue.jsonl.
//   3. Pick the next claim by round-robin over the count of prior
//      claim_witness rows. Each entry is { id, claim, substrate_path }.
//   4. Run the conservativity primitive (pure function, no API calls)
//      against the substrate file resolved relative to the repo root.
//      Conservativity returns PASS / FAIL / PENDING with a `detail`
//      string describing recall and numeric matching.
//   5. Append a `claim_witness` row carrying { claim_id, claim_text,
//      substrate_path, verdict, detail, witness_primitive, queue_index,
//      tick_at } — replay-verifiable, accumulating.
//   6. Append a `daemon_heartbeat` row carrying run metadata + which
//      claim was witnessed this tick.
//   7. Update state/daemon-progress.json with the latest tick's hashes
//      and verdict so the analyzer can escalate FAIL verdicts.
//
// Bateson L4 substrate shift (2026-04-25):
//   - The prior heartbeat-only tick was Level 0 — "I exist". No
//     information content; canon grew but said nothing.
//   - The witness tick is L4: each row is a verifiable claim about the
//     kernel's own architecture against its own source. Drift between
//     a claim and its substrate produces a deterministic FAIL verdict
//     that the analyzer escalates as [WARNING] — real signal, not noise.
//
// When external operators (channels, experiment, witness stack on
// non-self claims) get wired in later, they append AFTER these rows,
// chaining cleanly.

import { openCanon } from "../src/canon.mjs";
import { computeNetTrust } from "../src/nettrust.mjs";
import { conservativity } from "../src/witness/conservativity.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CANON_PATH = join(ROOT, "canon", "default.jsonl");
const QUEUE_PATH = join(ROOT, "claims", "witness-queue.jsonl");
const PROGRESS_PATH = join(ROOT, "state", "daemon-progress.json");

async function loadQueue(path) {
  const txt = await readFile(path, "utf-8");
  return txt
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => JSON.parse(l));
}

async function main() {
  console.log("polybrain-kernel daemon tick starting...");

  const canon = await openCanon(CANON_PATH);
  const chain = canon.verifyChain();
  if (!chain.ok) {
    throw new Error(
      `canon chain broken at row ${chain.broken_at}: ${chain.reason}`,
    );
  }
  const beforeCount = canon.length();
  const nt = computeNetTrust(canon.all());
  console.log(
    `canon: ${beforeCount} rows, chain verified, NetTrust N = ${nt.N}`,
  );

  // ---------------------------------------------------------------------
  // Step 1: pick the next claim from the rotation.
  // ---------------------------------------------------------------------
  const queue = await loadQueue(QUEUE_PATH);
  if (queue.length === 0) {
    throw new Error("witness-queue is empty — nothing to verify");
  }
  const priorWitnessCount = canon.byType("claim_witness").length;
  const queueIndex = priorWitnessCount % queue.length;
  const entry = queue[queueIndex];
  console.log(
    `witness tick: claim ${entry.id} (queue index ${queueIndex}/${queue.length})`,
  );

  // ---------------------------------------------------------------------
  // Step 2: run conservativity against the substrate file.
  //   Pure function. No API calls. Replay-verifiable forever.
  // ---------------------------------------------------------------------
  const substrateAbsPath = resolve(ROOT, entry.substrate_path);
  const witnessResult = await conservativity({
    text: entry.claim,
    substratePath: substrateAbsPath,
  });
  console.log(
    `conservativity verdict: ${witnessResult.verdict} (${witnessResult.detail})`,
  );

  // ---------------------------------------------------------------------
  // Step 3: append the claim_witness row.
  // ---------------------------------------------------------------------
  const tickStart = new Date().toISOString();
  const witnessRow = await canon.append("claim_witness", {
    claim_id: entry.id,
    claim_text: entry.claim,
    substrate_path: entry.substrate_path,
    witness_primitive: "conservativity",
    verdict: witnessResult.verdict,
    detail: witnessResult.detail,
    queue_index: queueIndex,
    queue_size: queue.length,
    tick_at: tickStart,
  });
  console.log(
    `claim_witness row ${witnessRow.row_index} appended (hash ${witnessRow.row_hash.slice(0, 16)}...)`,
  );

  // ---------------------------------------------------------------------
  // Step 4: append the daemon_heartbeat row (liveness + metadata).
  // ---------------------------------------------------------------------
  const heartbeat = await canon.append("daemon_heartbeat", {
    tick_at: tickStart,
    kernel_version: "v1.0.0-experiment",
    github_run_id: process.env.GITHUB_RUN_ID || null,
    github_repo: process.env.GITHUB_REPOSITORY || null,
    github_actor: process.env.GITHUB_ACTOR || null,
    canon_rows_before: beforeCount,
    nettrust_n: nt.N,
    operators_registered: 0,
    witness_this_tick: {
      claim_id: entry.id,
      verdict: witnessResult.verdict,
      witness_row_hash: witnessRow.row_hash,
    },
  });
  console.log(
    `heartbeat row ${heartbeat.row_index} appended (hash ${heartbeat.row_hash.slice(0, 16)}...)`,
  );

  // ---------------------------------------------------------------------
  // Step 5: persist runtime daemon state for the analyzer.
  // ---------------------------------------------------------------------
  await writeFile(
    PROGRESS_PATH,
    JSON.stringify(
      {
        last_tick_at: tickStart,
        last_run_id: process.env.GITHUB_RUN_ID || null,
        canon_rows_after: canon.length(),
        last_heartbeat_hash: heartbeat.row_hash,
        last_witness: {
          claim_id: entry.id,
          verdict: witnessResult.verdict,
          detail: witnessResult.detail,
          row_hash: witnessRow.row_hash,
        },
        daemon_started_writing_canon_at: "2026-04-24T22:00:00Z",
        daemon_started_witness_loop_at: "2026-04-25T13:00:00Z",
      },
      null,
      2,
    ) + "\n",
  );

  console.log(`canon: ${canon.length()} rows after tick`);
  console.log("daemon tick complete.");
}

main().catch((e) => {
  console.error("daemon fatal:", e);
  process.exit(1);
});
