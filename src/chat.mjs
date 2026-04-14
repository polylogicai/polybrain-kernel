#!/usr/bin/env node
// src/chat.mjs
// Polybrain kernel consumer chat surface.
//
// Ports the design language of the private Polybrain Chatbot reference
// (ai.polylogic.polybrain-dashboard at /loop) into the public kernel,
// written fresh from the canonical design spec in
// `~/orchestrator/company/initiatives/020-polybrain-chatbot-reference/
//  CHECKPOINT.md` without byte-copying the private code.
//
// Routes:
//   GET  /                 → public/chat.html (the "Own your AI." surface)
//   POST /api/chat         → SSE stream of witness events + assistant reply
//   GET  /api/counters     → { things_i_remember, held_up } for the header strip
//   GET  /api/identity     → loaded identity.yaml (name, greeting, tagline)
//
// Design principles from the reference:
//   - Chat is the top-level human surface
//   - Input at the bottom, message stream above
//   - Witness stack events streamed inline per turn
//   - Dispute is conversational (button inside the assistant bubble),
//     not a floating dashboard affordance
//   - The Fibonacci sphere is an embeddable artifact, not the front door
//
// Default port 4851 (distinct from dashboard 4849 and publisher 4850).

import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { openCanon } from "./canon.mjs";
import { verifyClaim } from "./witness/index.mjs";
import { loadRules } from "./rules.mjs";
import { loadEnv, CHANNEL_A } from "./channels/providers.mjs";
import { WIRE } from "./channels/wire.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const PUBLIC_HTML = join(ROOT, "public", "chat.html");
const RULES_DIR = join(ROOT, "rules");
const DEFAULT_CANON = join(ROOT, "canon", "default.jsonl");
const PORT = Number(process.env.POLYBRAIN_CHAT_PORT || 4851);

function pickResponder() {
  // Prefer gpt-4.1-nano (cheapest paid), fall back to any available channel-A model
  const preferred =
    CHANNEL_A.find((p) => p.model === "gpt-4.1-nano") ||
    CHANNEL_A.find((p) => p.model === "llama-3.3-70b-versatile") ||
    CHANNEL_A[0];
  return preferred;
}

async function sseWrite(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

async function handleChat(req, res) {
  res.writeHead(200, {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    "Connection": "keep-alive",
    "X-Accel-Buffering": "no",
  });

  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", async () => {
    try {
      const payload = JSON.parse(body || "{}");
      const text = (payload.text || "").trim();
      if (!text) {
        await sseWrite(res, "error", { message: "empty input" });
        res.end();
        return;
      }

      const canonPath = process.env.POLYBRAIN_CANON_PATH || DEFAULT_CANON;
      const rules = await loadRules(RULES_DIR);
      const canon = await openCanon(canonPath);

      // 1. Commit the user's turn to the canon
      const userRow = await canon.append("user_turn", { text });
      await sseWrite(res, "user_committed", {
        row_index: userRow.row_index,
        row_hash: userRow.row_hash.slice(0, 16),
        text,
      });

      // 2. Run the §7 witness stack on the user's claim
      await sseWrite(res, "witness_start", {});
      const claim = { text, substrateText: text };
      const witness = await verifyClaim(claim, rules);
      await sseWrite(res, "witness_result", {
        verdict: witness.verdict,
        primitives: Object.fromEntries(
          Object.entries(witness.primitives || {}).map(([k, v]) => [
            k,
            { verdict: v?.verdict, detail: v?.detail },
          ]),
        ),
      });

      // 3. Dispatch to the responder LLM (Channel A's cheapest by default)
      const responder = pickResponder();
      await sseWrite(res, "responder_start", {
        model: responder.model,
        provider: responder.provider,
      });
      const key = process.env[responder.key_env];
      if (!key) {
        await sseWrite(res, "error", {
          message: `missing env var ${responder.key_env}`,
        });
        res.end();
        return;
      }

      const identity = rules?.identity || {};
      const systemPrompt = `You are ${identity.name || "Polybrain"}, running on the user's own machine. Your witness stack just evaluated the user's input and returned verdict: ${witness.verdict}. Respond briefly, honestly, and note the verdict when it is relevant to your answer. Never pretend to be a chat bot that lives on someone else's server. You are local, user-owned, and append-only to their canon.`;

      const response = await WIRE[responder.wire]({
        base_url: responder.base_url,
        model: responder.model,
        key,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: text },
        ],
        temperature: 0,
      });

      await sseWrite(res, "responder_result", {
        text: response.text || "",
        usage: response.usage || {},
        model: responder.model,
      });

      // 4. Commit the assistant's turn to the canon
      const assistantRow = await canon.append("assistant_turn", {
        text: response.text || "",
        model: responder.model,
        witness_verdict: witness.verdict,
      });
      await sseWrite(res, "assistant_committed", {
        row_index: assistantRow.row_index,
        row_hash: assistantRow.row_hash.slice(0, 16),
        verdict: witness.verdict,
      });

      await sseWrite(res, "done", {
        total_rows: canon.length(),
      });
      res.end();
    } catch (e) {
      try {
        await sseWrite(res, "error", {
          message: String(e?.message || e),
        });
      } catch {}
      res.end();
    }
  });
}

async function handleCounters(res) {
  try {
    const canonPath = process.env.POLYBRAIN_CANON_PATH || DEFAULT_CANON;
    const canon = await openCanon(canonPath);
    const rows = canon.all();
    const things_i_remember = rows.length;
    const held_up = rows.filter(
      (r) =>
        (r.type === "verdict" ||
          r.type === "witness_result" ||
          r.type === "assistant_turn") &&
        (r.payload?.verdict === "PENDING" ||
          r.payload?.witness_verdict === "PENDING"),
    ).length;
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify({ things_i_remember, held_up }));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
}

async function handleIdentity(res) {
  try {
    const rules = await loadRules(RULES_DIR);
    res.writeHead(200, {
      "Content-Type": "application/json",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(rules?.identity || {}));
  } catch (e) {
    res.writeHead(500, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: String(e?.message || e) }));
  }
}

const server = createServer(async (req, res) => {
  try {
    if (req.url === "/" || req.url === "/chat.html" || req.url === "/index.html") {
      const html = await readFile(PUBLIC_HTML);
      res.writeHead(200, {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
      });
      res.end(html);
      return;
    }
    if (req.url === "/api/chat" && req.method === "POST") {
      await handleChat(req, res);
      return;
    }
    if (req.url === "/api/counters") {
      await handleCounters(res);
      return;
    }
    if (req.url === "/api/identity") {
      await handleIdentity(res);
      return;
    }
    res.writeHead(404);
    res.end();
  } catch (e) {
    res.writeHead(500);
    res.end(String(e?.message || e));
  }
});

if (import.meta.url === `file://${process.argv[1]}`) {
  await loadEnv();
  server.listen(PORT, "127.0.0.1", () => {
    console.log(`polybrain-kernel chat → http://localhost:${PORT}`);
  });
}

export { server, pickResponder };
