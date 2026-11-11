"use client";
import { useEffect, useRef, useState } from "react";
import { SAMPLES } from "@/lib/samples";

type Proof = {
  step: string;
  endpoint: string;
  model?: string;
  requestId?: string | null;
  provider?: string | null;
  servedModel?: string | null;
  attempts?: string | null;
  fallback?: string | null;
  guardrails?: any;
  costUsd?: number | null;
  ms: number;
  status: number;
  tools?: string[];
};
type Step = { id: string; status: string; label: string; detail?: string; data?: any; proof?: Proof };
type Band = "likely_scam" | "suspicious" | "looks_genuine";
type Verdict = {
  band: Band;
  score: number;
  fired: { flag: string; weight: number; label: string }[];
  scoredWhere: string;
  headline: string | null;
  why: string[];
  what_to_do: string[];
  official: { domain: string | null; scam_warning_url: string | null; scam_warning_summary: string | null };
};

const BAND_TEXT: Record<Band, string> = { likely_scam: "Likely scam", suspicious: "Be careful", looks_genuine: "Looks genuine" };

const STEP_FEATURE: Record<string, string> = {
  mask: "on our server, before anything is sent",
  extract: "Qwen3 235B · sl-reader routing policy · guardrail (monitor)",
  research: "Qwen3 235B · Otari web search · MCP: evidence server",
  fetch: "Otari web fetch",
  page: "Qwen3 235B · guardrail (block)",
  score: "Otari code execution sandbox",
  verdict: "gpt-oss-120b",
};

// A real result from the live site (parcel-fee sample, 11 Nov 2026), shown before the first check.
const EXAMPLE: { verdict: Verdict; steps: Step[]; proofs: Proof[] } = {
  verdict: {
    band: "likely_scam",
    score: 70,
    scoredWhere: "Otari sandbox",
    headline: "This is very likely a scam.",
    why: [
      "The link goes to royalmail-redelivery-uk.top, a look-alike of royalmail.com.",
      "royalmail-redelivery-uk.top has no registration record.",
      "The message demands a £1.45 payment within 24 hours.",
    ],
    what_to_do: ["Do not click the link.", "Do not send any money.", "Forward the text to 7726 to report the scam."],
    fired: [
      { flag: "link_lookalike", weight: 30, label: "Link imitates the company's real website" },
      { flag: "domain_unregistered", weight: 15, label: "Link's website has no registration record" },
      { flag: "asks_payment", weight: 15, label: "Asks you to pay" },
      { flag: "urgency", weight: 10, label: "Pressure: a deadline or threat" },
    ],
    official: {
      domain: "royalmail.com",
      scam_warning_url: "https://www.royalmail.com/help/scam-examples",
      scam_warning_summary: "Royal Mail will never ask you to pay a fee or provide personal information via a text message or email link.",
    },
  },
  steps: [],
  proofs: [
    { step: "extract", endpoint: "/chat/completions", servedModel: "Qwen/Qwen3-235B-A22B-Instruct-2507", provider: "deepinfra", fallback: "false", guardrails: [{ mode: "monitor", status: "evaluated", valid: true }], costUsd: 0.00009, ms: 4100, status: 200, requestId: "48797eb9-7037-4951-9857-82de2490d3b6" },
    { step: "fetch", endpoint: "/fetch", costUsd: null, ms: 200, status: 200, requestId: "52257288-7b89-4df8-9e96-d881de28cb0d" },
    { step: "research", endpoint: "/chat/completions", servedModel: "Qwen/Qwen3-235B-A22B-Instruct-2507", provider: "deepinfra", fallback: "false", tools: ["web_search", "web_search", "mcp:domain_age", "mcp:phishing_list", "mcp:compare_domains"], costUsd: 0.02124, ms: 11700, status: 200, requestId: "9c4fbbe4-a7e5-4c0e-bca0-801a0ea78070" },
    { step: "score", endpoint: "/code/execute", costUsd: null, ms: 1000, status: 200, requestId: "b1009df1-9cfe-412d-b5bb-2d0d034c2daf" },
    { step: "verdict", endpoint: "/chat/completions", servedModel: "openai/gpt-oss-120b", provider: "deepinfra", fallback: "false", costUsd: 0.00012, ms: 17700, status: 200, requestId: "a0b9ea1c-d229-4a82-a0ae-6f54770d98bd" },
  ],
};
const EXAMPLE_TEXT = SAMPLES[0].text;

