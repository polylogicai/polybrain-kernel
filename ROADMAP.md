# ROADMAP

Staged releases from v0.1.0 (this atomic release) through v2.0.0 (adoption).

**Paper**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656)

---

## v1.0.0 — atomic release (current)

Everything in `src/`, `rules/`, `public/`, `tools/`, and `paper/` ships in one commit tag at one hash. The kernel runs the preregistered RCC-n30 experiment as a native act of its being. The follow-up Zenodo deposit goes live simultaneously with the public flip of this repo.

- §6 species-complete kernel (continuously iterating, work-item queue, gas pedal constant)
- §7 full 4-primitive witness stack (conservativity real, ground-truth real, falsification real, cross-substrate real)
- §8 four-predicate publisher (Fibonacci-sphere lattice projection, write-capturing events)
- §9 coherence web with CHALLENGED override
- §10 self-modification gate scaffolded-but-installed (pre-commit hook live, first real rule edit pending)
- §12 experiment execution pipeline (Channel A/B/C scorers, NeurIPS sampler, analysis, OTS anchor, Zenodo mint)

## v1.1.0 — experiment-running enhancements

- Gas pedal auto-tuning controller (moves the partial `g` from rules-constant to gradient-driven — removes the §11.2 "partially wired" disclosure)
- Full BM25 over a local Wikipedia dump, replacing the opensearch-cache falsification backend
- Per-provider concurrency throttling for rate-limit robustness during long experiment runs
- Real-time cost tracking with user-configurable hard cap
- Replay harness: given a fresh clone + the frozen canon, re-run the full pipeline offline and verify byte-equivalent results

## v1.2.0 — chat-first consumer surface

- Chat interface parity with the private reference implementation's `/loop` page (the "Polybrain Chatbot" design language flagged in `company/initiatives/020-polybrain-chatbot-reference/` in the orchestrator registry)
- Streaming witness-stack events per conversation turn (SSE)
- First-person identity file in the voice the agent speaks with
- Conversational dispute button inside the assistant's bubble (not a floating dashboard affordance)

## v1.3.0 — gated self-mod exercised in production

- The first real rule edit that passes through the §10 gate in production
- Removes the §11.2 "scaffold only" disclosure for §10
- Documented case study: a rule edit that is caught and rejected, and one that is accepted

## v2.0.0 — federation

- Multi-instance canon federation with cryptographic cross-verification
- Rule library (`polybrain-ai/rules-library` — sibling repo)
- Community-contributed witness primitives

---

## What will NOT be added

- **No LLM in the witness stack composer.** §7 is non-negotiable. LLM output is telemetry, never gates publication.
- **No hosted SaaS version.** The kernel is user-owned by architectural commitment (§11). A hosted version would contradict the ownership axis. If a user wants remote execution, they run the kernel on their own remote machine.
- **No telemetry.** Nothing leaves the user's machine unless the user explicitly initiates it.
- **No analytics.** No crash reporting, no usage tracking, no feature-flag service.
- **No model-specific optimizations that fuse engine and rules.** Any optimization that collapses the `engine(rules) → results` separation is a regression and will be rejected.
