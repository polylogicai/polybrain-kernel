// src/channels/wire.mjs
// Three wire-format helpers for channel scorers:
//   openai_compat      — OpenAI chat completions shape (OpenAI, xAI, Groq,
//                        Moonshot-on-Groq, DeepSeek, Mistral, Cohere-compat,
//                        DashScope-compat)
//   anthropic_messages — Anthropic Messages API (Claude)
//   gemini_generate    — Google Generative Language generateContent API
//
// All three return a normalized shape:
//   { text, usage: { prompt_tokens, completion_tokens } }
//
// Retry profile: 3 attempts with exponential backoff (3s/6s/12s) on 429/503.
// Timeout: 60s default, 120s for Gemini (thinking model).

async function fetchWithRetry(url, options, maxRetries = 3) {
  let lastError;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(url, options);
      if (res.status === 429 || res.status === 503) {
        if (attempt < maxRetries - 1) {
          const delay = 3000 * Math.pow(2, attempt);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
      }
      return res;
    } catch (e) {
      lastError = e;
      if (attempt < maxRetries - 1) {
        const delay = 2000 * Math.pow(2, attempt);
        await new Promise((r) => setTimeout(r, delay));
      }
    }
  }
  if (lastError) throw lastError;
  throw new Error("max retries exceeded");
}

export async function callOpenAICompat({ base_url, model, key, messages, temperature = 0 }) {
  const res = await fetchWithRetry(`${base_url}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model,
      messages,
      temperature,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${model} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = json?.choices?.[0]?.message?.content ?? "";
  const usage = json?.usage || {};
  return {
    text,
    usage: {
      prompt_tokens: usage.prompt_tokens || 0,
      completion_tokens: usage.completion_tokens || 0,
    },
  };
}

export async function callAnthropicMessages({ base_url, model, key, messages, temperature = 0 }) {
  let system;
  const userMessages = [...messages];
  if (userMessages[0]?.role === "system") {
    system = userMessages.shift().content;
  }
  const res = await fetchWithRetry(`${base_url}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": key,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model,
      messages: userMessages,
      system,
      temperature,
      max_tokens: 2048,
    }),
    signal: AbortSignal.timeout(60000),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`${model} HTTP ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const text = (json?.content || []).map((b) => b?.text || "").join("");
  const usage = json?.usage || {};
  return {
    text,
    usage: {
      prompt_tokens: usage.input_tokens || 0,
      completion_tokens: usage.output_tokens || 0,
    },
  };
}

export async function callGeminiGenerate({ base_url, model, key, messages, temperature = 0 }) {
  const contents = [];
  let systemInstruction = null;
  for (const m of messages) {
    if (m.role === "system") {
      systemInstruction = { parts: [{ text: m.content }] };
    } else {
      contents.push({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content }],
      });
    }
  }
  const body = {
    contents,
    generationConfig: {
      temperature,
      maxOutputTokens: 8192,
    },
  };
  if (systemInstruction) body.systemInstruction = systemInstruction;

  const res = await fetchWithRetry(
    `${base_url}/models/${model}:generateContent?key=${key}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    },
  );
  if (!res.ok) {
    const err = await res.text().catch(() => "");
    throw new Error(`${model} HTTP ${res.status}: ${err.slice(0, 200)}`);
  }
  const json = await res.json();
  const candidate = json?.candidates?.[0];
  const parts = candidate?.content?.parts || [];
  const text = parts.map((p) => p?.text || "").join("");
  const usage = json?.usageMetadata || {};
  return {
    text,
    usage: {
      prompt_tokens: usage.promptTokenCount || 0,
      completion_tokens: usage.candidatesTokenCount || 0,
    },
  };
}

export const WIRE = {
  openai_compat: callOpenAICompat,
  anthropic_messages: callAnthropicMessages,
  gemini_generate: callGeminiGenerate,
};
