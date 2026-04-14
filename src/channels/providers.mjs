// src/channels/providers.mjs
// Channel A (self-pool) and Channel B (disjoint-transformer) provider tables
// for the RCC-n30 experiment. (Salvo 2026 §12.2)

export const CHANNEL_A = [
  { provider: "openai",   model: "gpt-4.1-mini",                           wire: "openai_compat", base_url: "https://api.openai.com/v1",       key_env: "OPENAI_API_KEY" },
  { provider: "openai",   model: "gpt-4.1-nano",                           wire: "openai_compat", base_url: "https://api.openai.com/v1",       key_env: "OPENAI_API_KEY" },
  { provider: "xai",      model: "grok-3-mini",                            wire: "openai_compat", base_url: "https://api.x.ai/v1",             key_env: "XAI_API_KEY" },
  { provider: "xai",      model: "grok-4-fast",                            wire: "openai_compat", base_url: "https://api.x.ai/v1",             key_env: "XAI_API_KEY" },
  { provider: "groq",     model: "qwen/qwen3-32b",                         wire: "openai_compat", base_url: "https://api.groq.com/openai/v1",  key_env: "GROQ_API_KEY" },
  { provider: "groq",     model: "openai/gpt-oss-120b",                    wire: "openai_compat", base_url: "https://api.groq.com/openai/v1",  key_env: "GROQ_API_KEY" },
  { provider: "groq",     model: "meta-llama/llama-4-scout-17b-16e-instruct", wire: "openai_compat", base_url: "https://api.groq.com/openai/v1", key_env: "GROQ_API_KEY" },
  { provider: "groq",     model: "llama-3.3-70b-versatile",                wire: "openai_compat", base_url: "https://api.groq.com/openai/v1",  key_env: "GROQ_API_KEY" },
  { provider: "moonshot", model: "moonshotai/kimi-k2-instruct",            wire: "openai_compat", base_url: "https://api.groq.com/openai/v1",  key_env: "GROQ_API_KEY" },
];

// Channel B: 2-2-2-1-1-1 across six disjoint-training-substrate providers.
// Anthropic uses Sonnet 4.6 + Haiku 4.5 (cheap pair per budget decision).
export const CHANNEL_B = [
  { provider: "anthropic", model: "claude-sonnet-4-5",           wire: "anthropic_messages", base_url: "https://api.anthropic.com/v1", key_env: "POLYBRAIN_ANTHROPIC_KEY" },
  { provider: "anthropic", model: "claude-haiku-4-5-20251001",   wire: "anthropic_messages", base_url: "https://api.anthropic.com/v1", key_env: "POLYBRAIN_ANTHROPIC_KEY" },
  { provider: "google",    model: "gemini-2.5-pro",             wire: "gemini_generate",    base_url: "https://generativelanguage.googleapis.com/v1beta", key_env: "GEMINI_API_KEY" },
  { provider: "google",    model: "gemini-2.5-flash",           wire: "gemini_generate",    base_url: "https://generativelanguage.googleapis.com/v1beta", key_env: "GEMINI_API_KEY" },
  { provider: "deepseek",  model: "deepseek-chat",              wire: "openai_compat",      base_url: "https://api.deepseek.com/v1", key_env: "DEEPSEEK_API_KEY" },
  { provider: "deepseek",  model: "deepseek-reasoner",          wire: "openai_compat",      base_url: "https://api.deepseek.com/v1", key_env: "DEEPSEEK_API_KEY" },
  { provider: "mistral",   model: "mistral-large-latest",       wire: "openai_compat",      base_url: "https://api.mistral.ai/v1",   key_env: "MISTRAL_API_KEY" },
  { provider: "cohere",    model: "command-a-03-2025",          wire: "openai_compat",      base_url: "https://api.cohere.com/compatibility/v1", key_env: "COHERE_API_KEY" },
  { provider: "alibaba",   model: "qwen-max",                   wire: "openai_compat",      base_url: "https://dashscope-intl.aliyuncs.com/compatible-mode/v1", key_env: "DASHSCOPE_API_KEY" },
];

// Load Channel A + Channel B keys from ~/polybrain/.env and ~/orchestrator/.env.
// This is the only place the kernel reads external env files.
export async function loadEnv() {
  const { readFile } = await import("node:fs/promises");
  const { join } = await import("node:path");
  const paths = [
    join(process.env.HOME, "polybrain", ".env"),
    join(process.env.HOME, "orchestrator", ".env"),
  ];
  for (const p of paths) {
    try {
      const txt = await readFile(p, "utf-8");
      for (const line of txt.split("\n")) {
        const m = line.match(/^([A-Z_][A-Z0-9_]*)=(.+)$/);
        if (m && !(m[1] in process.env)) {
          process.env[m[1]] = m[2].replace(/^["']|["']$/g, "").trim();
        }
      }
    } catch (e) {
      if (e.code !== "ENOENT") {
        console.error(`env load warning ${p}: ${e.message}`);
      }
    }
  }
}
