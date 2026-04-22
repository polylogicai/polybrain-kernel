# Polybrain kernel

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Paper: CC BY 4.0](https://img.shields.io/badge/Paper-CC%20BY%204.0-lightgrey.svg)](https://doi.org/10.5281/zenodo.19571656)
[![DOI](https://img.shields.io/badge/DOI-10.5281%2Fzenodo.19571656-blue.svg)](https://doi.org/10.5281/zenodo.19571656)
[![Node: >=20](https://img.shields.io/badge/node-%3E%3D20-brightgreen.svg)](https://nodejs.org/)

> **Self-hostable reference implementation of Polybrain: engine, rules, canon.**
> A continuously-iterating user-owned AI agent runtime.

**Paper**: *Engine, Rules, and Canon: An Architecture for User-Owned, Continuously Iterating AI Agents, With a Preregistered Protocol for Off-Model Verification.* Andrew Salvo, Smeal College of Business, Penn State University, 2026.

**Preregistration paper concept DOI**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656) (v1: `19571657`)
**Executed-result follow-up concept DOI**: [`10.5281/zenodo.19581035`](https://doi.org/10.5281/zenodo.19581035) (v1: `19581036`)
**Theoretical precursor**: Salvo (2026a), *Agency Preservation Systems*, unpublished manuscript dated 2026-01-17
**Cultural frame**: Hoffman & Beato (2025), *Superagency: What Could Possibly Go Right with Our AI Future*, Authors Equity
**License (code)**: MIT · **License (paper)**: CC BY 4.0

---

## What this is

Polybrain is an AI agent architecture organized around one invariant, `engine(rules) → results`, in which a domain-agnostic engine applies user-owned declarative rules to produce disposable, re-derivable results over an append-only, user-owned substrate called the **canon**. It is not a thin harness around a fused-weight foundation model. The engine, the rules, and the canon are three distinct artifact classes on your filesystem, and every behavior of the kernel is a mechanical derivation from operations on the canon.

- **Engine** (`src/engine.mjs`): pure-function dispatcher `E(R, x, C) → (y, ΔC)`, no claims, no policy.
- **Rules** (`rules/*.yaml`): declarative, inspectable, user-owned, hand-editable.
- **Canon** (`canon/*.jsonl`): append-only SHA-256-chained ledger of every claim the agent has committed to.

The kernel is continuously iterating by design: a long-running process whose natural state is permanent operation, tuned by two orthogonal dials (gas pedal `g`, per-item effort `ε`). Its objective is the time derivative of a single scalar: **NetTrust** `N = 3h + c − 2w − u − 0.1s`, computed over canon verdicts.

See the paper for the full §3-§11 architectural exposition, and `ARCHITECTURE.md` in this repo for a terse port with section references.

## Quickstart (10 minutes)

```bash
git clone https://github.com/polylogicai/polybrain-kernel.git
cd polybrain-kernel
npm install
cp .env.example .env   # then edit .env to add your own keys
docker compose up
```

Then open:
- **http://localhost:4849**: minimalist build/run progress dashboard
- **http://localhost:4850**: §8 four-predicate Fibonacci-sphere publisher (the canonical consumer-facing view of your canon)

The kernel will boot with a default identity in `rules/identity.yaml` (edit it to make the instance yours), start its iteration loop at gas pedal `g = 0.5`, and begin appending rows to `canon/default.jsonl` as you feed it work.

## §11.2 scope parity (honest disclosure)

The paper's §11.2 names what the private reference implementation has shipped and what is still scaffolded. This repository carries the same discipline. Every component is in one of three columns:

| Component | Paper §11.2 status | This repo status |
|---|---|---|
| Continuously-running kernel with 5-step loop | **included** | **real**: `src/kernel.mjs` long-running process with priority queue |
| Append-only survival ledger (5-label verdicts) | **included** | **real**: `src/canon.mjs` with SHA-256 per-row Merkle chain |
| Conservativity witness primitive | **included (real)** | **real**: `src/witness/conservativity.mjs` (ported) |
| Ground-truth witness primitive | **scaffolded** | **real**: `src/witness/ground-truth.mjs` (URL+citation+local-file) |
| Falsification witness primitive | **scaffolded** | **real**: `src/witness/falsification.mjs` (Wikipedia full-text + cache) |
| Cross-substrate witness primitive | **scaffolded** | **real**: via `src/channels/transformer.mjs` 18-model dispatch |
| 4-primitive AND-composer + 5-label verdict | **included** | **real**: `src/witness/index.mjs` |
| Coherence engine with CHALLENGED override | **included** | **real**: `src/coherence.mjs` (§9.1) |
| §8 four-predicate consumer publisher | **included** | **real**: `src/publisher.mjs` + `public/publisher.html` |
| Gas pedal auto-tuning controller | **partial** | **partial**: constant from `rules/kernel.yaml`, no auto-tuning |
| Engine/rules externalization | **partial** | **partial**: core parameters externalized, some constants inline |
| Self-modification gate | **scaffolded** | **scaffolded-but-installed**: `.git/hooks/pre-commit` runs `validateRuleEdit` |
| Chat interface | **included** | **deferred**: the reference chat surface lives in the private repo and is flagged as a future design import |

Four of the four witness primitives in this repo are **real** (beyond §11.2's current scaffolded state for three of them), because they are required for the RCC-n30 experiment's Channel C falsification arm.

## The preregistered experiment

The paper §12 and Appendix C preregister a matched-paper protocol for the **Reviewer-Correlation Ceiling Hypothesis**: thirty NeurIPS 2024 accepted-paper abstracts, stratified 10/10/10, scored by a self-pool (Channel A) and a disjoint-transformer pool (Channel B), adjudicated by a structurally non-transformer Channel C. The composite is `0.34q + 0.33a + 0.33f`, the seed is `SHA256(commit_hash ‖ "sample-papers")`, the stopping rule is exactly 30 papers with no peeking, and the analysis runs exactly once.

This kernel executes that experiment as a native act of its own being. See `REPRODUCE.md` for step-by-step reproduction.

```bash
node src/experiment/run.mjs
```

The follow-up Zenodo deposit (on a fresh concept DOI citing `10.5281/zenodo.19571656` as the preregistration of record) contains the executed result.

## Dependencies

- **Runtime**: Node.js ≥ 20, optional Docker
- **Runtime dependency**: `yaml` (single npm package, pure JS)
- **Experiment dependencies (for Channel A/B dispatch)**: network access to OpenAI, xAI, Groq, Anthropic, Google, DeepSeek, Mistral, Cohere, Alibaba DashScope
- **Experiment dependencies (for Channel C)**: network access to OpenReview and Wikipedia. The Wikipedia and OpenReview responses are cached at `canon/wiki-cache/` and `canon/neurips-cache/`. First run fetches; subsequent runs are byte-deterministic replay.

## Ports

| Port | Purpose |
|---|---|
| `4849` | build/run progress dashboard (minimalist percentage + bar) |
| `4850` | §8 four-predicate publisher |

## Canonical invariants

See `INVARIANTS.md`. The six load-bearing invariants are enforced by code (preregistration, no-peek, stopping rule, chain-verification, honest falsification reporting, composite-weight byte-match) and by discipline (no commits that violate them).

## Citation

```bibtex
@techreport{salvo2026polybrain,
  author = {Salvo, Andrew},
  title = {Engine, Rules, and Canon: An Architecture for User-Owned, Continuously Iterating AI Agents},
  year = {2026},
  month = {April},
  day = {14},
  institution = {Smeal College of Business, Penn State University},
  doi = {10.5281/zenodo.19571656},
  url = {https://doi.org/10.5281/zenodo.19571656},
}
```

Also see `CITATION.cff`.
