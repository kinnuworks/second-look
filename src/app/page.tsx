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
  endUserBudget?: string | null;
  costUsd?: number | null;
  ms: number;
  status: number;
  tools?: string[];
};
type Step = { id: string; status: string; label: string; detail?: string; data?: any; proof?: Proof };
type Verdict = {
  band: "likely_scam" | "suspicious" | "looks_genuine";
  score: number;
  fired: { flag: string; weight: number; label: string }[];
  scoredWhere: string;
  headline: string | null;
  why: string[];
  what_to_do: string[];
  official: { domain: string | null; source: string | null; scam_warning_url: string | null; scam_warning_summary: string | null };
};

const BAND_TEXT = { likely_scam: "Likely scam", suspicious: "Be careful", looks_genuine: "Looks genuine" } as const;
const BAND_COLOR = { likely_scam: "#b00020", suspicious: "#a15c00", looks_genuine: "#1b6e2e" } as const;

const STEP_FEATURE: Record<string, string> = {
  extract: "Open model reads the message · routing with fallback · guardrail (monitor)",
  research: "Open model with web search + our MCP server",
  fetch: "Web fetch on the server",
  page: "Open model reads the page · guardrail (block)",
  score: "Code execution in a sandbox",
  verdict: "Second open model writes the answer",
};

