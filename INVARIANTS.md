# INVARIANTS

Six load-bearing invariants the kernel enforces by code and the maintainer enforces by discipline. Violation of any single one breaks the rigor chain.

**Paper**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656) Appendix C

---

## #1 — The preregistered paper is immutable

**Do not modify the Zenodo record** `10.5281/zenodo.19571657` (v1 of concept `10.5281/zenodo.19571656`). The paper deposit is immutable by Zenodo policy. Any follow-up deposit earns a fresh concept DOI and cites the original as preregistration of record.

Enforcement: Zenodo (immutability on the platform).

## #2 — The preregistration is hash-anchored

Once the preregistration row (commit `H₂`) exists in `canon/rcc-n30-2026-04-14.jsonl`, **do not revise it** without logging a deviation and re-preregistering on a separate OpenTimestamps-anchored row. The whole point of preregistration is that post-hoc edits break the rigor chain.

Enforcement: `src/experiment/run.mjs` refuses to overwrite an existing preregistration row. `src/canon.mjs` verifies the SHA-256 chain on every load.

## #3 — No peeking

**Do not read any Δᵢ** (per-paper Channel-A − Channel-B delta) during the experiment run. The `analysis.mjs` script runs exactly once, on the complete canon row set, after all 30 papers have complete scoring rows. Reading Δᵢ before all are in breaks the independence of the deltas from subsequent scoring.

Enforcement: `src/experiment/analysis.mjs` is a pure function of the full canon; there is no incremental peek API. The maintainer must also avoid `jq` queries against the canon mid-run.

## #4 — The analysis runs exactly once

The `analysis.mjs` script is committed to the repository; its SHA-256 is the Appendix C.2 analysis-script hash. A second run would require a new commit, a new commit hash, a new preregistration row, and disclosure of the duplicate execution.

Enforcement: `src/experiment/run.mjs` appends the `analysis_result` row exactly once per invocation and does not overwrite if one is already present. The script's byte-stability from `H₁` to runtime is preserved by shipping as pure ESM with no build step.

## #5 — Falsification must be reported identically to confirmation

If the executed result falsifies the hypothesis (mean Δᵢ is not significantly different from zero, OR κ_AB does not substantially exceed κ_AC), **report the falsification in the follow-up Zenodo deposit with the same prominence as a confirmation**. No hedging, no selective framing, no reordering of tests. All five statistical outputs (paired t-test, Wilcoxon, sign test, κ_AB, κ_AC) are reported regardless of direction.

Enforcement: `src/experiment/analysis.mjs` returns the `hypothesis_adjudication` field with `all_conditions_met: true|false` and reports the full statistical tuple. The follow-up deposit's mint script writes the result verbatim.

## #6 — No new internet artifact without the three-gate routing

Do not put anything new on the internet with Andrew Salvo's name on it without routing through:

a. **Consistency check** against this repository's `INVARIANTS.md` and the paper's §§ 8, 9, 10, 11.2
b. **Preregistration** if the artifact contains empirical claims
c. **Industry-standard PDF pipeline** (Pandoc + XeLaTeX + preamble matching the v1 paper) if the artifact is a scientific document

This applies to the kernel repo itself, every follow-up Zenodo deposit, every launch asset, every response to reviewers.

Enforcement: discipline. The maintainer runs through the three-gate checklist before any `git push --public`, any `gh repo edit --visibility public`, any `zenodo upload`, any blog post.

---

## Composite-weight byte-match assertion

The preregistered composite-score weights are `(0.34, 0.33, 0.33)` for `(quality, adversarial, feasibility)`. The analysis script enforces a byte-match assertion at entry:

```js
if (COMPOSITE_WEIGHTS.q !== 0.34 || COMPOSITE_WEIGHTS.a !== 0.33 || COMPOSITE_WEIGHTS.f !== 0.33) {
  throw new Error("composite weights tampered");
}
```

A tampered weight aborts the analysis immediately. This is a stronger constraint than the six numbered invariants — it is a code-level tripwire that makes silent weight drift impossible.

---

## Canon chain integrity

Every canon row carries a SHA-256 hash of `{row_index, ts, type, payload, prev_hash}`. `src/canon.mjs` `verifyChain()` walks the chain on every kernel boot; a broken chain aborts the kernel. Editing a row or dropping a row breaks the chain at the edit point and every row after it.