const I = {
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>,
  dash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M7 12h10" /></svg>,
  warn: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeLinecap="round"><path d="M12 7v6M12 17h.01" /></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="4" y="11" width="16" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4" /></svg>,
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7" /><path d="M20 20l-3.5-3.5" /></svg>,
  calendar: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M16 3v4M8 3v4M3 10h18" /></svg>,
  page: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h4" /></svg>,
  calc: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M8 7h8M8 12h.01M12 12h.01M16 12h.01M8 16h.01M12 16h.01M16 16h.01" /></svg>,
  chat: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12z" /></svg>,
  gauge: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round"><path d="M12 14l3-3" /><path d="M3.5 18a9 9 0 1 1 17 0" /></svg>,
};

function money(n?: number | null) {
  if (n == null || Number.isNaN(n)) return "–";
  return `$${n < 0.001 ? n.toFixed(5) : n.toFixed(4)}`;
}

function ProofTable({ proofs, example }: { proofs: Proof[]; example: boolean }) {
  const total = proofs.reduce((a, p) => a + (p.costUsd ?? 0), 0);
  const secs = proofs.reduce((a, p) => a + p.ms, 0) / 1000;
  return (
    <div className="proof">
      <div className="proof__head">
        <div>
          <div className="t-title">{example ? "Example: the calls behind the result above" : "The calls behind your answer"}</div>
          <div className="t-micro">{proofs.length} requests through Otari · {money(total)} · {secs.toFixed(1)}s of model and tool time</div>
        </div>
        <span className="chip chip--soft">Read from Otari&apos;s response headers on our server</span>
      </div>
      <div className="proof__scroll">
        <table>
          <thead>
            <tr>{["Step", "Model or endpoint", "Provider", "Fallback used", "Guardrail", "Tools run by Otari", "Cost", "Time", "Otari request id"].map((h) => <th key={h}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {proofs.map((p, i) => (
              <tr key={i}>
                <td><b>{p.step}</b></td>
                <td className="mono">{p.servedModel ?? p.model ?? p.endpoint}</td>
                <td>{p.provider ?? "–"}</td>
                <td>{p.fallback === "true" ? <span className="pill pill--feat">yes</span> : p.fallback === "false" ? "no" : "–"}</td>
                <td>
                  {Array.isArray(p.guardrails)
                    ? p.guardrails.map((g: any, j: number) => (
                        <span key={j} className={`pill ${g.status === "evaluated" ? (g.valid ? "pill--ok" : "pill--block") : ""}`}>
                          {g.mode}: {g.status === "evaluated" ? (g.valid ? "passed" : "flagged") : g.status}
                        </span>
                      ))
                    : p.status === 403
                      ? <span className="pill pill--block">block: stopped</span>
                      : "–"}
                </td>
                <td>{p.tools?.length ? p.tools.map((t, j) => <span key={j} className="pill pill--feat">{t}</span>) : p.endpoint === "/fetch" ? <span className="pill pill--feat">web fetch</span> : p.endpoint === "/code/execute" ? <span className="pill pill--feat">code execution</span> : "–"}</td>
                <td className="mono">{money(p.costUsd)}</td>
                <td className="mono">{(p.ms / 1000).toFixed(1)}s</td>
                <td className="mono">{p.requestId ?? "–"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function VerdictCard({ v, example }: { v: Verdict; example: boolean }) {
  return (
    <div className={`verdict verdict--${v.band}`}>
      <div className="verdict__top">
        <span className="verdict__band">{BAND_TEXT[v.band]}</span>
        <span className="meter" title="50 or more: likely scam. 25 to 49: be careful. Under 25: looks genuine.">
          Red flags
          <span className="meter__bar"><i style={{ width: `${v.score}%` }} /></span>
          <b>{v.score}</b>/100
        </span>
      </div>
      <h3>{v.headline ?? BAND_TEXT[v.band]}</h3>
      <p className="t-micro" style={{ marginTop: -6, marginBottom: 12 }}>Red-flag score: 50 or more means likely scam, 25 to 49 means be careful, under 25 looks genuine.</p>
      <div className="verdict__cols">
        {v.why.length > 0 && (
          <div>
            <div className="verdict__label">Why</div>
            <ul>{v.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
        {v.what_to_do.length > 0 && (
          <div className="todo">
            <div className="verdict__label">What to do</div>
            <ul>{v.what_to_do.map((w, i) => <li key={i}>{w}</li>)}</ul>
          </div>
        )}
      </div>
      {v.official.scam_warning_url && (
        <div className="verdict__source">
          {v.official.scam_warning_summary ? `${v.official.scam_warning_summary} ` : "The company's own warning: "}
          <a href={v.official.scam_warning_url} target="_blank" rel="noreferrer">{v.official.scam_warning_url.replace(/^https?:\/\//, "")}</a>
        </div>
      )}
      <details className="verdict__source">
        <summary style={{ cursor: "pointer" }}>How the score was worked out ({v.scoredWhere}{example ? ", example" : ""})</summary>
        <ul style={{ marginTop: 8 }}>
          {v.fired.length ? v.fired.map((f) => <li key={f.flag}>{f.weight > 0 ? "+" : ""}{f.weight} · {f.label}</li>) : <li>No red flags.</li>}
        </ul>
        <p style={{ marginTop: 8 }}>50 or more: likely scam. 25 to 49: be careful. Under 25: looks genuine.</p>
      </details>
    </div>
  );
}

export default function Home() {
  const [text, setText] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetHit, setBudgetHit] = useState(false);
  const [left, setLeft] = useState<number | null>(null);
  const [ran, setRan] = useState(false);
  const host = useRef("");
  const toolRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    host.current = window.location.host;
    loadBudget();
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); io.unobserve(e.target); } }), { rootMargin: "0px 0px -8% 0px" });
      document.querySelectorAll(".reveal").forEach((el) => io.observe(el));
    } else document.querySelectorAll(".reveal").forEach((el) => el.classList.add("in"));
  }, []);

  async function loadBudget() {
    try {
      const r = await fetch("/api/budget", { cache: "no-store" });
      if (r.ok) {
        const j = await r.json();
        if (typeof j.checksLeft === "number") setLeft(j.checksLeft);
      }
    } catch {}
  }

  async function check(input: string) {
    if (busy || input.trim().length < 8) return;
    setBusy(true);
    setRan(true);
    setSteps([]);
    setVerdict(null);
    setProofs([]);
    setError(null);
    setBudgetHit(false);
    if (window.innerWidth < 900) toolRef.current?.querySelector(".tool__output")?.scrollIntoView({ behavior: "smooth", block: "start" });
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `status ${res.status}`);
      }
      const reader = res.body.getReader();
      const dec = new TextDecoder();
      let buf = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        buf += dec.decode(value, { stream: true });
        let nl;
        while ((nl = buf.indexOf("\n")) >= 0) {
          const line = buf.slice(0, nl).trim();
          buf = buf.slice(nl + 1);
          if (!line) continue;
          const ev = JSON.parse(line);
          if (ev.type === "step") {
            setSteps((prev) => {
              const i = prev.findIndex((s) => s.id === ev.id);
              if (i < 0) return [...prev, ev];
              const next = prev.slice();
              next[i] = ev;
              return next;
            });
          } else if (ev.type === "verdict") setVerdict(ev);
          else if (ev.type === "budget") setBudgetHit(true);
          else if (ev.type === "end") setProofs(ev.proofs ?? []);
          else if (ev.type === "fatal") setError(ev.message);
        }
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
      loadBudget();
    }
  }

  function trySample(t: string) {
    const filled = t.replace("{HOST}", host.current);
    setText(filled);
    check(filled);
  }

  const showExample = !ran;
  const shownVerdict = showExample ? EXAMPLE.verdict : verdict;
  const shownProofs = showExample ? EXAMPLE.proofs : proofs;

  return (
    <>
      <nav className="nav" aria-label="Main">
        <div className="nav__bar">
          <a href="#top" className="nav__brand">
            <img src="/icon.png" alt="" className="brand-mark" width={28} height={28} />
            Second Look
          </a>
          <div className="nav__links">
            <a href="#checks">What it checks</a>
            <a href="#proof">Shows its work</a>
            <a href="#models">The models</a>
            <a href="#faq">FAQ</a>
          </div>
          <a href="#tool" className="btn btn-candy btn-sm">Check a message</a>
        </div>
      </nav>

      <header className="hero" id="top">
        <div className="container">
          <span className="badge"><span className="badge__tag">Open models</span>Runs through Mozilla&apos;s Otari gateway</span>
          <h1>
            Is this text a scam? <span className="t-muted">Paste it and <em className="t-serif">see</em>.</span>
          </h1>
          <p className="lead">
            Second Look opens the link, finds the company&apos;s real website and checks how old the domain is. Then it tells you, in plain words, whether to trust the message.
          </p>
          <div className="trust"><span>Free</span><span>No account</span><span>Names and account numbers are masked first</span></div>

          <div className="hero__visual tool-stage" id="tool" ref={toolRef}>
            <div className="stage">
              <div className="window tool">
                <div className="window__bar">
                  <span className="lights" aria-hidden="true"><i /><i /><i /></span>
                  <span className="window__title">Second Look</span>
                  <span className="end t-micro">{left != null ? (left > 0 ? <span className="allowance"><b>{left}</b> free {left === 1 ? "check" : "checks"} left today</span> : <span className="allowance">Free checks used up for today</span>) : null}</span>
                </div>
                <div className="tool__body">
                  <div className="tool__input">
                    <label className="field-label" htmlFor="msg">The message you got</label>
                    <textarea
                      id="msg"
                      className="paste"
                      value={text}
                      onChange={(e) => setText(e.target.value)}
                      placeholder="Paste the text, email or DM here"
                      rows={6}
                      onKeyDown={(e) => { if ((e.metaKey || e.ctrlKey) && e.key === "Enter") check(text); }}
                    />
                    <div className="tool__actions">
                      <button className="btn btn-candy" onClick={() => check(text)} disabled={busy || text.trim().length < 8}>
                        {busy ? "Checking…" : "Check this message"}
                      </button>
                      <span className="t-micro">or press <kbd>⌘</kbd> <kbd>↵</kbd></span>
                    </div>
                    <div className="examples">
                      <div className="field-label" style={{ marginBottom: 8 }}>No message to hand? Try one:</div>
                      <div className="chips">
                        {SAMPLES.map((s) => (
                          <button key={s.id} className="chip" onClick={() => trySample(s.text)} disabled={busy} title={s.text.replace("{HOST}", "this site")}>
                            <span className={`k k--${s.kind}`} aria-hidden="true" />
                            {s.label}
                          </button>
                        ))}
                      </div>
                      <p className="t-micro" style={{ marginTop: 10 }}>
                        Red dots are written like real scams consumer groups have warned about; their links are made up. Green dots are genuine messages. The orange one opens a test page we host that hides instructions for AI checkers.
                      </p>
                    </div>
                    <div className="privacy-note">
                      {I.lock}
                      <span>We mask names and account numbers before anything leaves our server, and we don&apos;t store your message. Links and phone numbers stay in, because they&apos;re the evidence.</span>
                    </div>
                  </div>

                  <div className="tool__output" aria-live="polite">
                    {showExample && <span className="example-tag">Example result · the parcel-fee text, checked on the live site</span>}
                    {showExample && <p className="t-micro" style={{ marginTop: -8 }}>&ldquo;{EXAMPLE_TEXT}&rdquo;</p>}
                    {error && <div className="alert alert--err">We couldn&apos;t finish this check. Try again in a minute. <span className="t-micro">({error})</span></div>}
                    {budgetHit && <div className="alert alert--warn">You&apos;ve used today&apos;s free checks. They come back at midnight UTC.</div>}
                    {shownVerdict && <VerdictCard v={shownVerdict} example={showExample} />}
                    {!showExample && steps.length > 0 && (
                      <div>
                        <div className="verdict__label">{busy ? "Checking now" : "What we checked"}</div>
                        <ol className="steps">
                          {steps.map((s) => (
                            <li key={s.id} className={`step step--${s.status}`}>
                              <span className="step__icon" aria-hidden="true">
                                {s.status === "done" ? I.check : s.status === "skipped" ? I.dash : s.status === "error" ? I.warn : null}
                              </span>
                              <div>
                                <div className="step__label">{s.label}</div>
                                {STEP_FEATURE[s.id] && <div className="step__feat">{STEP_FEATURE[s.id]}</div>}
                                {s.detail && <div className="step__detail">{s.detail}</div>}
                                {s.id === "research" && s.data?.links?.length > 0 && (
                                  <ul className="step__links">
                                    {s.data.links.map((l: any) => (
                                      <li key={l.url}>
                                        <code>{l.url.replace(/^https?:\/\//, "")}</code> {l.compare?.explanation ?? ""}
                                        {l.age ? ` ${l.age.found === false ? "No registration record." : l.age.age_days != null ? `Registered ${l.age.age_days.toLocaleString()} days ago.` : ""}` : ""}
                                        {l.phishing ? ` ${l.phishing.listed ? "On a public phishing list." : "Not on the phishing list."}` : ""}
                                      </li>
                                    ))}
                                  </ul>
                                )}
                              </div>
                            </li>
                          ))}
                        </ol>
                      </div>
                    )}
                    {!showExample && !busy && !verdict && !error && !budgetHit && steps.length === 0 && <p className="t-small">Starting…</p>}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </header>

      <section className="section section--alt" id="checks">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow"><span className="dot" />What it checks</span>
            <h2>The same checks a careful friend would do.</h2>
            <p className="lead">Every step runs through Otari on open-weight models. The plain words come first; the Otari feature doing the work is underneath.</p>
          </div>
          <div className="grid grid-3 tiles">
            {[
              [I.search, "The company's real website", "Searches for the company the message claims to be from, and its own page about scam texts.", "otari_web_search"],
              [I.calendar, "How old the link is", "Asks our evidence server when the link's domain was registered, whether it's on a phishing list, and whether it imitates the real site.", "MCP · evidence server"],
              [I.page, "The page behind the link", "Opens the link on our server, never on your phone. If the page tries to give orders to AI checkers, Otari's guardrail stops it.", "otari_web_fetch · guardrail (block)"],
              [I.calc, "A red-flag score you can read", "Adds up the red flags with a fixed formula that runs in Otari's code sandbox. You can open the sum.", "otari_code_execution"],
              [I.chat, "A plain answer", "A second open model turns the evidence into a short verdict and what to do next.", "gpt-oss-120b · distinct role"],
              [I.gauge, "Your own daily allowance", "Each visitor gets a small daily budget, so the free tool stays free for everyone.", "per-user budget · org cap · fallback routing"],
            ].map(([icon, t, p, f], i) => (
              <div key={i} className="tile reveal" style={{ ["--i" as any]: i % 3 }}>
                <span className="icon-tile">{icon}</span>
                <div>
                  <div className="t-title">{t}</div>
                  <p>{p}</p>
                  <span className="feat">{f}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="proof">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow"><span className="dot" />Shows its work</span>
            <h2>Every answer comes with <span className="hl">its receipts</span>.</h2>
            <p className="lead">Each check lists every request it made through Otari: the model that answered, the provider, whether a fallback kicked in, the guardrail verdict, the tools Otari ran and the cost.</p>
          </div>
          <div className="reveal"><ProofTable proofs={shownProofs} example={showExample || proofs.length === 0} /></div>
        </div>
      </section>

      <section className="section section--alt" id="models">
        <div className="container">
          <div className="section-head">
            <span className="eyebrow"><span className="dot" />The models</span>
            <h2>Four open-weight models, each in its own role.</h2>
            <p className="lead">No frontier API anywhere in the loop. Otari gives these open models the search, fetch, sandbox and MCP tools they need.</p>
          </div>
          <div className="models">
            {[
              ["Reads and researches", "Qwen3 235B Instruct", "alibaba · via DeepInfra", "Pulls out the sender, the ask and the links, then searches and calls the evidence server."],
              ["Backup", "Gemma 3 27B", "google · via Nebius", "Takes over through the sl-reader routing policy if Qwen's provider fails."],
              ["Writes the answer", "gpt-oss-120b", "openai · via DeepInfra", "Turns the evidence into a short verdict for someone who isn't technical."],
              ["Guards", "Qwen3Guard 8B", "alibaba · via OVHcloud", "Runs inside our guardrail service and screens text for instructions planted for AI readers."],
            ].map(([role, name, who, p], i) => (
              <div key={i} className="model reveal" style={{ ["--i" as any]: i }}>
                <div className="model__role">{role}</div>
                <div className="model__name">{name}</div>
                <div className="model__who">{who}</div>
                <p>{p}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" id="faq">
        <div className="container">
          <div className="section-head"><h2>Questions.</h2></div>
          <div className="faq">
            {[
              ["Do you keep my message?", "No. We mask names and account numbers on our server, send the rest to the models through Otari to do the check, and don't store it. Links and phone numbers stay in because they're what we check."],
              ["Is it always right?", "No. It works from public evidence, and brand-new scam domains are often missing from phishing lists. A small company with little web presence can look suspicious. Treat it as a second opinion, and when money is involved, contact the company through its real website."],
              ["Why do some links not open?", "Scam pages are often taken down within hours of being reported. A dead link is reported as such; the domain's age and the lookalike check still count."],
              ["What should I do if it's a scam?", "Don't tap the link or reply. In the UK, forward scam texts to 7726. In the US, report them at reportfraud.ftc.gov. If you already paid or shared details, call your bank on the number on your card."],
              ["Which models do the work?", "Qwen3 235B reads and researches, Gemma 3 27B is the backup, gpt-oss-120b writes the answer and Qwen3Guard 8B screens for planted instructions. All are open-weight and run through Mozilla's Otari gateway."],
              ["Why is there a daily limit?", "Each check costs about two cents in model and search fees. A small daily budget per visitor keeps it free for everyone."],
            ].map(([q, a]) => (
              <details key={q}><summary>{q}</summary><p>{a}</p></details>
            ))}
          </div>
        </div>
      </section>

      <footer className="footer">
        <div className="container">
          <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
            <img src="/icon.png" alt="" className="brand-mark" width={24} height={24} />
            Second Look · built on open-weight models through <a href="https://otari.ai" target="_blank" rel="noreferrer">Otari</a>
          </span>
          <span>Made for MozFest Developers Wilding</span>
        </div>
      </footer>
    </>
  );
}
