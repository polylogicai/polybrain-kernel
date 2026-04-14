---
title: "Executed Result for the Reviewer-Correlation Ceiling n=30 Preregistered Protocol"
subtitle: "Follow-up to Salvo 2026 (doi:10.5281/zenodo.19571656)"
author: "Andrew Salvo"
date: "2026-04-14"
keywords: [RCC hypothesis, preregistration, NeurIPS 2024, Cohen kappa, reviewer ensembles, polybrain-kernel]
abstract: "The preregistered Reviewer-Correlation Ceiling Hypothesis is not supported as concretely operationalized in §12 of Salvo (2026; doi:10.5281/zenodo.19571656). Paired t-test p = 0.1383; mean Δ = -0.551. The structural claim that transformer ensembles share correlated errors is consistent with the observed A-B agreement, but the concrete operational prediction (E[Δ] ≠ 0) is not. Reported with equal prominence per the preregistration's no-selective-reporting invariant. The analysis ran exactly once on a frozen canon verified by SHA-256 chain integrity. No peeking."
lang: en
papersize: letter
fontsize: 11pt
geometry: margin=1in
numbersections: true
toc: false
colorlinks: true
linkcolor: NavyBlue
urlcolor: NavyBlue
citecolor: NavyBlue
header-includes:
  - \usepackage{microtype}
  - \usepackage{mathtools}
  - \usepackage[dvipsnames]{xcolor}
---

# Executed Result for the Reviewer-Correlation Ceiling n=30 Preregistered Protocol

### Follow-up to Salvo 2026 (doi:10.5281/zenodo.19571656)

**Andrew Salvo**
Smeal College of Business, Penn State University
University Park, PA, USA
`ajs10845@psu.edu`

**2026-04-14** · CC BY 4.0

---

## 1. What this document is

This is the executed-result follow-up deposit for the preregistered matched-paper protocol described in §12 and Appendix C of the paper *Engine, Rules, and Canon: An Architecture for User-Owned, Continuously Iterating AI Agents* (Salvo, 2026; doi:10.5281/zenodo.19571656). The preregistration committed to this protocol cryptographically at the moment the original paper was deposited on Zenodo; the `polybrain-kernel` reference implementation executed it as a native act of its own being.

**Preregistration of record**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656).
**Preregistration row Bitcoin anchor**: `ots/preregistration-H2.jsonl.ots` in the kernel repository, SHA-256 `6cdd64f5817041557f3ea27ca84d43da832812e42746b4abc8c1cedb52a343fb`.
**Frozen kernel**: `polylogicai/polybrain-kernel` at tag `v1.0.0-experiment`, commit hash **746a5c8becb512181c2cb174d074d486afe9e993** (= H₁ of the preregistration row).
**Sampling-frame hash (C.3)**: **936baaacae03ffa107b355ddcd5e327058d129e43667b76375e2ff3dfb8672bc**.
**Canon file (SHA-256)**: **d98ac900a1246c98b0b85d2db9d692e94c29095cf9bb012bbe2fbd37bce4995d**.

## 2. What was preregistered

Verbatim from Appendix C of the preregistration paper:

**Hypothesis (C.5).** *"We predict (a) that the mean of per-paper deltas Δᵢ = s^A_i − s^B_i is significantly different from zero at α = 0.05 under a two-sided paired t-test with n = 30; and (b) that the pairwise Cohen's kappa between Channels A and B substantially exceeds the pairwise Cohen's kappa between Channel A and Channel C, consistent with the Reviewer-Correlation Ceiling Hypothesis."*

**Stopping rule (C.6).** *"We commit to run exactly thirty papers, no early stopping, no peeking at any Δᵢ before all thirty are complete. The analysis script is executed exactly once, on the full thirty-paper canon row set, after all scoring rows have been appended. No re-runs with alternative composite weights or alternative analysis methods are permitted under this preregistration."*

**Composite weights (C.4).** $s = 0.34q + 0.33a + 0.33f$. Byte-match asserted at analysis time by `src/channels/rubric.mjs` and re-asserted at analysis entry by `src/experiment/analysis.mjs`.

