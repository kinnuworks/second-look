# Second Look

**Paste a message you're not sure about, and open-weight models on Otari tell you in plain words whether it's a scam, with the evidence. Every visitor gets their own free daily Otari budget.**

It runs on open-weight models through [Otari](https://otari.ai), Mozilla.ai's open-source AI gateway, which gives those models the web search, link fetching, guardrails, code sandbox and per-visitor budgets that a scam check needs.

![Second Look checking a live Amazon lookalike page from the OpenPhish feed; the receipt shows what Otari charged and the meter drops](docs/second-look.gif)

**Live:** https://second-look-phi.vercel.app (no account needed)

**Try it in 30 seconds**
1. Open the live site.
2. Click **Check a real scam link from today**. It takes a phishing link reported today on the OpenPhish feed whose page still loads, and checks it. In about half a minute you get a verdict, the reasons, and what Otari charged your allowance.
3. Tap **Test: page with hidden AI instructions**. Otari's guardrail blocks the linked page before any model reads it, and the step shows the safety model's reason.
4. Turn on **Fallback drill** and run any example: the reading step starts on a model that refuses JSON mode, and Otari falls back on attempt 2.
5. Watch **Your allowance today** at the top of the tool. It is your Otari end-user budget (15 cents a day), read back from Otari. After each check the receipt shows what Otari charged and the meter drops. Pick **Quick check** to skip web search and spend about a third as much; when the allowance runs low the tool switches to quick checks by itself.
6. Turn on **Budget drill**: the check runs as a visitor whose budget is too small for any request, and Otari's refusal is shown word for word.
7. Scroll to **Shows its work** for every Otari request behind the answer: model, provider, fallback, guardrail verdict, tools run, cost and request id.

---

## Rubric features, with the code that uses them

| Rubric item | How Second Look uses it | Code |
|---|---|---|
| Open-weight models | Qwen3 235B, Gemma 3 27B, gpt-oss-120b and gpt-oss-safeguard-120b; no frontier API anywhere | [`src/lib/pipeline.ts#L7`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L7-L12) · [`src/lib/guard.ts#L10`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/guard.ts#L10) |
| Two or more open-weight models for different purposes | Reader/researcher, fallback, verdict writer, guardrail judge | [`src/lib/pipeline.ts#L7`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L7-L12) |
| Model routing and fallbacks | `sl-reader` policy (Qwen3 on DeepInfra, Gemma 3 on Nebius) for every check; `sl-drill` policy behind the Fallback drill; `Otari-Fallback` and `Otari-Attempt-Count` read per request | [`src/lib/pipeline.ts#L102`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L102) · [`src/lib/otari.ts#L93`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/otari.ts#L93) |
| MCP integrations | Our MCP server (`domain_age`, `phishing_list`, `compare_domains`) stored in the workspace and called via `mcp_server_ids` | [`src/lib/pipeline.ts#L156`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L156) · [`src/app/api/mcp/route.ts#L69`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/app/api/mcp/route.ts#L69) |
| Web search or web fetch | `otari_web_search` finds the official site and its scam page; `POST /api/v1/fetch` opens the link | [`src/lib/pipeline.ts#L155`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L155) · [`src/lib/pipeline.ts#L228`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L228) |
| Code execution | The red-flag score runs as Python via `POST /api/v1/code/execute`; the page shows the code and its output | [`src/lib/pipeline.ts#L304`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L304) · [`src/lib/score.ts`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/score.ts) |
| Budgets and spending limits | An organisation spend ceiling caps the whole demo per month | Otari dashboard (Spend & budgets) |
| Multiple models serving distinct roles | Four roles, each a different model | [`src/lib/pipeline.ts#L7`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L7-L12) |
| Guardrails | Request-level `guardrails`: monitor mode on the pasted text, block mode on the fetched page; our `/validate` service asks gpt-oss-safeguard-120b | [`src/lib/pipeline.ts#L105`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L105) · [`src/lib/pipeline.ts#L248`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L248) · [`src/lib/guard.ts`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/guard.ts) |
| Per-user budgets | Each visitor is an Otari end user on a service key with a daily budget (`user` + `Otari-End-User-Budget`). The budget sets how deep a check goes: a full check runs web search, and below about 4 cents left it drops to a quick check. The page shows the allowance and what each check took, read back from Otari. The Budget drill shows a refusal | [`src/lib/allowance.ts`](src/lib/allowance.ts) · [`src/lib/otari.ts#L61`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/otari.ts#L61-L67) · [`src/lib/pipeline.ts#L87`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/lib/pipeline.ts#L87) · [`src/app/api/budget/route.ts`](https://github.com/kinnuworks/second-look/blob/7ec8d8a07ac6cbe15cb5ca17a8f5b9d86633ee45/src/app/api/budget/route.ts) |

## What happens in one check

| Step | What it does | Otari feature |
|---|---|---|
| Mask | Names and account or card numbers are masked on our server before anything is sent. Links and phone numbers stay, because they're the evidence. Nothing is kept by us; the message passes through Otari and the model providers it routes to. | – |
| Read | Qwen3 235B pulls out who the message claims to be from, what it asks, the links and any pressure. The pasted text is screened by our guardrail in monitor mode, since scam text is manipulative by nature and must not be blocked. | Routing policy `sl-reader` (Qwen3 on DeepInfra, Gemma 3 27B on Nebius as fallback) · guardrail (monitor) |
| Research | Qwen3 searches for the company's official site and its scam-warning page, then calls our MCP server: `domain_age` (RDAP), `phishing_list` (OpenPhish community feed) and `compare_domains` (lookalike check). | `otari_web_search` · MCP (stored server, `mcp_server_ids`) |
| Open the link | The link is fetched on the server, never on the user's device. | `POST /api/v1/fetch` |
| Read the page | The fetched page goes to Qwen3 behind a request-level guardrail in block mode. If the page hides instructions for AI readers, Otari refuses the request with a 403 and that becomes evidence. | guardrail (block), our validator service via `url`; gpt-oss-safeguard-120b decides against a written prompt-injection policy |
| Score | A fixed red-flag formula runs as Python in Otari's sandbox. The page shows the sum. | `POST /api/v1/code/execute` |
| Answer | gpt-oss-120b writes a short verdict and what to do, using only the evidence. | second open model in a distinct role |
| Budgets | Each visitor is an Otari end user on a service key with a daily budget; an organisation ceiling caps the whole demo per month. | per-user budgets · budgets and spending limits |

Research and the link fetch run in parallel. A full check takes about 35 seconds. In our test runs a full check cost Otari $0.031 to $0.042 (more when the link opens a live page) and a quick check (no web search) about $0.010.

### The models

| Role | Model | Provider via Otari |
|---|---|---|
| Reads the message, researches, reads the page | `alibaba/qwen3-235b-a22b-instruct-2507` | DeepInfra |
| Fallback in the `sl-reader` policy | `google/gemma-3-27b-it` | Nebius |
| Writes the answer | `openai/gpt-oss-120b` | DeepInfra |
| Guardrail check inside our validator | `openai/gpt-oss-safeguard-120b` | Amazon Bedrock |
| Broken first model in the `sl-drill` fallback drill (refuses JSON mode) | `alibaba/qwen3guard-gen-8b` | OVHcloud |

All of them are open-weight. There is no frontier API anywhere in the loop.

## Tests

```bash
npm test
```

Unit tests cover masking, domain comparison, link finding and the score formula (no network).

## Run it yourself

```bash
git clone https://github.com/kinnuworks/second-look && cd second-look
git checkout otari-devs-wilding
npm install
cp .env.example .env.local   # then fill in the values
npm run dev
```

You need, in the Otari dashboard: web access allowed for the workspace, a daily end-user budget, a service key that allows it, a routing policy (or set `EXTRACT_MODEL` to a model id), and the MCP server at `<your deployment>/api/mcp` stored under Tools → MCP servers. The guardrail and MCP endpoints must be public HTTPS for Otari to reach them, so test those on a deployment, not on localhost.

## Code map

- `src/lib/pipeline.ts`: the check, step by step
- `src/lib/otari.ts`: Otari calls; reads `Otari-Request-ID`, `Otari-Provider`, `Otari-Fallback`, `Otari-Guardrails` and `usage.cost_usd` on the server (browsers can't read `Otari-*` headers, mozilla-ai/otari#3016)
- `src/app/api/mcp/route.ts`: the MCP server (streamable HTTP, JSON responses)
- `src/app/api/guard/validate/route.ts` and `src/lib/guard.ts`: the guardrail service Otari calls (`POST /validate`)
- `src/lib/score.ts`: the red-flag formula
- `src/app/test/limited-account/page.tsx`: the test page with hidden instructions

## Limits

- It works from public evidence. Brand-new scam domains are often not on phishing lists yet, and a small company with little web presence can look suspicious.
- Scam links are often taken down within hours, so the made-up sample links are dead. The live-link button picks a page from today's OpenPhish feed that still loads, so you can watch the fetch and guardrail steps on a real scam page.
- The examples cover UK and US scams.

## Licence

MPL-2.0.

## Hackathon

Built for MozFest Developers Wilding: Online (Mozilla.ai). Hackathon branch: `otari-devs-wilding`.