export default function Home() {
  const [text, setText] = useState("");
  const [steps, setSteps] = useState<Step[]>([]);
  const [verdict, setVerdict] = useState<Verdict | null>(null);
  const [proofs, setProofs] = useState<Proof[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [budgetHit, setBudgetHit] = useState(false);
  const [budget, setBudget] = useState<{ checksLeft: number | null; note?: string } | null>(null);
  const host = useRef("");

  useEffect(() => {
    host.current = window.location.host;
    loadBudget();
  }, []);

  async function loadBudget() {
    try {
      const r = await fetch("/api/budget");
      if (r.ok) setBudget(await r.json());
    } catch {}
  }

  async function check(input: string) {
    if (busy) return;
    setBusy(true);
    setSteps([]);
    setVerdict(null);
    setProofs([]);
    setError(null);
    setBudgetHit(false);
    try {
      const res = await fetch("/api/check", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: input }) });
      if (!res.ok || !res.body) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error ?? `Request failed (${res.status})`);
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

  const totalCost = proofs.reduce((a, p) => a + (p.costUsd ?? 0), 0);

  return (
    <main style={{ maxWidth: 760, margin: "0 auto", padding: "24px 16px 64px", fontFamily: "system-ui, -apple-system, sans-serif", lineHeight: 1.5 }}>
      <h1 style={{ marginBottom: 4 }}>Second Look</h1>
      <p style={{ marginTop: 0, fontSize: 18 }}>Got a text or email you&apos;re not sure about? Paste it here and find out if it&apos;s a scam.</p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Paste the message here"
        rows={5}
        style={{ width: "100%", boxSizing: "border-box", fontSize: 16, padding: 12 }}
        aria-label="Message to check"
      />
      <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", margin: "8px 0 4px" }}>
        <button onClick={() => check(text)} disabled={busy || text.trim().length < 8} style={{ fontSize: 16, padding: "8px 18px" }}>
          {busy ? "Checking…" : "Check this message"}
        </button>
        <span style={{ color: "#555", fontSize: 14 }}>
          {budget?.checksLeft != null ? `About ${budget.checksLeft} free checks left today` : "Free, no sign-up"} · Names and account numbers are masked before checking. Nothing is stored.
        </span>
      </div>

      <p style={{ margin: "16px 0 6px", fontSize: 14, color: "#555" }}>Or try an example:</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
        {SAMPLES.map((s) => (
          <button key={s.id} onClick={() => trySample(s.text)} disabled={busy} style={{ fontSize: 14, padding: "6px 10px" }} title={s.text.replace("{HOST}", "this site")}>
            {s.kind === "genuine" ? "✓ " : s.kind === "test" ? "⚙ " : ""}
            {s.label}
          </button>
        ))}
      </div>
      <p style={{ fontSize: 12, color: "#777", marginTop: 6 }}>
        Scam examples are written in the style of real scams that consumer-protection bodies have warned about; their links are illustrations. ✓ examples are genuine messages. ⚙ opens a test page we host with hidden instructions for AI checkers.
      </p>

      {error && <p style={{ color: "#b00020" }}>Something went wrong: {error}</p>}
      {budgetHit && <p style={{ color: "#a15c00" }}>You&apos;ve used today&apos;s free checks. They refill tomorrow.</p>}

      {verdict && (
        <section style={{ border: `2px solid ${BAND_COLOR[verdict.band]}`, borderRadius: 8, padding: 16, marginTop: 24 }}>
          <div style={{ color: BAND_COLOR[verdict.band], fontWeight: 700, fontSize: 14, textTransform: "uppercase" }}>
            {BAND_TEXT[verdict.band]} · red-flag score {verdict.score}/100
          </div>
          <h2 style={{ margin: "6px 0 10px" }}>{verdict.headline ?? BAND_TEXT[verdict.band]}</h2>
          {verdict.why.length > 0 && (
            <>
              <strong>Why</strong>
              <ul>{verdict.why.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </>
          )}
          {verdict.what_to_do.length > 0 && (
            <>
              <strong>What to do</strong>
              <ul>{verdict.what_to_do.map((w, i) => <li key={i}>{w}</li>)}</ul>
            </>
          )}
          {verdict.official.scam_warning_url && (
            <p style={{ fontSize: 14 }}>
              The company&apos;s own warning: <a href={verdict.official.scam_warning_url} target="_blank" rel="noreferrer">{verdict.official.scam_warning_url}</a>
              {verdict.official.scam_warning_summary ? ` (${verdict.official.scam_warning_summary})` : ""}
            </p>
          )}
          <details style={{ fontSize: 14 }}>
            <summary>How the score was worked out ({verdict.scoredWhere})</summary>
            <ul>{verdict.fired.length ? verdict.fired.map((f) => <li key={f.flag}>{f.weight > 0 ? "+" : ""}{f.weight}: {f.label}</li>) : <li>No red flags fired.</li>}</ul>
            <p>50 or more is a likely scam, 25 to 49 means be careful, under 25 looks genuine.</p>
          </details>
        </section>
      )}

      {steps.length > 0 && (
        <section style={{ marginTop: 24 }}>
          <h3 style={{ marginBottom: 8 }}>What we checked</h3>
          <ol style={{ paddingLeft: 20 }}>
            {steps.map((s) => (
              <li key={s.id} style={{ marginBottom: 8 }}>
                <span>{s.status === "running" ? "⏳ " : s.status === "error" ? "⚠ " : s.status === "skipped" ? "– " : "✔ "}</span>
                <strong>{s.label}</strong>
                {STEP_FEATURE[s.id] && <div style={{ fontSize: 12, color: "#666" }}>{STEP_FEATURE[s.id]}</div>}
                {s.detail && <div style={{ fontSize: 13, color: "#555" }}>{s.detail}</div>}
                {s.id === "research" && s.data?.links?.length > 0 && (
                  <ul style={{ fontSize: 13 }}>
                    {s.data.links.map((l: any) => (
                      <li key={l.url}>
                        {l.url}: {l.compare?.explanation ?? "not compared"}
                        {l.age ? ` · ${l.age.found === false ? "no registration record" : l.age.age_days != null ? `registered ${l.age.age_days} days ago` : "age unknown"}` : ""}
                        {l.phishing ? ` · ${l.phishing.listed ? "on a phishing list" : "not on the phishing list"}` : ""}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        </section>
      )}

      {proofs.length > 0 && (
        <details style={{ marginTop: 16 }} open>
          <summary><strong>How this answer was made</strong> ({proofs.length} calls through Otari{totalCost ? `, $${totalCost.toFixed(4)}` : ""})</summary>
          <div style={{ overflowX: "auto" }}>
            <table style={{ fontSize: 12, borderCollapse: "collapse", marginTop: 8, width: "100%" }}>
              <thead>
                <tr>{["Step", "Model / endpoint", "Provider", "Fallback", "Guardrail", "Tools", "Cost", "Time", "Request id"].map((h) => <th key={h} style={{ textAlign: "left", borderBottom: "1px solid #ccc", padding: 4 }}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {proofs.map((p, i) => (
                  <tr key={i}>
                    <td style={{ padding: 4 }}>{p.step}</td>
                    <td style={{ padding: 4 }}>{p.servedModel ?? p.model ?? p.endpoint}</td>
                    <td style={{ padding: 4 }}>{p.provider ?? "–"}</td>
                    <td style={{ padding: 4 }}>{p.fallback ?? (p.attempts && p.attempts !== "1" ? `${p.attempts} attempts` : "–")}</td>
                    <td style={{ padding: 4 }}>{Array.isArray(p.guardrails) ? p.guardrails.map((g: any) => `${g.mode}: ${g.status === "evaluated" ? (g.valid ? "passed" : "flagged") : g.status}`).join(", ") : p.status === 403 ? "blocked" : "–"}</td>
                    <td style={{ padding: 4 }}>{p.tools?.length ? p.tools.join(", ") : "–"}</td>
                    <td style={{ padding: 4 }}>{p.costUsd != null ? `$${Number(p.costUsd).toFixed(5)}` : "–"}</td>
                    <td style={{ padding: 4 }}>{(p.ms / 1000).toFixed(1)}s</td>
                    <td style={{ padding: 4, fontFamily: "monospace" }}>{p.requestId ?? "–"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </main>
  );
}