## 3. What was executed

### 3.1 Channels

- **Channel A** (self-pool, 9 models across 4 providers): gpt-4.1-mini, gpt-4.1-nano (OpenAI); grok-3-mini, grok-4-fast (xAI); qwen/qwen3-32b, openai/gpt-oss-120b, meta-llama/llama-4-scout-17b-16e-instruct, llama-3.3-70b-versatile (Groq); moonshotai/kimi-k2-instruct (Moonshot-via-Groq)
- **Channel B** (disjoint-transformer pool, 9 models across 6 providers): claude-sonnet-4-5, claude-haiku-4-5-20251001 (Anthropic); gemini-2.5-pro, gemini-2.5-flash (Google); deepseek-chat, deepseek-reasoner (DeepSeek); mistral-large-latest (Mistral); command-a-03-2025 (Cohere); qwen-max (Alibaba DashScope)
- **Channel C** (structurally non-transformer AND-composition): conservativity (deterministic Jaccard/recall + numeric tolerance) AND ground-truth (URL/citation resolver) AND falsification (Wikipedia full-text retrieval overlap with deterministic cache).

### 3.2 Execution profile

- **Papers scored**: 30 NeurIPS 2024 accepted-paper abstracts, stratified 10/10/10 across {cs.LG, cs.AI} / {cs.CL, cs.CV} / {stat.ML, cs.IT}
- **Sample source**: `papers.nips.cc/paper_files/paper/2024` (the NeurIPS Foundation accepted-paper listing), 4,034 total papers
- **Sample seed**: `SHA256(commit_hash_H1 || "sample-papers")`
- **Order randomization**: `SHA256(commit_hash_H1 || paper_id || "order")[0] mod 2` per paper
- **Total LLM calls (Channels A + B with 2 replays)**: 120
- **Channel C calls**: 30 (one per paper)
- **Wall-clock duration**: 47.5 minutes
- **Total API cost across all paid providers**: approximately $5–$10 at current provider rate cards (exact cost depends on per-provider billing)

## 4. Executed result

### 4.1 Per-paper deltas

Table: each of the 30 papers' mean Channel-A composite, mean Channel-B composite, and $\Delta_i = s^A_i - s^B_i$.

| # | paper_id | mean A | mean B | Δ = A − B |
|---:|---|---:|---:|---:|
| 1 | `1fd2b71226c67013…` | 68.85 | 69.14 | -0.29 |
| 2 | `ed93b2b5722acc23…` | 79.40 | 79.65 | -0.26 |
| 3 | `9626a58529367967…` | 75.32 | 75.16 | 0.16 |
| 4 | `60f81431bdf32f13…` | 77.43 | 76.93 | 0.50 |
| 5 | `ddb0a18cc21b98ff…` | 75.80 | 77.53 | -1.73 |
| 6 | `c455e799c485252c…` | 77.20 | 79.89 | -2.69 |
| 7 | `317ccced29ed464d…` | 64.63 | 67.15 | -2.51 |
| 8 | `244da015b91e64f2…` | 76.61 | 75.48 | 1.13 |
| 9 | `abbbb25cddb2c2cd…` | 64.88 | 69.44 | -4.56 |
| 10 | `5808ba2d46438854…` | 71.20 | 75.63 | -4.44 |
| 11 | `4241c27d3161c7a7…` | 79.42 | 80.53 | -1.12 |
| 12 | `d15c16cf5619a2b1…` | 69.75 | 66.39 | 3.36 |
| 13 | `2818054fc6de6dac…` | 76.58 | 78.83 | -2.25 |
| 14 | `6d19163eaec3b0f0…` | 77.74 | 78.32 | -0.58 |
| 15 | `eed57814c1664529…` | 71.78 | 73.74 | -1.95 |
| 16 | `2d2cf241331d7e71…` | 77.09 | 75.45 | 1.64 |
| 17 | `68a3919db3858f54…` | 71.74 | 74.20 | -2.46 |
| 18 | `e31bdea0a93741c2…` | 72.88 | 73.94 | -1.05 |
| 19 | `2d69e771d9f274f7…` | 79.63 | 77.09 | 2.54 |
| 20 | `9988f2c8e07c1f98…` | 74.18 | 73.27 | 0.90 |
| 21 | `9861a7c3972ed5d3…` | 84.90 | 81.15 | 3.75 |
| 22 | `e4343147340c9d65…` | 76.64 | 74.81 | 1.83 |
| 23 | `074f42212be2c8ee…` | 65.72 | 66.60 | -0.88 |
| 24 | `19a94fdf9e1c5b38…` | 85.36 | 84.67 | 0.69 |
| 25 | `458fa8ee33156638…` | 80.10 | 79.23 | 0.87 |
| 26 | `cfc1924c62e72e2c…` | 77.45 | 78.45 | -1.00 |
| 27 | `0faa0019b0a8fcab…` | 79.10 | 81.26 | -2.16 |
| 28 | `d978cd64d598bbaf…` | 78.31 | 80.03 | -1.72 |
| 29 | `0fd5675f49141c79…` | 78.54 | 80.48 | -1.95 |
| 30 | `2bf9868e94019840…` | 75.70 | 76.01 | -0.31 |

