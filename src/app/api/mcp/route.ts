// A small MCP server (streamable HTTP, stateless, JSON responses) that Otari
// connects to. Tools: domain age (RDAP), phishing list (OpenPhish), lookalike check.
import { compareDomains, domainAge, phishingList } from "@/lib/domains";

export const runtime = "nodejs";
export const maxDuration = 30;

const TOOLS = [
  {
    name: "domain_age",
    description: "How long ago a domain was registered, from public RDAP records. Brand-new domains are a common scam sign.",
    inputSchema: { type: "object", properties: { domain: { type: "string", description: "Domain or URL" } }, required: ["domain"] },
  },
  {
    name: "phishing_list",
    description: "Whether a URL or its host is on the OpenPhish community phishing feed.",
    inputSchema: { type: "object", properties: { url: { type: "string", description: "URL or domain" } }, required: ["url"] },
  },
  {
    name: "compare_domains",
    description: "Compare a link's domain with a company's official domain: same site, lookalike, or unrelated.",
    inputSchema: {
      type: "object",
      properties: { link: { type: "string" }, official_domain: { type: "string" } },
      required: ["link", "official_domain"],
    },
  },
];

async function callTool(name: string, args: any) {
  if (name === "domain_age") return domainAge(String(args?.domain ?? ""));
  if (name === "phishing_list") return phishingList(String(args?.url ?? ""));
  if (name === "compare_domains") return compareDomains(String(args?.link ?? ""), String(args?.official_domain ?? ""));
  throw new Error(`unknown tool ${name}`);
}

function authorized(req: Request) {
  const want = process.env.MCP_TOKEN;
  return !want || req.headers.get("authorization") === `Bearer ${want}`;
}

async function handle(msg: any) {
  const { id, method, params } = msg ?? {};
  if (method === "initialize") {
    return {
      jsonrpc: "2.0",
      id,
      result: {
        protocolVersion: params?.protocolVersion ?? "2025-03-26",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "second-look-evidence", version: "1.0.0" },
      },
    };
  }
  if (method === "tools/list") return { jsonrpc: "2.0", id, result: { tools: TOOLS } };
  if (method === "tools/call") {
    try {
      const out = await callTool(params?.name, params?.arguments);
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: JSON.stringify(out) }], structuredContent: out, isError: false } };
    } catch (e) {
      return { jsonrpc: "2.0", id, result: { content: [{ type: "text", text: (e as Error).message }], isError: true } };
    }
  }
  if (method === "ping") return { jsonrpc: "2.0", id, result: {} };
  if (id === undefined || id === null) return null; // notification
  return { jsonrpc: "2.0", id, error: { code: -32601, message: `Method not found: ${method}` } };
}

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ error: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => null);
  if (!body) return Response.json({ jsonrpc: "2.0", id: null, error: { code: -32700, message: "Parse error" } }, { status: 400 });
  if (Array.isArray(body)) {
    const out = (await Promise.all(body.map(handle))).filter(Boolean);
    return out.length ? Response.json(out) : new Response(null, { status: 202 });
  }
  const out = await handle(body);
  return out ? Response.json(out) : new Response(null, { status: 202 });
}

export async function GET() {
  return new Response("Method Not Allowed", { status: 405, headers: { Allow: "POST" } });
}

export async function DELETE() {
  return new Response(null, { status: 204 });
}
