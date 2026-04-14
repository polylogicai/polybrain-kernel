// src/witness/cross-substrate.mjs
// Cross-substrate primitive. (Salvo 2026, §7 witness primitive #4)
//
// Agreement across independent provider stacks, measured at the categorical
// verdict level rather than the token level. v1.0.0 expects the caller to
// pre-compute per-channel verdicts (via src/channels/a-scorer.mjs and
// src/channels/b-scorer.mjs, built in Task 10) and pass them in
// claim.channelVerdicts. The primitive itself composes the pre-computed
// verdicts; it does NOT dispatch LLM calls directly.
//
// This separation keeps the witness stack pure: the primitive is a
// function of its inputs, and the expensive multi-provider dispatch
// happens at the channel layer where the experiment's cost accounting
// and rate-limit handling live.

export async function crossSubstrate(claim, rules = {}) {
  const channelVerdicts = claim?.channelVerdicts;

  if (!channelVerdicts) {
    return {
      verdict: "PENDING",
      detail: "no cross-substrate verdicts provided",
    };
  }

  const entries = Object.entries(channelVerdicts);
  if (entries.length < 2) {
    return {
      verdict: "PENDING",
      detail: `insufficient channel verdicts (${entries.length} < 2)`,
    };
  }

  const vs = entries.map(([, v]) => v);

  if (vs.every((v) => v === "PASS" || v === "VERIFIED" || v === "SURVIVED")) {
    return {
      verdict: "PASS",
      detail: `${entries.length} channels unanimously agree (PASS)`,
    };
  }
  if (vs.every((v) => v === "FAIL" || v === "REFUTED")) {
    return {
      verdict: "FAIL",
      detail: `${entries.length} channels unanimously agree (FAIL)`,
    };
  }
  return {
    verdict: "PENDING",
    detail: `channel disagreement: ${entries.map(([k, v]) => `${k}=${v}`).join(", ")}`,
  };
}
