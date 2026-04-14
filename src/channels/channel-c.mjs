// src/channels/channel-c.mjs
// Channel C: structurally non-transformer AND-composition.
// (Salvo 2026 §12.2 Channel C, §9.2 RCC falsification arm)
//
// An AND-composition of three deterministic checkers, zero LLM involvement:
//   (i) conservativity — token/numeric stability against substrate
//  (ii) ground_truth    — URL resolver / citation numeric match
// (iii) falsification   — BM25-style retrieval over Wikipedia KB
//
// Returns one unified verdict per paper based on AND semantics:
//   PASS    iff all three PASS
//   FAIL    iff any one returns FAIL
//   PENDING otherwise

import { conservativity } from "../witness/conservativity.mjs";
import { groundTruth } from "../witness/ground-truth.mjs";
import { falsification } from "../witness/falsification.mjs";

export async function scoreChannelC(claim, rules = {}) {
  const [c, g, f] = await Promise.all([
    conservativity(claim, rules),
    groundTruth(claim, rules),
    falsification(claim, rules),
  ]);

  const vs = [c.verdict, g.verdict, f.verdict];
  let verdict;
  if (vs.some((v) => v === "FAIL" || v === "REFUTED")) {
    verdict = "FAIL";
  } else if (vs.every((v) => v === "PASS" || v === "VERIFIED")) {
    verdict = "PASS";
  } else {
    verdict = "PENDING";
  }

  return {
    verdict,
    primitives: { conservativity: c, ground_truth: g, falsification: f },
    detail: `AND(${vs.join(", ")}) = ${verdict}`,
  };
}
