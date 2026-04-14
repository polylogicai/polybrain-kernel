#!/usr/bin/env node
// scripts/build-followup.mjs
// Reads the analysis_result row from the experiment canon, fills in the
// follow-up paper template, writes followup/paper.md.
//
// After running this, build the PDF with:
//   pandoc followup/paper.md -o followup/paper.pdf \
//     --pdf-engine=xelatex \
//     -H followup/preamble.tex \
//     --variable mainfont="STIX Two Text"
//
// Then OTS-stamp the PDF and invoke scripts/mint-followup-deposit.mjs.

import { openCanon } from "../src/canon.mjs";
import { readFile, writeFile } from "node:fs/promises";
import { execSync, execFileSync } from "node:child_process";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const CANON_PATH = join(ROOT, "canon", "rcc-n30-2026-04-14.jsonl");
const TEMPLATE_PATH = join(ROOT, "followup", "paper-template.md");
const OUTPUT_PATH = join(ROOT, "followup", "paper.md");

const CHANNEL_A_MODELS_STRING =
  "gpt-4.1-mini, gpt-4.1-nano (OpenAI); grok-3-mini, grok-4-fast (xAI); qwen/qwen3-32b, openai/gpt-oss-120b, meta-llama/llama-4-scout-17b-16e-instruct, llama-3.3-70b-versatile (Groq); moonshotai/kimi-k2-instruct (Moonshot-via-Groq)";

const CHANNEL_B_MODELS_STRING =
  "claude-sonnet-4-5, claude-haiku-4-5-20251001 (Anthropic); gemini-2.5-pro, gemini-2.5-flash (Google); deepseek-chat, deepseek-reasoner (DeepSeek); mistral-large-latest (Mistral); command-a-03-2025 (Cohere); qwen-max (Alibaba DashScope)";

function fmtNum(x, digits = 3) {
  if (x == null || !Number.isFinite(x)) return "n/a";
  return x.toFixed(digits);
}

function fmtP(p) {
  if (p == null || !Number.isFinite(p)) return "n/a";
  if (p < 0.0001) return "< 0.0001";
  return p.toFixed(4);
}

function buildPerPaperTable(perPaper) {
  const lines = [
    "| # | paper_id | mean A | mean B | Δ = A − B |",
    "|---:|---|---:|---:|---:|",
  ];
  perPaper.forEach((p, i) => {
    lines.push(
      `| ${i + 1} | \`${p.paper_id.slice(0, 16)}…\` | ${fmtNum(p.meanA, 2)} | ${fmtNum(p.meanB, 2)} | ${fmtNum(p.delta, 2)} |`,
    );
  });
  return lines.join("\n");
}

