// src/experiment/analysis.mjs
// PURE FUNCTION ANALYSIS SCRIPT. (Salvo 2026 Appendix C.2, C.7)
//
// This script's SHA-256 is committed to the canon as the analysis-script
// hash field C.2. The analysis runs EXACTLY ONCE on the complete canon
// row set after all 30 papers have scoring rows. It is pure: its only
// input is the canon rows, its only output is the result row.
//
// MUST NOT read env vars, config files, or network.
// MUST NOT branch on data values.
// MUST NOT be run more than once per preregistration.
//
// Analysis methods (Appendix C.7): paired t-test, Wilcoxon signed-rank,
// sign test, Cohen's κ_AB, Cohen's κ_AC. All reported regardless of
// direction — this forestalls post-hoc method selection.

import { COMPOSITE_WEIGHTS } from "../channels/rubric.mjs";

function mean(xs) {
  return xs.reduce((s, x) => s + x, 0) / xs.length;
}
function variance(xs) {
  const m = mean(xs);
  return xs.reduce((s, x) => s + (x - m) ** 2, 0) / (xs.length - 1);
}

function erf(x) {
  const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741;
  const a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  x = Math.abs(x);
  const t = 1 / (1 + p * x);
  const y =
    1 -
    ((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return sign * y;
}
function normalCdf(x) {
  return 0.5 * (1 + erf(x / Math.sqrt(2)));
}
function twoSidedP(z) {
  return 2 * (1 - normalCdf(Math.abs(z)));
}

function pairedTTest(deltas) {
  const n = deltas.length;
  if (n < 2) return { n, mean: 0, sd: 0, t: 0, p: 1, df: Math.max(0, n - 1) };
  const m = mean(deltas);
  const sd = Math.sqrt(variance(deltas));
  const se = sd / Math.sqrt(n);
  const t = se === 0 ? 0 : m / se;
  const df = n - 1;
  // Normal approximation OK for n >= 30.
  const p = twoSidedP(t);
  return { n, mean: m, sd, se, t, p, df };
}

function wilcoxonSignedRank(deltas) {
  const nonzero = deltas.filter((d) => d !== 0);
  const n = nonzero.length;
  if (n === 0) return { n, W: 0, p: 1, z: 0 };
  const abs = nonzero.map((d) => ({ d, abs: Math.abs(d) }));
  abs.sort((a, b) => a.abs - b.abs);
  let i = 0;
  while (i < abs.length) {
    let j = i;
    while (j < abs.length && abs[j].abs === abs[i].abs) j++;
    const avgRank = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) abs[k].rank = avgRank;
    i = j;
  }
  let Wplus = 0, Wminus = 0;
  for (const x of abs) {
    if (x.d > 0) Wplus += x.rank;
    else Wminus += x.rank;
  }
  const W = Math.min(Wplus, Wminus);
  const meanW = (n * (n + 1)) / 4;
  const sdW = Math.sqrt((n * (n + 1) * (2 * n + 1)) / 24);
  const z = sdW === 0 ? 0 : (W - meanW) / sdW;
  return { n, W, z, p: twoSidedP(z) };
}

function signTest(deltas) {
  const pos = deltas.filter((d) => d > 0).length;
  const neg = deltas.filter((d) => d < 0).length;
  const n = pos + neg;
  if (n === 0) return { n, p: 1, pos, neg };
  const k = Math.min(pos, neg);
  let c = 1;
  let sum = Math.pow(0.5, n);
  for (let i = 1; i <= k; i++) {
    c = (c * (n - i + 1)) / i;
    sum += c * Math.pow(0.5, n);
  }
  return { n, pos, neg, p: Math.min(1, 2 * sum) };
}

function cohenKappa(xs, ys, categories = ["PASS", "FAIL", "PENDING"]) {
  if (xs.length !== ys.length) {
    throw new Error("cohenKappa: vector lengths differ");
  }
  const n = xs.length;
  if (n === 0) return { kappa: NaN, n, po: NaN, pe: NaN };
  let agree = 0;
  for (let i = 0; i < n; i++) if (xs[i] === ys[i]) agree++;
  const po = agree / n;
  const mX = Object.fromEntries(categories.map((c) => [c, 0]));
  const mY = Object.fromEntries(categories.map((c) => [c, 0]));
  for (const v of xs) if (v in mX) mX[v]++;
  for (const v of ys) if (v in mY) mY[v]++;
  let pe = 0;
  for (const c of categories) pe += (mX[c] / n) * (mY[c] / n);
  if (pe === 1) return { kappa: 1, n, po, pe };
  return { kappa: (po - pe) / (1 - pe), n, po, pe };
}

function assertWeights() {
  if (
    COMPOSITE_WEIGHTS.q !== 0.34 ||
    COMPOSITE_WEIGHTS.a !== 0.33 ||
    COMPOSITE_WEIGHTS.f !== 0.33
  ) {
    throw new Error(
      `composite weights tampered: got (${COMPOSITE_WEIGHTS.q}, ${COMPOSITE_WEIGHTS.a}, ${COMPOSITE_WEIGHTS.f})`,
    );
  }
}

export function analyze(rows) {
  assertWeights();

  const scoresByPaper = new Map();
  for (const r of rows) {
    if (r.type !== "channel_score") continue;
    const { channel, paper_id, composite } = r.payload || {};
    if (!paper_id || !channel || composite == null) continue;
    if (!scoresByPaper.has(paper_id)) {
      scoresByPaper.set(paper_id, { A: [], B: [] });
    }
    const entry = scoresByPaper.get(paper_id);
    if (channel === "A" || channel === "B") entry[channel].push(composite);
  }

  const paperResults = [];
  const deltas = [];
  for (const [paper_id, channels] of scoresByPaper.entries()) {
    if (channels.A.length === 0 || channels.B.length === 0) continue;
    const meanA = mean(channels.A);
    const meanB = mean(channels.B);
    deltas.push(meanA - meanB);
    paperResults.push({ paper_id, meanA, meanB, delta: meanA - meanB });
  }

  const tResult = pairedTTest(deltas);
  const wResult = wilcoxonSignedRank(deltas);
  const sResult = signTest(deltas);

  const verdictsByChannel = { A: new Map(), B: new Map(), C: new Map() };
  for (const r of rows) {
    if (r.type !== "channel_verdict") continue;
    const { channel, claim_id, verdict } = r.payload || {};
    if (!claim_id || !channel) continue;
    if (verdictsByChannel[channel]) {
      verdictsByChannel[channel].set(claim_id, verdict);
    }
  }
  function align(m1, m2) {
    const xs = [];
    const ys = [];
    for (const [k, v] of m1.entries()) {
      if (m2.has(k)) {
        xs.push(v);
        ys.push(m2.get(k));
      }
    }
    return { xs, ys };
  }
  const AB = align(verdictsByChannel.A, verdictsByChannel.B);
  const AC = align(verdictsByChannel.A, verdictsByChannel.C);
  const kappaAB = cohenKappa(AB.xs, AB.ys);
  const kappaAC = cohenKappa(AC.xs, AC.ys);

  const adjudication = {
    mean_delta_nonzero_at_p05:
      tResult.p < 0.05 && wResult.p < 0.05 && sResult.p < 0.05,
    kappa_AB_dominates_AC:
      Number.isFinite(kappaAB.kappa) &&
      Number.isFinite(kappaAC.kappa) &&
      kappaAB.kappa - kappaAC.kappa > 0.1,
  };
  adjudication.all_conditions_met =
    adjudication.mean_delta_nonzero_at_p05 &&
    adjudication.kappa_AB_dominates_AC;

  return {
    weights: COMPOSITE_WEIGHTS,
    n_papers: paperResults.length,
    per_paper: paperResults,
    paired_t: tResult,
    wilcoxon: wResult,
    sign_test: sResult,
    kappa_AB: kappaAB,
    kappa_AC: kappaAC,
    hypothesis_adjudication: adjudication,
  };
}
