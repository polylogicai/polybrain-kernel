// src/witness/index.mjs
// The 4-primitive AND-composer producing 5-label verdicts.
// (Salvo 2026, §7)
//
// Witness stack:
//   1. conservativity   — token/numeric stability against substrate (deterministic, no LLM)
//   2. ground_truth     — URL resolution, file existence, citation check, KB lookup
//   3. falsification    — counter-example construction via non-transformer checker (§9.2 RCC arm)
//   4. cross_substrate  — agreement across independent provider stacks
//
// Composer emits one of five public verdicts:
//   VERIFIED   — all primitives PASS on first pass
//   SURVIVED   — VERIFIED + held up on at least one re-verification cycle
//   PENDING    — at least one primitive PENDING or substrate not yet extracted
//   CHALLENGED — coherence web detected reinforce/contradict conflict (§9)
//   REFUTED    — at least one primitive returned FAIL
//
// Crucially the composer is NOT LLM-based. LLM output is treated as
// telemetry and must never gate a publication, primitive input, or
// ranker score (§7, §9.2).

import { conservativity } from "./conservativity.mjs";
import { groundTruth } from "./ground-truth.mjs";
import { falsification } from "./falsification.mjs";
import { crossSubstrate } from "./cross-substrate.mjs";

export const PRIMITIVES = {
  conservativity,
  ground_truth: groundTruth,
  falsification,
  cross_substrate: crossSubstrate,
};

export async function runWitnessStack(claim, rules = {}) {
  const results = {};
  for (const [name, fn] of Object.entries(PRIMITIVES)) {
    try {
      results[name] = await fn(claim, rules);
    } catch (e) {
      results[name] = {
        verdict: "PENDING",
        detail: `primitive error: ${e?.message || e}`,
      };
    }
  }
  return results;
}

export function composeVerdict(primitiveResults, context = {}) {
  const { isReverification = false, hasContradict = false } = context;

  if (hasContradict) return "CHALLENGED";

  const verdicts = Object.values(primitiveResults).map((r) => r?.verdict ?? r);

  if (verdicts.some((v) => v === "FAIL" || v === "REFUTED")) return "REFUTED";
  if (verdicts.some((v) => v === "PENDING")) return "PENDING";
  if (
    verdicts.every(
      (v) => v === "PASS" || v === "VERIFIED" || v === "SURVIVED",
    )
  ) {
    return isReverification ? "SURVIVED" : "VERIFIED";
  }
  return "PENDING";
}

export async function verifyClaim(claim, rules = {}, context = {}) {
  const primitives = await runWitnessStack(claim, rules);
  const verdict = composeVerdict(primitives, context);
  return { verdict, primitives };
}