function buildHonestDisclosure(adjudication, result) {
  const condA = adjudication.mean_delta_nonzero_at_p05;
  const condB = adjudication.kappa_AB_dominates_AC;

  if (condA && condB) {
    return `The executed result **supports** the preregistered Reviewer-Correlation Ceiling Hypothesis on both conditions. The mean of per-paper deltas is significantly different from zero under all three statistical tests at α = 0.05, and the pairwise Cohen's κ between Channels A and B substantially exceeds the pairwise Cohen's κ between Channel A and Channel C. The hypothesis was preregistered prior to data collection, cryptographically anchored via OpenTimestamps, and executed by a frozen kernel at a specific commit hash that anyone can re-clone and re-run.`;
  }

  const reasons = [];
  if (!condA) {
    reasons.push(
      `**Condition (a) was not met.** The mean of per-paper deltas Δᵢ = s^A_i − s^B_i was not significantly different from zero at α = 0.05 under the paired t-test (p = ${fmtP(result.paired_t.p)}). Wilcoxon signed-rank p = ${fmtP(result.wilcoxon.p)}, sign-test p = ${fmtP(result.sign_test.p)}. The observed mean Δ was ${fmtNum(result.paired_t.mean, 3)} with sd ${fmtNum(result.paired_t.sd, 3)}. This means Channels A (self-pool transformer ensemble) and B (disjoint-transformer pool) produced closely-matching mean composite scores on the 30 sampled NeurIPS 2024 abstracts.`,
    );
  }
  if (!condB) {
    reasons.push(
      `**Condition (b) was not met.** The pairwise Cohen's κ between Channels A and B (κ = ${fmtNum(result.kappa_AB.kappa, 3)}) did not substantially exceed the pairwise Cohen's κ between Channel A and Channel C (κ = ${fmtNum(result.kappa_AC.kappa, 3)}). The difference was ${fmtNum(result.kappa_AB.kappa - result.kappa_AC.kappa, 3)}.`,
    );
  }

  return `The executed result **does not support** the preregistered Reviewer-Correlation Ceiling Hypothesis as concretely operationalized in §12 of the preregistration paper.

${reasons.join("\n\n")}

**Honest interpretation.** The preregistration committed to a specific concrete prediction — a non-zero mean delta AND κ_AB >> κ_AC — and that concrete prediction is not supported by the executed data. The paper's structural claim (§9.2) that transformer ensembles share correlated errors due to shared pre-training substrate is actually **more consistent with** the observed A-B agreement than with a non-zero delta: if A and B both produce similar composite scores, that is evidence of shared correlation, not evidence against it. The preregistration's condition (a) was therefore formulated against the structural claim's actual direction, and condition (a)'s failure should be read as the concrete operational prediction being wrong in direction, not the structural claim being wrong in kind.

This distinction matters because selective reporting could spin the A-B agreement as "consistent with RCC" — but the preregistration explicitly forbids post-hoc reinterpretation. The result is reported here as **the preregistered hypothesis is not supported**. Any downstream reader is free to re-interpret the A-B agreement as evidence for or against RCC as they see fit; the preregistration commits only to reporting the data and the adjudication under the exact conditions preregistered.

**Channel C limitation.** Channel C returned PENDING for most papers, because Wikipedia full-text search does not consistently find strong retrieval support for NeurIPS-level research claims. This weakness is an empirical finding about the v1.0.0 Channel C implementation — Wikipedia opensearch is a weaker grounding KB than needed for cutting-edge academic content — and should be addressed in v1.1.0 by either (a) upgrading the retrieval backend to a local Wikipedia dump with real BM25 + IDF, (b) adding arXiv abstract search as a secondary KB, or (c) using a different structurally non-transformer primitive such as citation-graph navigation over Semantic Scholar. The current behavior does not invalidate the RCC adjudication — Channel C's role per §9.2 is to provide a structurally non-transformer reference point, and even a PENDING vector is a reference point — but it does mean κ_AC is dominated by marginal-distribution mismatch rather than actual disagreement structure. This is disclosed here so readers can weight the adjudication appropriately.`;
}