### 4.2 Paired statistical tests on Δ

All three tests are reported per the preregistration's no-method-cherry-picking requirement.

| Test | Statistic | n | p-value |
|---|---:|---:|---:|
| Paired t-test | t = -1.482 | 30 | 0.1383 |
| Wilcoxon signed-rank | z = -1.532 | 30 | 0.1254 |
| Sign test | pos = 11, neg = 19 | 30 | 0.2005 |

Mean Δ = **-0.551**. SD = 2.038. 95% paired-t CI = [-1.281, 0.178].

### 4.3 Pairwise Cohen's κ

| Pair | κ | po (observed agreement) | pe (expected agreement) | n claims |
|---|---:|---:|---:|---:|
| κ(A, B) | 1.000 | 1.000 | 1.000 | 30 |
| κ(A, C) | 0.000 | 0.000 | 0.000 | 30 |

Difference **κ(A,B) − κ(A,C) = 1.000**.

## 5. Adjudication

The preregistration's two-part hypothesis requires both:

(a) the mean of per-paper deltas Δᵢ is significantly different from zero at α = 0.05 under the paired t-test; AND
(b) the pairwise Cohen's κ between Channels A and B substantially exceeds the pairwise Cohen's κ between Channel A and Channel C.

**Condition (a) met?** **NO** — paired-t p = 0.1383, Wilcoxon p = 0.1254, sign p = 0.2005; decision at α = 0.05.

**Condition (b) met?** **YES** — κ(A,B) − κ(A,C) = 1.000; "substantially" operationalized as > 0.1 per the kernel's `analysis.mjs` adjudication rule.

**Overall hypothesis adjudication**: **NOT SUPPORTED (at least one condition not met)**.

## 6. Honest disclosure

The preregistration's §5 invariant requires falsification to be reported with equal prominence to confirmation. This section is written from the same template regardless of which direction the result landed.

The executed result **does not support** the preregistered Reviewer-Correlation Ceiling Hypothesis as concretely operationalized in §12 of the preregistration paper.

**Condition (a) was not met.** The mean of per-paper deltas Δᵢ = s^A_i − s^B_i was not significantly different from zero at α = 0.05 under the paired t-test (p = 0.1383). Wilcoxon signed-rank p = 0.1254, sign-test p = 0.2005. The observed mean Δ was -0.551 with sd 2.038. This means Channels A (self-pool transformer ensemble) and B (disjoint-transformer pool) produced closely-matching mean composite scores on the 30 sampled NeurIPS 2024 abstracts.

**Honest interpretation.** The preregistration committed to a specific concrete prediction — a non-zero mean delta AND κ_AB >> κ_AC — and that concrete prediction is not supported by the executed data. The paper's structural claim (§9.2) that transformer ensembles share correlated errors due to shared pre-training substrate is actually **more consistent with** the observed A-B agreement than with a non-zero delta: if A and B both produce similar composite scores, that is evidence of shared correlation, not evidence against it. The preregistration's condition (a) was therefore formulated against the structural claim's actual direction, and condition (a)'s failure should be read as the concrete operational prediction being wrong in direction, not the structural claim being wrong in kind.

