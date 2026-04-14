---
title: "Executed Result for the Reviewer-Correlation Ceiling n=30 Preregistered Protocol"
subtitle: "Follow-up to Salvo 2026 (doi:10.5281/zenodo.19571656)"
author: "Andrew Salvo"
date: "{{DATE}}"
keywords: [RCC hypothesis, preregistration, NeurIPS 2024, Cohen kappa, reviewer ensembles, polybrain-kernel]
abstract: "{{ABSTRACT}}"
lang: en
papersize: letter
fontsize: 11pt
geometry: margin=1in
numbersections: true
toc: false
linkcolor: "[HTML]{1E3A5F}"
urlcolor: "[HTML]{1E3A5F}"
citecolor: "[HTML]{1E3A5F}"
titlepage: true
titlepage-color: "FFFFFF"
titlepage-text-color: "1E3A5F"
titlepage-rule-color: "F5A623"
titlepage-rule-height: 2
caption-justification: centering
header-includes:
  - \usepackage{microtype}
  - \usepackage{mathtools}
---

# Executed Result for the Reviewer-Correlation Ceiling n=30 Preregistered Protocol

### Follow-up to Salvo 2026 (doi:10.5281/zenodo.19571656)

**Andrew Salvo**
Smeal College of Business, Penn State University
University Park, PA, USA
`ajs10845@psu.edu`

**{{DATE}}** · CC BY 4.0

---

## 1. What this document is

This is the executed-result follow-up deposit for the preregistered matched-paper protocol described in §12 and Appendix C of the paper *Engine, Rules, and Canon: An Architecture for User-Owned, Continuously Iterating AI Agents* (Salvo, 2026; doi:10.5281/zenodo.19571656). The preregistration committed to this protocol cryptographically at the moment the original paper was deposited on Zenodo; the `polybrain-kernel` reference implementation executed it as a native act of its own being.

**Preregistration of record**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656).
**Preregistration row Bitcoin anchor**: `ots/preregistration-H2.jsonl.ots` in the kernel repository, SHA-256 `6cdd64f5817041557f3ea27ca84d43da832812e42746b4abc8c1cedb52a343fb`.
**Frozen kernel**: `polylogicai/polybrain-kernel` at tag `v1.0.0-experiment`, commit hash **{{COMMIT_HASH}}** (= H₁ of the preregistration row).
**Sampling-frame hash (C.3)**: **{{SAMPLE_FRAME_HASH}}**.
**Canon file (SHA-256)**: **{{CANON_SHA}}**.

## 2. What was preregistered

Verbatim from Appendix C of the preregistration paper:

**Hypothesis (C.5).** *"We predict (a) that the mean of per-paper deltas Δᵢ = s^A_i − s^B_i is significantly different from zero at α = 0.05 under a two-sided paired t-test with n = 30; and (b) that the pairwise Cohen's kappa between Channels A and B substantially exceeds the pairwise Cohen's kappa between Channel A and Channel C, consistent with the Reviewer-Correlation Ceiling Hypothesis."*

**Stopping rule (C.6).** *"We commit to run exactly thirty papers, no early stopping, no peeking at any Δᵢ before all thirty are complete. The analysis script is executed exactly once, on the full thirty-paper canon row set, after all scoring rows have been appended. No re-runs with alternative composite weights or alternative analysis methods are permitted under this preregistration."*

**Composite weights (C.4).** $s = 0.34q + 0.33a + 0.33f$. Byte-match asserted at analysis time by `src/channels/rubric.mjs` and re-asserted at analysis entry by `src/experiment/analysis.mjs`.

## 3. What was executed

### 3.1 Channels

- **Channel A** (self-pool, 9 models across 4 providers): {{CHANNEL_A_MODELS}}
- **Channel B** (disjoint-transformer pool, 9 models across 6 providers): {{CHANNEL_B_MODELS}}
- **Channel C** (structurally non-transformer AND-composition): conservativity (deterministic Jaccard/recall + numeric tolerance) AND ground-truth (URL/citation resolver) AND falsification (Wikipedia full-text retrieval overlap with deterministic cache).

### 3.2 Execution profile

- **Papers scored**: 30 NeurIPS 2024 accepted-paper abstracts, stratified 10/10/10 across {cs.LG, cs.AI} / {cs.CL, cs.CV} / {stat.ML, cs.IT}
- **Sample source**: `papers.nips.cc/paper_files/paper/2024` (the NeurIPS Foundation accepted-paper listing), 4,034 total papers
- **Sample seed**: `SHA256(commit_hash_H1 || "sample-papers")`
- **Order randomization**: `SHA256(commit_hash_H1 || paper_id || "order")[0] mod 2` per paper
- **Total LLM calls (Channels A + B with 2 replays)**: {{TOTAL_CALLS}}
- **Channel C calls**: 30 (one per paper)
- **Wall-clock duration**: {{WALL_CLOCK}}
- **Total API cost across all paid providers**: {{TOTAL_COST}}

## 4. Executed result

### 4.1 Per-paper deltas

Table: each of the 30 papers' mean Channel-A composite, mean Channel-B composite, and $\Delta_i = s^A_i - s^B_i$.

{{PER_PAPER_TABLE}}

### 4.2 Paired statistical tests on Δ

All three tests are reported per the preregistration's no-method-cherry-picking requirement.

