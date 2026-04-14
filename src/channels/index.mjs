// src/channels/index.mjs
// One-stop export surface for the experiment runner.

export { scoreClaim } from "./scorer.mjs";
export { scoreChannelA, scoreChannelB } from "./transformer.mjs";
export { scoreChannelC } from "./channel-c.mjs";
export { CHANNEL_A, CHANNEL_B, loadEnv } from "./providers.mjs";
export {
  COMPOSITE_WEIGHTS,
  compositeFromDimensions,
  parseScoresFromText,
  buildMessages,
} from "./rubric.mjs";
