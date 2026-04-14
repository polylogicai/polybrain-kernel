// src/canon.mjs
// Append-only JSONL canon with SHA-256 per-row Merkle chain.
//
// Each row is an object with exactly six fields:
//   { row_index, ts, type, payload, prev_hash, row_hash }
//
// row_hash = SHA-256 of the canonical JSON of the first five fields.
// Each row's prev_hash = the previous row's row_hash (null for row 0).
// Tampering with any row breaks the chain and is detected by verifyChain().
//
// This is the Level 2 object of §3.1 — the agent's commitments. It is the
// only persistent mutable state of the kernel, and mutation is restricted
// to append. Deleting the canon deletes the agent.

import { createHash } from "node:crypto";
import { appendFile, readFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";

function hashRow({ row_index, ts, type, payload, prev_hash }) {
  const canonical = JSON.stringify({ row_index, ts, type, payload, prev_hash });
  return createHash("sha256").update(canonical).digest("hex");
}

export async function openCanon(path) {
  await mkdir(dirname(path), { recursive: true });
  let rows = [];
  try {
    const data = await readFile(path, "utf-8");
    rows = data
      .split("\n")
      .filter((l) => l.trim())
      .map((l) => JSON.parse(l));
  } catch (e) {
    if (e.code !== "ENOENT") throw e;
  }

  async function append(type, payload) {
    const row_index = rows.length;
    const ts = new Date().toISOString();
    const prev_hash = rows.length === 0 ? null : rows[rows.length - 1].row_hash;
    const row_hash = hashRow({ row_index, ts, type, payload, prev_hash });
    const row = { row_index, ts, type, payload, prev_hash, row_hash };
    rows.push(row);
    await appendFile(path, JSON.stringify(row) + "\n");
    return row;
  }

  function verifyChain() {
    let expected_prev = null;
    for (let i = 0; i < rows.length; i++) {
      const r = rows[i];
      if (r.row_index !== i) {
        return { ok: false, broken_at: i, reason: "row_index mismatch" };
      }
      if (r.prev_hash !== expected_prev) {
        return { ok: false, broken_at: i, reason: "prev_hash mismatch" };
      }
      const expected = hashRow({
        row_index: r.row_index,
        ts: r.ts,
        type: r.type,
        payload: r.payload,
        prev_hash: r.prev_hash,
      });
      if (r.row_hash !== expected) {
        return { ok: false, broken_at: i, reason: "row_hash mismatch" };
      }
      expected_prev = r.row_hash;
    }
    return { ok: true, row_count: rows.length };
  }

  function all() {
    return rows.slice();
  }

  function byType(type) {
    return rows.filter((r) => r.type === type);
  }

  function length() {
    return rows.length;
  }

  function head() {
    return rows[rows.length - 1] || null;
  }

  return { append, verifyChain, all, byType, length, head };
}
