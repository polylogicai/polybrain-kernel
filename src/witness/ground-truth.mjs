// src/witness/ground-truth.mjs
// Ground-truth primitive. (Salvo 2026, §7 witness primitive #2)
//
// Authoritative external source comparison:
//   - URL resolution (HTTP fetch, status check, optional content-hash match)
//   - File existence (local path reachable)
//   - Numeric citation check (§12.2 Channel C citation/URL resolver):
//     fetch the cited source and verify that the claim's numeric values
//     appear in the fetched text
//
// Deterministic (given a stable upstream response) and no LLM.

import { createHash } from "node:crypto";
import { access } from "node:fs/promises";

export async function groundTruth(claim, rules = {}) {
  const citation = claim?.citation_url || claim?.url || null;
  const localPath = claim?.localPath || null;
  const timeout = rules?.witness?.ground_truth?.timeout_ms ?? 10000;
  const maxBytes = rules?.witness?.ground_truth?.max_fetch_bytes ?? 1048576;

  // File existence path
  if (localPath) {
    try {
      await access(localPath);
      return { verdict: "PASS", detail: `file exists: ${localPath}` };
    } catch {
      return { verdict: "FAIL", detail: `file missing: ${localPath}` };
    }
  }

  if (!citation) {
    return { verdict: "PENDING", detail: "no citation url or local path" };
  }

  // URL resolution path
  try {
    const res = await fetch(citation, {
      signal: AbortSignal.timeout(timeout),
      redirect: "follow",
    });
    if (!res.ok) {
      return { verdict: "FAIL", detail: `HTTP ${res.status} on ${citation}` };
    }
    const body = await res.text();
    if (body.length > maxBytes) {
      return {
        verdict: "PENDING",
        detail: `response too large: ${body.length} > ${maxBytes} bytes`,
      };
    }
    const hash = createHash("sha256").update(body).digest("hex");

    // Expected content-hash match
    if (claim.expected_content_hash) {
      if (claim.expected_content_hash === hash) {
        return {
          verdict: "PASS",
          detail: `content hash match: ${hash.slice(0, 16)}`,
        };
      }
      return {
        verdict: "FAIL",
        detail: `content hash mismatch: ${hash.slice(0, 16)} vs expected ${claim.expected_content_hash.slice(0, 16)}`,
      };
    }

    // Numeric citation check: do the claim's cited numeric values appear
    // verbatim in the fetched source text?
    if (claim.cited_values) {
      const values = Array.isArray(claim.cited_values)
        ? claim.cited_values
        : [claim.cited_values];
      const missing = values.filter((v) => !body.includes(String(v)));
      if (missing.length > 0) {
        return {
          verdict: "FAIL",
          detail: `cited values not found in source: ${missing.slice(0, 3).join(", ")}`,
        };
      }
      return {
        verdict: "PASS",
        detail: `${values.length} cited values verified in source`,
      };
    }

    // Default: URL reachable, no further check demanded
    return {
      verdict: "PASS",
      detail: `url reachable, ${body.length} bytes, hash ${hash.slice(0, 16)}`,
    };
  } catch (e) {
    return {
      verdict: "FAIL",
      detail: `fetch error: ${e?.message || e}`,
    };
  }
}
