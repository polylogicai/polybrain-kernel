# ARCHITECTURE

Terse port of the paper's §3-§11 architectural exposition with section references back to the Zenodo deposit.

**Paper**: [`10.5281/zenodo.19571656`](https://doi.org/10.5281/zenodo.19571656)

---

## §3. Theoretical foundation

The architecture rests on three commitments.

### §3.1 Bateson-style type-token separation

Three logical levels are kept syntactically distinct:

- **Level 0**: the computational substrate (weights, files, bytes)
- **Level 1**: the policy or rules the substrate encodes
- **Level 2**: the commitments the agent has made by applying its rules to the world (the canon)

Fused-weight LLM agents collapse all three into one weight matrix. The `engine(rules) → results` invariant restores type-consistency: `E` is Level 0, `R` is Level 1, `C` is Level 2.

Implementation: `src/engine.mjs` (E), `rules/*.yaml` (R), `src/canon.mjs` + `canon/*.jsonl` (C).

### §3.2 Three-primitive minimality

A canon-keeping learner needs exactly three primitive operators:

- `observe(x)` — accept input, emit tentative claim `c`
- `decide(c, C)` — apply rules against canon to produce verdict
- `remember(c, v)` — append `(c, v)` to the canon

Implementation: the kernel loop (`src/kernel.mjs`) is a scheduler over exactly these three, wrapped in a priority-ordered work-item queue.

### §3.3 Structural Role Separation (SRS)

Four planes, each on its own logical level:

- **Intent plane**: `rules/identity.yaml`, user-editable permissions and goals
- **Management plane**: `rules/kernel.yaml`, gas pedal + effort dial + priority policy
- **Control plane**: the witness stack, publisher test, coherence web, self-mod gate — invariant at the engine layer
- **Data plane**: the canon itself

Cross-plane leaks are structural bugs. An edit in the intent plane cannot bypass the control plane.

## §4. The `engine(rules) → results` invariant

$$C_{t+1} = C_t \oplus \pi_{\Delta C}(E(R_t, x_t, C_t))$$

where `⊕` is append and `π_ΔC` projects the canon delta from the engine's output pair. Because `E` is pure and `⊕` is append-only, the runtime is **replayable**: given `(R, x, C)` at any `t`, the entire trajectory is reproducible.

Implementation: `src/engine.mjs` (`createEngine`, `apply`), `src/canon.mjs` (`append`, `verifyChain`).

## §5. NetTrust

$$N = 3h + c − 2w − u − 0.1s$$

- `h` — SURVIVED (held up under re-verification)
- `c` — VERIFIED (passed on first check)
- `w` — REFUTED (wrong)
- `u` — CHALLENGED (uncertain or contradicted by coherence web)
- `s` — PENDING (beyond threshold)

The kernel's objective function is `dN/dt`, not `N` itself. Implementation: `src/nettrust.mjs`.

## §6. The continuously iterating kernel

Long-running process. Priority-ordered work-item queue. Two orthogonal dials:

- **Gas pedal** `g ∈ [0, 1]` — background iteration rate
- **Per-item effort** `ε ∈ {reflex, consider, investigate, invent}` — per-item compute budget

v1.0.0 ships `g` as a constant from `rules/kernel.yaml`. The auto-tuning controller is future work (§13.3). Implementation: `src/kernel.mjs`.

## §7. The four-primitive witness stack

Canon rows are verified by an AND-composer over four primitives:

1. **Conservativity** — token/numeric stability against declared substrate (`src/witness/conservativity.mjs`, ported from private)
2. **Ground-truth** — URL resolution, file existence, citation numeric match (`src/witness/ground-truth.mjs`)
3. **Falsification** — counter-example construction via structurally non-transformer checker; v1.0.0 uses Wikipedia full-text search with deterministic cache (`src/witness/falsification.mjs`)
4. **Cross-substrate** — agreement across independent provider stacks (`src/witness/cross-substrate.mjs`, composes `src/channels/transformer.mjs` dispatch)

Five public verdicts: **VERIFIED** (all PASS first pass) / **SURVIVED** (VERIFIED + held up on re-verification) / **PENDING** (any primitive PENDING) / **CHALLENGED** (coherence web contradict override) / **REFUTED** (any primitive FAIL).

**Crucially, the composer is not LLM-based.** LLM output is telemetry, never gates publication. Implementation: `src/witness/index.mjs`.

## §8. The four-predicate publisher

Any consumer view of the canon must satisfy simultaneously:

- **TOTAL** — every row occupies exactly one vertex
- **BOUNDED** — the view fits a single viewport
- **NON-RANKING** — geometry encodes verdict class and time-alive, never priority
- **WRITE-CAPTURING** — viewing events append canon rows

v1.0.0 ships a Fibonacci-lattice sphere projection satisfying all four. Implementation: `src/publisher.mjs` + `public/publisher.html`. Port `4850`.

## §9. Coherence web + Reviewer-Correlation Ceiling

### §9.1 Coherence web

Graph `G = (V, E)` over canon rows, with edges typed `{reinforces, contradicts}` by token-overlap similarity gated on negation-polarity mismatch. Any `contradicts` edge forces CHALLENGED regardless of witness-stack output. Implementation: `src/coherence.mjs`.

### §9.2 Reviewer-Correlation Ceiling Hypothesis

Transformer-based reviewer ensembles asymptote near the Landis-Koch substantial-agreement band regardless of size, because shared pre-training substrate induces correlated errors. Preregistered adjudication protocol in §12 + Appendix C of the paper. This kernel's `src/experiment/run.mjs` executes that protocol.

## §10. Self-modification gate

A proposed rule edit enters the canon as a claim, passes the witness stack, and is gated by a pre-commit hook before git merge. The only writable path to the runtime's own rules is through the same gate the runtime enforces on external claims. Implementation: `src/self-mod.mjs`, `.git/hooks/pre-commit`.

## §11. Ownership axis

Orthogonal to every feature axis of AI products (capability, memory, tool use, alignment) lies an **ownership axis**: vendor server → vendor model → vendor agent → *user's machine, user's keys, user's canon, user's life*. Every mechanical property of this kernel — local runtime, local canon, local keys, local identity — is a consequence of maximizing the ownership axis rather than the feature axis.

Implementation: every file in this repository. Delete the canon, delete the agent. Copy the canon, copy the agent. Fork the rules, fork the policy.
