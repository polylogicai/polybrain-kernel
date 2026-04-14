# Launch post template

Three versions of the launch post — short (X/Twitter), medium (HN), long (blog). Each version has a SUPPORTED branch and a NOT-SUPPORTED branch. Pick the branch that matches the adjudication.

---

## Short (X/Twitter, 280 chars)

### SUPPORTED branch
> Paper + reference implementation + executed result shipped simultaneously.
>
> Salvo 2026: *Engine, Rules, and Canon*. Paper: doi:10.5281/zenodo.19571656. Kernel: github.com/polylogicai/polybrain-kernel. Follow-up deposit with RCC-n30 executed result: {{FOLLOWUP_DOI}}.
>
> Mean Δ = {{MEAN_DELTA}}, p = {{T_P}}. Hypothesis supported.

### NOT-SUPPORTED branch
> Paper + reference implementation + executed result shipped simultaneously. Hypothesis not supported, reported honestly per preregistration.
>
> Salvo 2026: doi:10.5281/zenodo.19571656. Kernel: github.com/polylogicai/polybrain-kernel. Follow-up: {{FOLLOWUP_DOI}}.
>
> Mean Δ = {{MEAN_DELTA}} (p = {{T_P}}). The architecture ships; the concrete prediction didn't.

---

## Medium (HN post, ~150 words)

### Title
**Show HN: Polybrain-kernel — runnable reference for a paradigm-shift paper with a preregistered experiment (result inside)**

### Body

I'm Andrew Salvo, undergraduate at Smeal (Penn State). Today I shipped three things at once:

1. **The paper**: *Engine, Rules, and Canon* — an architecture for user-owned, continuously-iterating AI agents. Eleven contributions. Preregistered RCC hypothesis. [doi:10.5281/zenodo.19571656](https://doi.org/10.5281/zenodo.19571656)

2. **The kernel**: github.com/polylogicai/polybrain-kernel — the self-hostable reference implementation. `git clone && docker compose up` in ten minutes. Engine, rules, canon (append-only SHA-256 chain), 4-primitive witness stack, §8 four-predicate publisher, coherence web, self-mod gate. MIT licensed.

3. **The executed result**: The preregistered RCC-n30 matched-paper protocol ran through the kernel on 30 NeurIPS 2024 abstracts. {{HYPOTHESIS_VERDICT}}. Per-paper deltas, five statistical tests, and a full honest-disclosure section in the follow-up deposit: {{FOLLOWUP_DOI}}.

The paper, the kernel, the experiment, and this post are one atomic release. Everything is reproducible from the frozen commit tag.

---

## Long (blog, ~500 words)

### Title
**Ship the paper. Ship the kernel. Run the experiment. Report what it says.**

### Body

Today I shipped a paper about how AI agents should be built, a runnable reference implementation of the architecture that paper describes, and the executed result of a preregistered experiment the paper committed us to run. All three are one atomic release.

**The paper**. *Engine, Rules, and Canon: An Architecture for User-Owned, Continuously Iterating AI Agents — With a Preregistered Protocol for Off-Model Verification* (Salvo, 2026; [doi:10.5281/zenodo.19571656](https://doi.org/10.5281/zenodo.19571656)). The core move is to stop collapsing the agent's engine, its policy, and its memory into a single fused-weight matrix. Separate them into three artifact classes on the filesystem — engine, rules, canon — and every mechanical property of a user-owned, continuously-iterating learner becomes a consequence of that separation. Eleven contributions, including NetTrust, the four-primitive witness stack, the four-predicate publisher test, the coherence web, the self-modification gate, and the Reviewer-Correlation Ceiling Hypothesis.

**The kernel**. [github.com/polylogicai/polybrain-kernel](https://github.com/polylogicai/polybrain-kernel), MIT licensed. The kernel is a continuously-iterating long-running Node process with a priority-ordered work-item queue, a gas pedal dial, an append-only canon chained by SHA-256, a witness stack that composes four deterministic primitives into a five-label verdict, a Fibonacci-sphere publisher view satisfying all four §8 predicates, and a self-modification pre-commit hook. `git clone && docker compose up` gets you a working personal instance in ten minutes. Nothing leaves your machine unless you explicitly initiate it.

**The experiment**. The paper's §12 and Appendix C preregister a matched-paper protocol for the Reviewer-Correlation Ceiling Hypothesis. The kernel executes that protocol as a native act of its being: 30 NeurIPS 2024 abstracts sampled deterministically from the frozen commit hash, scored by a self-pool transformer ensemble (Channel A), a disjoint-transformer ensemble (Channel B), and a structurally non-transformer AND-composition (Channel C). Analysis runs exactly once on the canon. No peeking.

**The result**. {{HYPOTHESIS_VERDICT}}. Full per-paper deltas, three statistical tests (paired t-test, Wilcoxon, sign test), Cohen's κ for both pairings, and an honest-disclosure section ship in the follow-up Zenodo deposit at {{FOLLOWUP_DOI}}.

**Why atomic**. Paradigm-shifting claims attract skepticism. A paper without a runnable artifact is vaporware. A runnable artifact without a preregistered test is marketing. A preregistered test without reported results is a cliffhanger. Shipping all three at one tag, one hash, one release moment is the only way I could think of to close all those rigor gaps simultaneously.

**Reproduce it yourself**:

```bash
git clone https://github.com/polylogicai/polybrain-kernel.git
cd polybrain-kernel
git checkout v1.0.0-experiment
npm install
cp .env.example .env   # fill in your own keys
node src/experiment/run.mjs
```

About 45 minutes of wall clock, ~$5–10 in provider bills. The listing cache and the Wikipedia cache ship inside the frozen tag, so your replay should produce byte-equivalent canon rows. If it doesn't, that's a bug I want to hear about.

If you're building user-owned AI agents and want to dogfood the architecture, clone the kernel and open an issue. If you're just curious about the preregistration discipline, read [INVARIANTS.md](https://github.com/polylogicai/polybrain-kernel/blob/main/INVARIANTS.md) — the six invariants that make the experiment un-fudgeable.

— Andrew Salvo, Smeal College of Business, Penn State. `ajs10845@psu.edu`.
