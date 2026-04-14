# REPRODUCE

How to reproduce the RCC-n30 experiment from a fresh clone of this repository. Every step is deterministic given the keys and the commit hash.

**Paper**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656) §12 + Appendix C

---

## 0. What you need

- **Node.js ≥ 20**
- **git**
- **API keys** for the experiment channels. All nine, copied from your own provider accounts:
  - Channel A: `OPENAI_API_KEY`, `XAI_API_KEY`, `GROQ_API_KEY` (Moonshot via Groq, no separate key)
  - Channel B: `POLYBRAIN_ANTHROPIC_KEY` (or `ANTHROPIC_API_KEY`), `GEMINI_API_KEY`, `DEEPSEEK_API_KEY`, `MISTRAL_API_KEY`, `COHERE_API_KEY`, `DASHSCOPE_API_KEY`
- **~$6–$12** in prepaid credits distributed across the paid providers (Anthropic, Google, DeepSeek, Mistral, Cohere, Alibaba — most Channel A providers are free-tier-sufficient). Budget cap is user-controlled; the shipped `rules/kernel.yaml` does not enforce a hard limit.
- **~2 hours** of wall-clock time
- **Network access** to OpenReview (for the NeurIPS 2024 listing) and Wikipedia (for the §9.2 falsification primitive). Both responses are cached locally after first fetch.

## 1. Clone and install

```bash
git clone https://github.com/polylogicai/polybrain-kernel.git
cd polybrain-kernel
npm install
```

## 2. Configure keys

Create a `.env` file in the repo root (it is git-ignored):

```bash
cat > .env <<'EOF'
OPENAI_API_KEY=sk-...
XAI_API_KEY=xai-...
GROQ_API_KEY=gsk_...
POLYBRAIN_ANTHROPIC_KEY=sk-ant-api03-...
GEMINI_API_KEY=AIza...
DEEPSEEK_API_KEY=sk-...
MISTRAL_API_KEY=...
COHERE_API_KEY=...
DASHSCOPE_API_KEY=sk-...
EOF
```

Alternatively: point `POLYBRAIN_ENV_FILE` at an existing file, or let the kernel read from `~/polybrain/.env` and `~/orchestrator/.env` as it does for the maintainer.

## 3. Start the progress dashboard (optional but recommended)

```bash
node tools/dashboard/server.mjs &
```

Open `http://localhost:4849`. It will display `0%` at first and advance as the experiment runs.

## 4. Run the experiment

```bash
node src/experiment/run.mjs
```

This writes to `canon/rcc-n30-2026-04-14.jsonl` (isolated from the default canon). Expected wall clock: ~2 hours. Expected cost: $6-12 on provider bills depending on rate cards. Output to stdout includes per-paper progress lines.

The first invocation:

1. Loads your keys
2. Opens the isolated canon and verifies its SHA-256 chain
3. Resolves `H₁ = git rev-parse HEAD`
4. Fetches the NeurIPS 2024 OpenReview listing (cached at `canon/neurips-cache/neurips-2024-listing.json`)
5. Computes the sampling-frame hash C.3
6. Appends the preregistration row (H₂) if not present
7. Samples 30 stratified papers deterministically from H₁
8. For each paper, runs Channel A + Channel B twice (per §12.3 replay) in the order determined by the paper-specific hash, plus Channel C once
9. After all 30 are in, runs `src/experiment/analysis.mjs` exactly once
10. Appends the `analysis_result` row and exits

## 5. Inspect the result

```bash
# Chain integrity
node -e "import('./src/canon.mjs').then(async (m) => { const c = await m.openCanon('./canon/rcc-n30-2026-04-14.jsonl'); console.log(c.verifyChain()); })"

# Extract the analysis result
grep -E '"type":"analysis_result"' canon/rcc-n30-2026-04-14.jsonl | tail -1 | jq .
```

The result row contains:
- `paired_t` — t-statistic, p-value, n, mean, sd
- `wilcoxon` — W-statistic, z, p-value
- `sign_test` — pos, neg, p-value
- `kappa_AB` — Cohen's κ between Channels A and B
- `kappa_AC` — Cohen's κ between Channels A and C
- `hypothesis_adjudication` — `{mean_delta_nonzero_at_p05, kappa_AB_dominates_AC, all_conditions_met}`

## 6. Replay determinism check

A second clone of this repo at the same commit, with the same keys, should produce a **byte-equivalent** canon row set. Verification:

```bash
sha256sum canon/rcc-n30-2026-04-14.jsonl
```

If your replay hash differs from the reference published in the follow-up deposit, investigate the difference. Sources of non-determinism to rule out:
- Provider rate-card drift (unlikely to affect raw response content at temperature 0)
- Wikipedia article content change between your cache and the reference cache (fix: use the reference `canon/wiki-cache/` snapshot)
- OpenReview listing change (fix: use the reference `canon/neurips-cache/` snapshot)

## 7. Cite this reproduction

If you report a replay, cite both the paper and this kernel at the commit hash you replayed:

```
Salvo, A. (2026). Engine, Rules, and Canon. Zenodo. doi:10.5281/zenodo.19571656
polybrain-kernel @ git commit <your-commit-hash>
```

---

## Known caveats

- **NeurIPS 2024 abstracts are in the training data of the reviewer models.** This confound affects both Channel A and Channel B equally, so the within-pair delta is still interpretable. Already disclosed in paper §12 and Appendix A.
- **The falsification primitive ships as keyword overlap over Wikipedia full-text search**, not full BM25 over a local Wikipedia dump. v1.1.0 will upgrade this. Current implementation is still deterministic (given cache) and structurally non-transformer, satisfying §9.2's demand.
- **The gas pedal is a constant**, not auto-tuned. §11.2 "partial" disclosure stands for v1.0.0.
