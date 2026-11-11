// Every model and tool call goes through Otari. Responses carry Otari-* headers
// (request id, provider, fallback, guardrail verdict) that browsers can't read
// (CORS), so we read them here, on the server, and pass them to the page.

export const OTARI_BASE = process.env.OTARI_BASE_URL ?? "https://api.otari.ai/api/v1";

export type Proof = {
  step: string;
  endpoint: string;
  model?: string;
  requestId?: string | null;
  provider?: string | null;
  servedModel?: string | null;
  attempts?: string | null;
  fallback?: string | null;
  guardrails?: unknown;
  endUserBudget?: string | null;
  costUsd?: number | null;
  ms: number;
  status: number;
  tools?: string[];
};

export class OtariError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
    public proof: Proof,
  ) {
    super(message);
  }
}

function key(): string {
  const k = process.env.OTARI_SERVICE_KEY ?? process.env.OTARI_API_KEY;
  if (!k) throw new Error("OTARI_SERVICE_KEY is not set");
  return k;
}

function parseJsonHeader(v: string | null): unknown {
  if (!v) return null;
  try {
    return JSON.parse(v);
  } catch {
    return v;
  }
}

async function post(
  step: string,
  path: string,
  body: Record<string, unknown>,
  visitor: string | null,
): Promise<{ json: any; proof: Proof }> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${key()}`,
    "Content-Type": "application/json",
  };
  if (visitor && process.env.OTARI_END_USER_BUDGET_ID) {
    // Puts a new visitor on the demo's per-visitor budget.
    headers["Otari-End-User-Budget"] = process.env.OTARI_END_USER_BUDGET_ID;
  }
  const t0 = Date.now();
  const res = await fetch(`${OTARI_BASE}${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(visitor ? { ...body, user: visitor } : body),
  });
  const ms = Date.now() - t0;
  const text = await res.text();
  let json: any = null;
  try {
    json = JSON.parse(text);
  } catch {
    json = { raw: text };
  }
  const h = res.headers;
  const proof: Proof = {
    step,
    endpoint: path,
    model: typeof body.model === "string" ? body.model : undefined,
    requestId: h.get("otari-request-id"),
    provider: h.get("otari-provider"),
    servedModel: h.get("otari-model"),
    attempts: h.get("otari-attempt-count"),
    fallback: h.get("otari-fallback"),
    guardrails: parseJsonHeader(h.get("otari-guardrails")),
    endUserBudget: h.get("otari-end-user-budget"),
    costUsd: (() => {
      const c = json?.usage?.cost_usd ?? json?.cost_usd ?? null;
      return c == null ? null : Number(c);
    })(),
    ms,
    status: res.status,
  };
  if (!res.ok) {
    const err = json?.error ?? json?.detail ?? json;
    const code =
      (typeof err === "object" && (err?.code || err?.type)) ||
      (typeof json?.detail === "object" && json.detail?.code) ||
      `http_${res.status}`;
    const msg =
      (typeof err === "object" && err?.message) ||
      (typeof err === "string" ? err : JSON.stringify(err)).slice(0, 400);
    throw new OtariError(res.status, String(code), String(msg), proof);
  }
  return { json, proof };
}

export type ChatOpts = {
  step: string;
  model: string;
  messages: { role: "system" | "user" | "assistant"; content: string }[];
  visitor: string | null;
  tools?: Record<string, unknown>[];
  mcpServers?: Record<string, unknown>[];
  guardrails?: Record<string, unknown>[];
  json?: boolean;
  maxTokens?: number;
  extra?: Record<string, unknown>;
};

export async function chat(o: ChatOpts) {
  const body: Record<string, unknown> = {
    model: o.model,
    messages: o.messages,
    temperature: 0,
    max_tokens: o.maxTokens ?? 1200,
    ...(o.tools ? { tools: o.tools } : {}),
    ...(o.mcpServers ? { mcp_servers: o.mcpServers } : {}),
    ...(o.guardrails ? { guardrails: o.guardrails } : {}),
    ...(o.json ? { response_format: { type: "json_object" } } : {}),
    ...(o.extra ?? {}),
  };
  const { json, proof } = await post(o.step, "/chat/completions", body, o.visitor);
  const content: string = json?.choices?.[0]?.message?.content ?? "";
  const toolCalls: any[] = json?.otari_tool_calls ?? [];
  proof.tools = toolCalls.map((c) => (c?.type === "mcp" ? `mcp:${c?.name}` : (c?.type ?? "tool")));
  return { content, toolCalls, proof, raw: json };
}

export async function directFetch(step: string, url: string, visitor: string | null) {
  return post(step, "/fetch", { url }, visitor);
}

export async function codeExecute(step: string, code: string, visitor: string | null) {
  return post(step, "/code/execute", { code }, visitor);
}

// Pull the first JSON object out of a model reply.
export function parseJson<T = any>(s: string): T | null {
  const start = s.indexOf("{");
  const end = s.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(s.slice(start, end + 1));
  } catch {
    return null;
  }
}
