#!/usr/bin/env node
// src/experiment/run.mjs
// The RCC-n30 experiment orchestrator. Runs the §12.3 protocol end-to-end.
//
// This script is the single entry point for the preregistered experiment.
// It writes to canon/rcc-n30-2026-04-14.jsonl (isolated from the default
// canon) and updates state/progress.json on every paper.
//
// Sequence:
//   0. Load Channel A/B keys from ~/polybrain/.env and ~/orchestrator/.env
//   1. Load rules, open experiment canon, verify chain integrity
//   2. Resolve commit H1 via `git rev-parse HEAD`
//   3. Fetch NeurIPS 2024 listing via OpenReview API (cached locally)
//   4. Compute sampling-frame hash C.3
//   5. Append preregistration row (if not already present) — this is H2
//   6. Sample 30 stratified papers deterministically from H1
//   7. For each paper in the sample:
//        A + B scoring (2 replays each) in the preregistered order
//        Channel C (AND-composition of conservativity + groundTruth + falsification)
//        Append channel_score, channel_verdict, channel_c rows
//        Update progress.json
//   8. After all 30 done, run analysis.mjs EXACTLY ONCE
//   9. Append analysis_result row
//  10. Exit cleanly (the kernel remains running, the canon remains owned).

import { loadRules } from "../rules.mjs";
import { openCanon } from "../canon.mjs";
import { loadEnv } from "../channels/providers.mjs";
import { scoreChannelA, scoreChannelB } from "../channels/transformer.mjs";
import { scoreChannelC } from "../channels/channel-c.mjs";
import {
  fetchNeurips2024Listing,
  sampleStratified,
  sampleFrameHash,
} from "./sampler.mjs";
import { deriveOrderBit } from "./seed.mjs";
import { analyze } from "./analysis.mjs";
import { execSync } from "node:child_process";
import { writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..", "..");
const CANON_PATH = join(ROOT, "canon", "rcc-n30-2026-04-14.jsonl");
const PROGRESS_PATH = join(ROOT, "state", "progress.json");
const RULES_DIR = join(ROOT, "rules");

const EXPERIMENT_ID = "rcc-n30-2026-04-14";
const PAPER_DOI = "10.5281/zenodo.19571656";
const PAPER_HASH =
  "7ac4e12fd0655445917eec391f6eb1e10cdb3cf9c195839aec6c833fb9be7eea";
const HYPOTHESIS =
  "We predict (a) that the mean of per-paper deltas Δᵢ = s^A_i − s^B_i is significantly different from zero at α = 0.05 under a two-sided paired t-test with n = 30; and (b) that the pairwise Cohen's kappa between Channels A and B substantially exceeds the pairwise Cohen's kappa between Channel A and Channel C, consistent with the Reviewer-Correlation Ceiling Hypothesis.";
const STOPPING_RULE =
  "We commit to run exactly thirty papers, no early stopping, no peeking at any Δᵢ before all thirty are complete. The analysis script is executed exactly once, on the full thirty-paper canon row set, after all scoring rows have been appended. No re-runs with alternative composite weights or alternative analysis methods are permitted under this preregistration.";

async function writeProgress(complete, label) {
  await writeFile(
    PROGRESS_PATH,
    JSON.stringify(
      {
        complete,
        stage: "experiment",
        label,
        updated_at: new Date().toISOString(),
      },
      null,
      2,
    ) + "\n",
  );
}

async function ensurePreregistration(canon, commitHash, frameHash) {
  const existing = canon.byType("preregistration");
  if (existing.length > 0) {
    console.log("preregistration row present:", existing[0].row_hash.slice(0, 16));
    return existing[0];
  }
  const row = await canon.append("preregistration", {
    experiment_id: EXPERIMENT_ID,
    paper_doi: PAPER_DOI,
    paper_hash: PAPER_HASH,
    sampling_frame_hash: frameHash,
    composite_weights: { q: 0.34, a: 0.33, f: 0.33 },
    hypothesis: HYPOTHESIS,
    stopping_rule: STOPPING_RULE,
    commit_hash_H1: commitHash,
    authors: ["Andrew Salvo"],
    affiliation: "Smeal College of Business, Penn State University",
  });
  console.log("preregistration row written:", row.row_hash.slice(0, 16));
  return row;
}

async function scoreOnChannel(claim, channel) {
  if (channel === "A") return scoreChannelA(claim);
  if (channel === "B") return scoreChannelB(claim);
  throw new Error("unknown channel " + channel);
}

export async function run() {
  console.log("RCC-n30 experiment starting...");
  await loadEnv();

  const rules = await loadRules(RULES_DIR);
  const canon = await openCanon(CANON_PATH);
  const chain = canon.verifyChain();
  if (!chain.ok) {
    throw new Error(`canon chain broken at row ${chain.broken_at}`);
  }
  console.log(`canon: ${chain.row_count} rows, chain verified`);

  const commitHash = execSync("git rev-parse HEAD", { cwd: ROOT })
    .toString()
    .trim();
  console.log(`commit H1: ${commitHash}`);

  await writeProgress(0.68, "fetching NeurIPS 2024 listing");
  const snapshot = await fetchNeurips2024Listing();
  const frameHash = sampleFrameHash(snapshot);
  console.log(
    `neurips 2024: ${snapshot.papers.length} papers, frame hash ${frameHash.slice(0, 16)}`,
  );

  await ensurePreregistration(canon, commitHash, frameHash);

  await writeProgress(0.69, "sampling 30 stratified papers");
  const sample = await sampleStratified(snapshot, commitHash, 10);
  console.log(`sampled ${sample.length} papers`);

  const tasks = sample.map((paper) => ({
    paper,
    order: deriveOrderBit(commitHash, paper.id),
  }));

  for (let i = 0; i < tasks.length; i++) {
    const { paper, order } = tasks[i];
    const claim = {
      text: paper.abstract,
      substrateText: paper.abstract,
      paper_id: paper.id,
    };
    const progressFrac = 0.7 + (0.25 * i) / tasks.length;
    const shortTitle = (paper.title || "").slice(0, 60);
    await writeProgress(
      progressFrac,
      `paper ${i + 1}/${tasks.length}: ${shortTitle}`,
    );
    console.log(
      `\n[${i + 1}/${tasks.length}] ${paper.id} — ${shortTitle}`,
    );

    for (let replay = 0; replay < 2; replay++) {
      const channelsOrder = order === 0 ? ["A", "B"] : ["B", "A"];
      for (const ch of channelsOrder) {
        const t0 = Date.now();
        const result = await scoreOnChannel(claim, ch);
        const elapsed = Date.now() - t0;
        await canon.append("channel_score", {
          experiment_id: EXPERIMENT_ID,
          paper_id: paper.id,
          channel: ch,
          replay,
          composite: result.composite,
          valid_count: result.valid_count,
          total_count: result.total_count,
          per_model: result.per_model,
          elapsed_ms: elapsed,
        });
        const claimVerdict =
          result.composite != null && result.composite >= 50 ? "PASS" : "FAIL";
        await canon.append("channel_verdict", {
          experiment_id: EXPERIMENT_ID,
          claim_id: paper.id,
          channel: ch,
          replay,
          verdict: claimVerdict,
        });
        console.log(
          `  ${ch} replay${replay}: composite ${result.composite?.toFixed(1) ?? "null"} (${result.valid_count}/${result.total_count}) ${elapsed}ms`,
        );
      }
    }

    const cResult = await scoreChannelC(claim, rules);
    await canon.append("channel_c", {
      experiment_id: EXPERIMENT_ID,
      paper_id: paper.id,
      verdict: cResult.verdict,
      primitives: cResult.primitives,
    });
    await canon.append("channel_verdict", {
      experiment_id: EXPERIMENT_ID,
      claim_id: paper.id,
      channel: "C",
      verdict: cResult.verdict,
    });
    console.log(`  C: ${cResult.verdict}`);
  }

  await writeProgress(0.97, "running analysis exactly once");
  console.log("\nrunning analysis.mjs EXACTLY ONCE...");
  const allRows = canon.all();
  const result = analyze(allRows);
  await canon.append("analysis_result", result);
  console.log("analysis result row appended");

  await writeProgress(0.99, "analysis complete");
  console.log("\n=== MEAN Δ_AB ===");
  console.log(
    `  mean: ${result.paired_t.mean.toFixed(3)}, sd: ${result.paired_t.sd.toFixed(3)}, n: ${result.paired_t.n}`,
  );
  console.log(
    `  paired t-test p: ${result.paired_t.p.toFixed(4)}, Wilcoxon p: ${result.wilcoxon.p.toFixed(4)}, sign p: ${result.sign_test.p.toFixed(4)}`,
  );
  console.log(`  κ_AB: ${result.kappa_AB.kappa?.toFixed(3) ?? "n/a"}`);
  console.log(`  κ_AC: ${result.kappa_AC.kappa?.toFixed(3) ?? "n/a"}`);
  console.log("\n=== HYPOTHESIS ADJUDICATION ===");
  console.log(JSON.stringify(result.hypothesis_adjudication, null, 2));
  console.log("\nRCC-n30 execution complete. Follow-up deposit mint next.");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  run().catch((e) => {
    console.error("run fatal:", e);
    process.exit(1);
  });
}
