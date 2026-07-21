// Shared LLM client. Timeouts, minimal surface. No side effects.

export type LlmProvider = "openai" | "anthropic" | "groq";

export type LlmMessage = { role: "system" | "user" | "assistant"; content: string };

export type CompleteInput = {
  provider: string;
  model: string;
  apiKey: string;
  systemPrompt?: string;
  messages: LlmMessage[];
  maxTokens?: number;
  timeoutMs?: number;
};

export type CompleteOutput = { text: string; latency_ms: number };

const DEFAULT_TIMEOUT = 30_000;
const DEFAULT_MAX_TOKENS = 512;

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error(`Timeout após ${ms}ms`)), ms);
    p.then((v) => { clearTimeout(t); resolve(v); })
     .catch((e) => { clearTimeout(t); reject(e); });
  });
}

async function callOpenAI(apiKey: string, model: string, messages: LlmMessage[], maxTokens: number, timeoutMs: number) {
  const res = await withTimeout(fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  }), timeoutMs);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `OpenAI HTTP ${res.status}`);
  return data?.choices?.[0]?.message?.content ?? "";
}

async function callAnthropic(apiKey: string, model: string, systemPrompt: string | undefined, messages: LlmMessage[], maxTokens: number, timeoutMs: number) {
  const body: any = {
    model,
    max_tokens: maxTokens,
    messages: messages
      .filter((m) => m.role !== "system")
      .map((m) => ({ role: m.role, content: m.content })),
  };
  if (systemPrompt) body.system = systemPrompt;
  const res = await withTimeout(fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  }), timeoutMs);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Anthropic HTTP ${res.status}`);
  const parts = data?.content ?? [];
  return parts.map((p: any) => p?.text ?? "").join("");
}

async function callGroq(apiKey: string, model: string, messages: LlmMessage[], maxTokens: number, timeoutMs: number) {
  const res = await withTimeout(fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({ model, messages, max_tokens: maxTokens }),
  }), timeoutMs);
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message || `Groq HTTP ${res.status}`);
  return data?.choices?.[0]?.message?.content ?? "";
}

export async function complete(input: CompleteInput): Promise<CompleteOutput> {
  const provider = (input.provider || "").toLowerCase() as LlmProvider;
  const maxTokens = input.maxTokens ?? DEFAULT_MAX_TOKENS;
  const timeoutMs = input.timeoutMs ?? DEFAULT_TIMEOUT;
  const started = Date.now();

  // Sanitize apiKey: must be ASCII/ByteString-safe for HTTP headers.
  // Vault/user paste can leave newlines, NBSPs or accidental unicode.
  const rawKey = (input.apiKey || "").replace(/[\r\n\t]/g, "").trim();
  // eslint-disable-next-line no-control-regex
  const apiKey = rawKey.replace(/[^\x20-\x7E]/g, "");
  if (!apiKey) throw new Error("Chave de API inválida ou vazia");

  const msgs: LlmMessage[] = input.systemPrompt && provider !== "anthropic"
    ? [{ role: "system", content: input.systemPrompt }, ...input.messages]
    : [...input.messages];

  let text = "";
  if (provider === "openai") {
    text = await callOpenAI(apiKey, input.model, msgs, maxTokens, timeoutMs);
  } else if (provider === "anthropic") {
    text = await callAnthropic(apiKey, input.model, input.systemPrompt, input.messages, maxTokens, timeoutMs);
  } else if (provider === "groq") {
    text = await callGroq(apiKey, input.model, msgs, maxTokens, timeoutMs);
  } else {
    throw new Error(`Provider desconhecido: ${provider}`);
  }
  return { text, latency_ms: Date.now() - started };
}