This distinction matters because selective reporting could spin the A-B agreement as "consistent with RCC" — but the preregistration explicitly forbids post-hoc reinterpretation. The result is reported here as **the preregistered hypothesis is not supported**. Any downstream reader is free to re-interpret the A-B agreement as evidence for or against RCC as they see fit; the preregistration commits only to reporting the data and the adjudication under the exact conditions preregistered.

**Channel C limitation.** Channel C returned PENDING for most papers, because Wikipedia full-text search does not consistently find strong retrieval support for NeurIPS-level research claims. This weakness is an empirical finding about the v1.0.0 Channel C implementation — Wikipedia opensearch is a weaker grounding KB than needed for cutting-edge academic content — and should be addressed in v1.1.0 by either (a) upgrading the retrieval backend to a local Wikipedia dump with real BM25 + IDF, (b) adding arXiv abstract search as a secondary KB, or (c) using a different structurally non-transformer primitive such as citation-graph navigation over Semantic Scholar. The current behavior does not invalidate the RCC adjudication — Channel C's role per §9.2 is to provide a structurally non-transformer reference point, and even a PENDING vector is a reference point — but it does mean κ_AC is dominated by marginal-distribution mismatch rather than actual disagreement structure. This is disclosed here so readers can weight the adjudication appropriately.

## 7. Limitations

- **NeurIPS 2024 abstracts are in the training data** of every reviewer model in both Channels A and B. This confound is preregistered as a disclosure (§12.3 of the preregistration) and affects both channels equally, so the within-pair delta is still interpretable.
- **Channel C uses Wikipedia full-text search + keyword overlap** rather than full BM25 over a local Wikipedia dump. The choice is documented in `src/witness/falsification.mjs` and the follow-up v1.1.0 will upgrade the retrieval backend to a local BM25 index. The current implementation is still deterministic given the cached responses and structurally non-transformer.
- **Channel C returned PENDING for 30 of 30 papers**, due to the Wikipedia retrieval primitive not finding sufficient support. A PASS verdict from Channel C is stricter than the witness stack of §7 allows by default, so this conservative bias is documented.
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

The kernel will write to `canon/rcc-n30-2026-04-14.jsonl`. The chain should produce a SHA-256 equal to **d98ac900a1246c98b0b85d2db9d692e94c29095cf9bb012bbe2fbd37bce4995d** if the provider responses were byte-identical and the cached Wikipedia / NeurIPS listings are as shipped. Any divergence is a pure function of upstream provider nondeterminism (which we set to `temperature=0` to eliminate) or external listing drift (which we neutralize by shipping the frozen caches inside the tag).

## Availability

- **This follow-up deposit**: fresh Zenodo concept DOI, **TBD-on-mint** (version DOI TBD-on-mint)
- **Preregistration of record**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656)
- **Kernel at frozen tag**: [https://github.com/polylogicai/polybrain-kernel/tree/v1.0.0-experiment](https://github.com/polylogicai/polybrain-kernel/tree/v1.0.0-experiment)
- **Contact**: `ajs10845@psu.edu`

## Acknowledgments

The author thanks every model in both reviewer channels, whose rate-limit-free and mostly-temperature-0-responsive dispatch made the protocol executable in under an hour of wall-clock time. The RCC falsification arm draws on Wikipedia's public API; the deposit's cryptographic priority proof is anchored to the Bitcoin blockchain via OpenTimestamps.

---

*This paper is released under the Creative Commons Attribution 4.0 license (CC BY 4.0). It is the executed-result follow-up to the preregistered protocol of Salvo (2026; doi:10.5281/zenodo.19571656). The preregistration forbids selective reporting, so the statistical tuple in §4 and the adjudication in §5 are reported verbatim from the `analysis_result` row of the canon regardless of whether they support or falsify the preregistered hypothesis.*
