#!/usr/bin/env node
// src/publisher.mjs
// The §8 four-predicate publisher.
//
// Serves a single consumer-facing view of the canon satisfying:
//   TOTAL         — every canon row appears as exactly one vertex (no
//                   pagination, no filter-out, no hiding)
//   BOUNDED       — the view fits a single viewport (no scroll, no nav)
//   NON-RANKING   — geometry encodes verdict class and time-alive; never
//                   priority, importance, or attention-worthiness
//   WRITE-CAPTURING — viewing events (focus, dwell, click, dispute) are
//                     appended to the canon as new substrate rows
//
// Implementation: Fibonacci-lattice projection of a sphere onto a 2D
// canvas. Each canon row is one point. Point color encodes verdict.
// Brightness encodes time-alive. Click handler POSTs to /api/event,
// which appends a write-capture row. Pure HTML+Canvas, no framework.
//
// Default port 4850. Override with POLYBRAIN_PUBLISHER_PORT.

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openCanon } from "./canon.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const DEFAULT_CANON = join(ROOT, "canon", "default.jsonl");
const PUBLIC_HTML = join(ROOT, "public", "publisher.html");
const PORT = Number(process.env.POLYBRAIN_PUBLISHER_PORT || 4850);

// Project a canon row onto a Fibonacci lattice point on the sphere.
// Returns { x, y, z } in [-1, 1]^3.
function fibonacciLatticePoint(i, n) {
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle
  const y = 1 - (i / Math.max(1, n - 1)) * 2;
  const radius = Math.sqrt(1 - y * y);
  const theta = phi * i;
  return { x: Math.cos(theta) * radius, y, z: Math.sin(theta) * radius };
}

// Map a row to a view vertex. TOTAL: every row gets a vertex.
// NON-RANKING: position depends only on row_index and total count, not
// on verdict or any ranking score.
function rowToVertex(row, index, total) {
  const p = fibonacciLatticePoint(index, total);
  const verdict = row.payload?.verdict || "PENDING";
  const ageSecs = Math.max(
    0,
    Math.floor((Date.now() - new Date(row.ts).getTime()) / 1000),
  );
  return {
    row_index: row.row_index,
    row_hash: row.row_hash,
    type: row.type,
    verdict,
    age_s: ageSecs,
    x: p.x,
    y: p.y,
    z: p.z,
  };
}

async function buildView(canonPath) {
  const canon = await openCanon(canonPath);
  const rows = canon.all();
  const total = rows.length;
  const vertices = rows.map((r, i) => rowToVertex(r, i, total));
  return { total, vertices };
}

async function writeCaptureEvent(canonPath, event) {
  const canon = await openCanon(canonPath);
  return canon.append("view_event", event);
}

function serve() {
  const server = createServer(async (req, res) => {
    const canonPath = process.env.POLYBRAIN_CANON_PATH || DEFAULT_CANON;
    try {
      if (req.url === "/" || req.url === "/publisher.html") {
        const html = await readFile(PUBLIC_HTML);
        res.writeHead(200, {
          "Content-Type": "text/html; charset=utf-8",
          "Cache-Control": "no-store",
        });
        res.end(html);
        return;
      }
      if (req.url === "/api/view") {
        const view = await buildView(canonPath);
        res.writeHead(200, {
          "Content-Type": "application/json",
          "Cache-Control": "no-store",
        });
        res.end(JSON.stringify(view));
        return;
      }
      if (req.url === "/api/event" && req.method === "POST") {
        let body = "";
        req.on("data", (c) => (body += c));
        req.on("end", async () => {
          try {
            const event = JSON.parse(body || "{}");
            const row = await writeCaptureEvent(canonPath, event);
            res.writeHead(200, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: true, row_index: row.row_index }));
          } catch (e) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ ok: false, error: String(e?.message || e) }));
          }
        });
        return;
      }
      res.writeHead(404);
      res.end();
    } catch (e) {
      res.writeHead(500);
      res.end(String(e?.message || e));
    }
  });
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`polybrain-kernel publisher → http://localhost:${PORT}`);
  });
  return server;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  serve();
}

export { serve, buildView, fibonacciLatticePoint };