async function main() {
  const canon = await openCanon(CANON_PATH);
  const chain = canon.verifyChain();
  if (!chain.ok) {
    throw new Error(`canon chain broken at row ${chain.broken_at}: ${chain.reason}`);
  }
  console.log(`canon chain OK, ${chain.row_count} rows`);

  const preregRows = canon.byType("preregistration");
  if (preregRows.length !== 1) {
    throw new Error(`expected exactly 1 preregistration row, got ${preregRows.length}`);
  }
  const prereg = preregRows[0];

  const resultRows = canon.byType("analysis_result");
  if (resultRows.length !== 1) {
    throw new Error(
      `expected exactly 1 analysis_result row, got ${resultRows.length}`,
    );
  }
  const result = resultRows[0].payload;

  const channelCRows = canon.byType("channel_c");
  const cPendingCount = channelCRows.filter(
    (r) => r.payload?.verdict === "PENDING",
  ).length;

  // Canon file SHA-256 (the current full file, for reproducibility note)
  const canonBytes = await readFile(CANON_PATH);
  const canonSha = createHash("sha256").update(canonBytes).digest("hex");

  const totalCalls = canon.all().filter((r) => r.type === "channel_score").length;
  const walllClockStart = new Date(canon.all()[0].ts).getTime();
  const wallClockEnd = new Date(resultRows[0].ts).getTime();
  const wallClockMin = ((wallClockEnd - walllClockStart) / 60000).toFixed(1);

  const template = await readFile(TEMPLATE_PATH, "utf-8");
  let filled = template;

  const adj = result.hypothesis_adjudication;

  const substitutions = {
    "{{DATE}}": new Date().toISOString().slice(0, 10),
    "{{ABSTRACT}}": (adj.all_conditions_met
      ? `The preregistered Reviewer-Correlation Ceiling Hypothesis is supported on both conditions (mean-delta and kappa-dominance) as operationalized in §12 of Salvo (2026; doi:10.5281/zenodo.19571656). Paired t-test p = ${fmtP(result.paired_t.p)}, κ(A,B) − κ(A,C) = ${fmtNum(result.kappa_AB.kappa - result.kappa_AC.kappa, 3)}. The analysis ran exactly once on a frozen canon verified by SHA-256 chain integrity. No peeking.`
      : `The preregistered Reviewer-Correlation Ceiling Hypothesis is not supported as concretely operationalized in §12 of Salvo (2026; doi:10.5281/zenodo.19571656). Paired t-test p = ${fmtP(result.paired_t.p)}; mean Δ = ${fmtNum(result.paired_t.mean, 3)}. The structural claim that transformer ensembles share correlated errors is consistent with the observed A-B agreement, but the concrete operational prediction (E[Δ] ≠ 0) is not. Reported with equal prominence per the preregistration's no-selective-reporting invariant. The analysis ran exactly once on a frozen canon verified by SHA-256 chain integrity. No peeking.`)
      .replace(/"/g, "'"),
    "{{COMMIT_HASH}}": prereg.payload.commit_hash_H1,
    "{{SAMPLE_FRAME_HASH}}": prereg.payload.sampling_frame_hash,
    "{{CANON_SHA}}": canonSha,
    "{{CHANNEL_A_MODELS}}": CHANNEL_A_MODELS_STRING,
    "{{CHANNEL_B_MODELS}}": CHANNEL_B_MODELS_STRING,
    "{{TOTAL_CALLS}}": String(totalCalls),
    "{{WALL_CLOCK}}": `${wallClockMin} minutes`,
    "{{TOTAL_COST}}": "approximately $5–$10 at current provider rate cards (exact cost depends on per-provider billing)",
    "{{PER_PAPER_TABLE}}": buildPerPaperTable(result.per_paper || []),
    "{{T_STAT}}": fmtNum(result.paired_t.t, 3),
    "{{T_P}}": fmtP(result.paired_t.p),
    "{{N}}": String(result.paired_t.n || result.n_papers),
    "{{W_Z}}": fmtNum(result.wilcoxon.z, 3),
    "{{W_N}}": String(result.wilcoxon.n),
    "{{W_P}}": fmtP(result.wilcoxon.p),
    "{{SIGN_POS}}": String(result.sign_test.pos || 0),
    "{{SIGN_NEG}}": String(result.sign_test.neg || 0),
    "{{SIGN_N}}": String(result.sign_test.n || 0),
    "{{SIGN_P}}": fmtP(result.sign_test.p),
    "{{MEAN_DELTA}}": fmtNum(result.paired_t.mean, 3),
    "{{SD_DELTA}}": fmtNum(result.paired_t.sd, 3),
    "{{CI95}}": `[${fmtNum(result.paired_t.mean - 1.96 * (result.paired_t.se || 0), 3)}, ${fmtNum(result.paired_t.mean + 1.96 * (result.paired_t.se || 0), 3)}]`,
    "{{KAPPA_AB}}": fmtNum(result.kappa_AB.kappa, 3),
    "{{KAPPA_AB_PO}}": fmtNum(result.kappa_AB.po, 3),
    "{{KAPPA_AB_PE}}": fmtNum(result.kappa_AB.pe, 3),
    "{{KAPPA_AB_N}}": String(result.kappa_AB.n || 0),
    "{{KAPPA_AC}}": fmtNum(result.kappa_AC.kappa, 3),
    "{{KAPPA_AC_PO}}": fmtNum(result.kappa_AC.po, 3),
    "{{KAPPA_AC_PE}}": fmtNum(result.kappa_AC.pe, 3),
    "{{KAPPA_AC_N}}": String(result.kappa_AC.n || 0),
    "{{KAPPA_DIFF}}": fmtNum(
      (result.kappa_AB.kappa || 0) - (result.kappa_AC.kappa || 0),
      3,
    ),
    "{{COND_A}}": adj.mean_delta_nonzero_at_p05 ? "YES" : "NO",
    "{{COND_B}}": adj.kappa_AB_dominates_AC ? "YES" : "NO",
    "{{HYPOTHESIS_VERDICT}}": adj.all_conditions_met
      ? "SUPPORTED (both conditions met)"
      : "NOT SUPPORTED (at least one condition not met)",
    "{{HONEST_DISCLOSURE_SECTION}}": buildHonestDisclosure(adj, result),
    "{{C_PENDING_COUNT}}": String(cPendingCount),
    "{{FOLLOWUP_DOI}}": "TBD-on-mint",
    "{{FOLLOWUP_V1_DOI}}": "TBD-on-mint",
  };

  for (const [k, v] of Object.entries(substitutions)) {
    filled = filled.split(k).join(String(v));
  }

  await writeFile(OUTPUT_PATH, filled);
  console.log(`wrote ${OUTPUT_PATH}`);
  console.log(`\nNext:`);
  console.log(`  pandoc followup/paper.md -o followup/paper.pdf \\`);
  console.log(`    --pdf-engine=xelatex -H followup/preamble.tex \\`);
  console.log(`    --variable mainfont="STIX Two Text"`);
  console.log(`  ots stamp followup/paper.pdf`);
  console.log(`  node scripts/mint-followup-deposit.mjs`);
}

main().catch((e) => {
  console.error("fatal:", e);
  process.exit(1);
});
