// src/channels/scorer.mjs
// Multi-model scorer. Dispatches a claim to a list of providers in parallel,
// collects per-model responses, parses dimensions, computes composite per
// model, returns aggregated composite + full per-model breakdown.

import { WIRE } from "./wire.mjs";
import {
  buildMessages,
  parseScoresFromText,
  compositeFromDimensions,
} from "./rubric.mjs";

async function scoreOneModel(provider, claim) {
  const key = process.env[provider.key_env];
  if (!key) {
    return {
      provider: provider.provider,
      model: provider.model,
      error: `missing env ${provider.key_env}`,
      dimensions: null,
      composite: null,
      usage: null,
    };
  }
  try {
    const wire = WIRE[provider.wire];
    if (!wire) throw new Error(`unknown wire ${provider.wire}`);
    const messages = buildMessages(claim);
    const response = await wire({
      base_url: provider.base_url,
      model: provider.model,
      key,
      messages,
      temperature: 0,
    });
    const dimensions = parseScoresFromText(response.text);
    if (!dimensions) {
      return {
        provider: provider.provider,
        model: provider.model,
        error: "score parse failed",
        raw_preview: (response.text || "").slice(0, 200),
        dimensions: null,
        composite: null,
        usage: response.usage,
      };
    }
    const composite = compositeFromDimensions(dimensions);
    return {
      provider: provider.provider,
      model: provider.model,
      dimensions,
      composite,
      usage: response.usage,
    };
  } catch (e) {
    return {
      provider: provider.provider,
      model: provider.model,
      error: String(e?.message || e),
      dimensions: null,
      composite: null,
      usage: null,
    };
  }
}

export async function scoreClaim(claim, providerList) {
  const results = await Promise.all(
    providerList.map((p) => scoreOneModel(p, claim)),
  );
  const valid = results.filter((r) => r.composite !== null);
  if (valid.length === 0) {
    return {
      composite: null,
      valid_count: 0,
      total_count: results.length,
      per_model: results,
    };
  }
  const meanComposite =
    valid.reduce((s, r) => s + r.composite, 0) / valid.length;
  return {
    composite: meanComposite,
    valid_count: valid.length,
    total_count: results.length,
    per_model: results,
  };
}
