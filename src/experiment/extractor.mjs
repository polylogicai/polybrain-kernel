// src/experiment/extractor.mjs
// Deterministic claim extractor. (Salvo 2026 §12.3 step 1)
//
// "A deterministic claim extractor parses the abstract into an ordered
// list of atomic propositional claims {c_{i,j}}. No LLM."
//
// Sentence-level splitting with LaTeX math and common abbreviation handling.
// Pure function. Same input → same output, byte-deterministic.

const ABBREVIATIONS = [
  "mr.", "mrs.", "ms.", "dr.", "prof.",
  "e.g.", "i.e.", "cf.", "et.", "al.", "etc.",
  "fig.", "eq.", "vs.", "approx.",
  "inc.", "ltd.", "corp.", "co.",
  "u.s.", "u.k.", "e.u.",
  "st.", "ave.", "no.", "vol.",
];

function protectDots(text) {
  let out = text;
  for (const abbr of ABBREVIATIONS) {
    const re = new RegExp(abbr.replace(/\./g, "\\."), "gi");
    const safe = abbr.replace(/\./g, "§DOT§");
    out = out.replace(re, safe);
  }
  // Protect numeric dots (2.1, 3.14) and inline math
  out = out.replace(/(\d)\.(\d)/g, "$1§DOT§$2");
  out = out.replace(/\$([^$]*)\$/g, (m) => m.replace(/\./g, "§DOT§"));
  return out;
}

function unprotect(text) {
  return text.replace(/§DOT§/g, ".");
}

export function extractClaims(abstract) {
  if (!abstract || !abstract.trim()) return [];
  const protected_ = protectDots(abstract);
  const sentences = protected_
    .split(/(?<=[.!?])\s+(?=[A-Z])/g)
    .map((s) => unprotect(s).trim())
    .filter((s) => s.length > 10);
  return sentences.map((text, index) => ({ index, text }));
}
