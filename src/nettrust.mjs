// src/nettrust.mjs
// NetTrust scalar: N = 3h + c − 2w − u − 0.1s
// (Salvo 2026, §5)
//
//   h = SURVIVED (held up under re-verification)
//   c = VERIFIED (passed on first check)
//   w = REFUTED  (wrong)
//   u = CHALLENGED (uncertain or contradicted by coherence web)
//   s = PENDING (beyond N_cycles threshold)
//
// The kernel's primary objective function is dN/dt, not N itself
// (§5, penalizes hoarding trivially-verifiable claims).
// A future version replaces the (3, 1, -2, -1, -0.1) coefficients
// with a calibrated proper scoring rule (§5 Future work).

export function computeNetTrust(rows) {
  const counts = {
    VERIFIED: 0,
    SURVIVED: 0,
    PENDING: 0,
    CHALLENGED: 0,
    REFUTED: 0,
  };
  for (const r of rows) {
    if (r.type !== "verdict") continue;
    const v = r.payload?.verdict;
    if (v && v in counts) counts[v]++;
  }
  const N =
    3 * counts.SURVIVED +
    counts.VERIFIED -
    2 * counts.REFUTED -
    counts.CHALLENGED -
    0.1 * counts.PENDING;
  return { N, counts };
}
