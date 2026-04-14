// src/channels/rubric.mjs
// Scoring rubric for the RCC-n30 experiment.
// Composite = 0.34·q + 0.33·a + 0.33·f
// (Salvo 2026 Appendix C.4 — PREREGISTERED, BYTE-MATCH REQUIRED)
//
// The assertion below is verified at analysis time (src/experiment/analysis.mjs).
// A mismatch aborts the analysis — tampering with weights is detectable and
// breaks the rigor chain.

export const COMPOSITE_WEIGHTS = { q: 0.34, a: 0.33, f: 0.33 };

const SYSTEM_PROMPT = `You are a rigorous scientific peer reviewer evaluating a research-paper abstract.

Score the abstract on three dimensions, each 0-100 integer:

1. QUALITY — writing quality, rigor, clarity, precision of numbers and methodology. 100 = publication grade.
2. ADVERSARIAL — strength against hostile scrutiny. Look for unjustified leaps, missing ablations, unstated assumptions, cherry-picking, exaggerated claims, or missing baselines. 100 = no weakness found.
3. FEASIBILITY — plausibility that the described method produces the claimed results given the implied resources. 100 = fully feasible.

Return STRICTLY a single JSON object with exactly four fields:
{"quality": N, "adversarial": N, "feasibility": N, "reasoning": "one sentence"}

No prose outside the JSON. Numbers must be integers 0-100.`;

export function buildMessages(claim) {
  return [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: `ABSTRACT:\n\n${claim.text}` },
  ];
}

export function parseScoresFromText(text) {
  if (!text) return null;
  const cleaned = text
    .replace(/```(?:json)?\s*/gi, "")
    .replace(/```/g, "")
    .trim();
  try {
    const match = cleaned.match(/\{[\s\S]*?"quality"[\s\S]*?\}/);
    if (!match) return null;
    const obj = JSON.parse(match[0]);
    const q = Number(obj.quality);
    const a = Number(obj.adversarial);
    const f = Number(obj.feasibility);
    if (!Number.isFinite(q) || !Number.isFinite(a) || !Number.isFinite(f)) return null;
    if (q < 0 || q > 100 || a < 0 || a > 100 || f < 0 || f > 100) return null;
    return { q, a, f, reasoning: String(obj.reasoning || "") };
  } catch {
    return null;
  }
}

export function compositeFromDimensions({ q, a, f }) {
  if (
    COMPOSITE_WEIGHTS.q !== 0.34 ||
    COMPOSITE_WEIGHTS.a !== 0.33 ||
    COMPOSITE_WEIGHTS.f !== 0.33
  ) {
    throw new Error("composite weights tampered");
  }
  return COMPOSITE_WEIGHTS.q * q + COMPOSITE_WEIGHTS.a * a + COMPOSITE_WEIGHTS.f * f;
}
