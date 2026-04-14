// src/experiment/seed.mjs
// Deterministic seed derivation. (Salvo 2026 Appendix C.8)
//
//   sample_seed = SHA256(commit_hash || "sample-papers")
//   order_bit(paper) = SHA256(commit_hash || paper.id || "order")[0] mod 2
//
// The commit hash is `git rev-parse HEAD` at the preregistration moment.
// These formulas are preregistered and cannot change between preregistration
// and analysis without breaking the rigor chain.

import { createHash } from "node:crypto";

export function deriveSampleSeed(commitHash) {
  return createHash("sha256").update(`${commitHash}sample-papers`).digest("hex");
}

export function deriveOrderBit(commitHash, paperId) {
  const hex = createHash("sha256")
    .update(`${commitHash}${paperId}order`)
    .digest("hex");
  return parseInt(hex.slice(0, 2), 16) % 2; // 0 = A-then-B, 1 = B-then-A
}

// xorshift128+ PRNG seeded from the first 16 bytes of a hex string.
// Used by sampler.mjs to deterministically shuffle the stratified pools.
export function seededRng(hexSeed) {
  const bytes = Buffer.from(hexSeed, "hex");
  let s0 = bytes.readBigUInt64LE(0);
  let s1 = bytes.readBigUInt64LE(8);
  return function () {
    let x = s0;
    const y = s1;
    s0 = y;
    x ^= x << 23n;
    s1 = x ^ y ^ (x >> 17n) ^ (y >> 26n);
    const combined = (s1 + y) & 0xffffffffffffffffn;
    return Number(combined >> 11n) / 2 ** 53;
  };
}
