// src/channels/transformer.mjs
// Channel A (self-pool) and Channel B (disjoint-transformer) thin wrappers
// over scoreClaim with specific provider lists. (Salvo 2026 §12.2)

import { scoreClaim } from "./scorer.mjs";
import { CHANNEL_A, CHANNEL_B } from "./providers.mjs";

export async function scoreChannelA(claim) {
  return scoreClaim(claim, CHANNEL_A);
}

export async function scoreChannelB(claim) {
  return scoreClaim(claim, CHANNEL_B);
}