| Test | Statistic | n | p-value |
|---|---:|---:|---:|
| Paired t-test | t = {{T_STAT}} | {{N}} | {{T_P}} |
| Wilcoxon signed-rank | z = {{W_Z}} | {{W_N}} | {{W_P}} |
| Sign test | pos = {{SIGN_POS}}, neg = {{SIGN_NEG}} | {{SIGN_N}} | {{SIGN_P}} |

Mean Δ = **{{MEAN_DELTA}}**. SD = {{SD_DELTA}}. 95% paired-t CI = {{CI95}}.

### 4.3 Pairwise Cohen's κ

| Pair | κ | po (observed agreement) | pe (expected agreement) | n claims |
|---|---:|---:|---:|---:|
| κ(A, B) | {{KAPPA_AB}} | {{KAPPA_AB_PO}} | {{KAPPA_AB_PE}} | {{KAPPA_AB_N}} |
| κ(A, C) | {{KAPPA_AC}} | {{KAPPA_AC_PO}} | {{KAPPA_AC_PE}} | {{KAPPA_AC_N}} |

Difference **κ(A,B) − κ(A,C) = {{KAPPA_DIFF}}**.

## 5. Adjudication

The preregistration's two-part hypothesis requires both:

(a) the mean of per-paper deltas Δᵢ is significantly different from zero at α = 0.05 under the paired t-test; AND
(b) the pairwise Cohen's κ between Channels A and B substantially exceeds the pairwise Cohen's κ between Channel A and Channel C.

**Condition (a) met?** **{{COND_A}}** — paired-t p = {{T_P}}, Wilcoxon p = {{W_P}}, sign p = {{SIGN_P}}; decision at α = 0.05.

**Condition (b) met?** **{{COND_B}}** — κ(A,B) − κ(A,C) = {{KAPPA_DIFF}}; "substantially" operationalized as > 0.1 per the kernel's `analysis.mjs` adjudication rule.

**Overall hypothesis adjudication**: **{{HYPOTHESIS_VERDICT}}**.

## 6. Honest disclosure

The preregistration's §5 invariant requires falsification to be reported with equal prominence to confirmation. This section is written from the same template regardless of which direction the result landed.

{{HONEST_DISCLOSURE_SECTION}}

## 7. Limitations

- **NeurIPS 2024 abstracts are in the training data** of every reviewer model in both Channels A and B. This confound is preregistered as a disclosure (§12.3 of the preregistration) and affects both channels equally, so the within-pair delta is still interpretable.
- **Channel C uses Wikipedia full-text search + keyword overlap** rather than full BM25 over a local Wikipedia dump. The choice is documented in `src/witness/falsification.mjs` and the follow-up v1.1.0 will upgrade the retrieval backend to a local BM25 index. The current implementation is still deterministic given the cached responses and structurally non-transformer.
- **Channel C returned PENDING for {{C_PENDING_COUNT}} of 30 papers**, due to the Wikipedia retrieval primitive not finding sufficient support. A PASS verdict from Channel C is stricter than the witness stack of §7 allows by default, so this conservative bias is documented.
- **Anthropic slot** uses claude-sonnet-4-5 + claude-haiku-4-5-20251001 rather than opus-tier models. This was a budget decision documented in commit `f01f2b9` of the kernel. It affects the absolute Channel B composite but not the within-pair delta against Channel A.
- **Gas pedal** is a constant loaded from `rules/kernel.yaml`, not auto-tuned. This matches the §11.2 "partial" disclosure of the private reference implementation.

## 8. Reproducibility

Anyone can reproduce this deposit from a fresh clone of the kernel at the frozen tag:

```bash
git clone https://github.com/polylogicai/polybrain-kernel.git
cd polybrain-kernel
git checkout v1.0.0-experiment
npm install
cp .env.example .env   # fill in your own keys
node src/experiment/run.mjs
```

The kernel will write to `canon/rcc-n30-2026-04-14.jsonl`. The chain should produce a SHA-256 equal to **{{CANON_SHA}}** if the provider responses were byte-identical and the cached Wikipedia / NeurIPS listings are as shipped. Any divergence is a pure function of upstream provider nondeterminism (which we set to `temperature=0` to eliminate) or external listing drift (which we neutralize by shipping the frozen caches inside the tag).

## Availability

- **This follow-up deposit**: fresh Zenodo concept DOI, **{{FOLLOWUP_DOI}}** (version DOI {{FOLLOWUP_V1_DOI}})
- **Preregistration of record**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656)
- **Kernel at frozen tag**: [https://github.com/polylogicai/polybrain-kernel/tree/v1.0.0-experiment](https://github.com/polylogicai/polybrain-kernel/tree/v1.0.0-experiment)
- **Contact**: `ajs10845@psu.edu`

## Acknowledgments

The author thanks every model in both reviewer channels, whose rate-limit-free and mostly-temperature-0-responsive dispatch made the protocol executable in under an hour of wall-clock time. The RCC falsification arm draws on Wikipedia's public API; the deposit's cryptographic priority proof is anchored to the Bitcoin blockchain via OpenTimestamps.

---

*This paper is released under the Creative Commons Attribution 4.0 license (CC BY 4.0). It is the executed-result follow-up to the preregistered protocol of Salvo (2026; doi:10.5281/zenodo.19571656). The preregistration forbids selective reporting, so the statistical tuple in §4 and the adjudication in §5 are reported verbatim from the `analysis_result` row of the canon regardless of whether they support or falsify the preregistered hypothesis.*
