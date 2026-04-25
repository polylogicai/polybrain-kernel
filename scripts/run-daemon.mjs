#!/usr/bin/env node
// scripts/run-daemon.mjs
//
// Daemon entry point invoked from .github/workflows/kernel-daemon.yml every
// 6 hours. Replaces the prior `timeout 600 node src/kernel.mjs` invocation,
// which booted the kernel into an idle loop with operators=0 and produced
// zero canon rows for ten days straight while filling Andy's inbox with
// "[WARNING] canon/default.jsonl not found" alerts every tick.
//
// Until external operators (channels, experiment, witness stack) get wired
// into the daemon, the kernel has no autonomous claim source — there is
// nothing on the work-item queue and the main loop is a no-op. This script
// fills that gap with a deliberate, tiny operator: a per-tick heartbeat that
// appends one row to canon/default.jsonl, asserting the daemon ran and
// what state it observed.
//
// Effect on the substrate:
//   - canon/default.jsonl exists on origin/main after the first successful
//     daemon run (no more "first-run condition" warnings)
//   - Each subsequent tick adds one daemon_heartbeat row, hash-chained
//     correctly so verifyChain() stays green
//   - Scientists has real material to analyze: row count, time gaps, and
//     environment metadata. Anomalies (missed ticks, repeated GH run ids,
//     identical timestamps) become detectable
//   - When Andy later registers real operators (channel scoring, claim
//     ingestion, etc.), they append AFTER the heartbeats, chaining cleanly
//
// This is the minimum cognitive substrate needed for the daemon to be a
// witness of its own existence — §3.1 Level 2 "agent commitments" without
// requiring an external claim source. Replaceable / extensible later.

import { openCanon } from "../src/canon.mjs";
import { computeNetTrust } from "../src/nettrust.mjs";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CANON_PATH = join(ROOT, "canon", "default.jsonl");
const PROGRESS_PATH = join(ROOT, "state", "daemon-progress.json");

async function writeDaemonProgress(payload) {
  await writeFile(PROGRESS_PATH, JSON.stringify(payload, null, 2) + "\n");
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

  const tickStart = new Date().toISOString();
  const heartbeat = await canon.append("daemon_heartbeat", {
    tick_at: tickStart,
    kernel_version: "v1.0.0-experiment",
    github_run_id: process.env.GITHUB_RUN_ID || null,
    github_repo: process.env.GITHUB_REPOSITORY || null,
    github_actor: process.env.GITHUB_ACTOR || null,
    canon_rows_before: beforeCount,
    nettrust_n: nt.N,
    operators_registered: 0,
    note:
      "Daemon heartbeat. Until external operators are wired in, this is the only autonomous canon emitter.",
  });
  console.log(
    `heartbeat row ${heartbeat.row_index} appended (hash ${heartbeat.row_hash.slice(0, 16)}...)`,
  );

  // Persist a separate daemon-progress.json so the analyzer can distinguish
  // runtime daemon state from the v1.0.0 release tracker at state/progress.json.
  await writeDaemonProgress({
    last_tick_at: tickStart,
    last_run_id: process.env.GITHUB_RUN_ID || null,
    canon_rows_after: canon.length(),
    last_heartbeat_hash: heartbeat.row_hash,
    daemon_started_writing_canon_at: "2026-04-24T22:00:00Z",
  });

  console.log(`canon: ${canon.length()} rows after tick`);
  console.log("daemon tick complete.");
}

main().catch((e) => {
  console.error("daemon fatal:", e);
  process.exit(1);
});
