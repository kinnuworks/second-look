// Runs every message in an eval set through the live check and reports the results.
// Usage: node scripts/eval.mjs <eval-set.json> [base-url] > results.json
import { readFileSync } from "node:fs";

const [file, base = "https://second-look-phi.vercel.app"] = process.argv.slice(2);
const items = JSON.parse(readFileSync(file, "utf8"));
const out = [];
for (const it of items) {
  const t0 = Date.now();
  let verdict = null, error = null;
  try {
    const res = await fetch(`${base}/api/check`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ text: it.text }) });
    for (const line of (await res.text()).split("\n")) {
      if (!line.trim()) continue;
      const e = JSON.parse(line);
      if (e.type === "verdict") verdict = e;
      if (e.type === "budget" || e.type === "fatal") error = e.code ?? e.message;
    }
  } catch (e) { error = String(e); }
  const band = verdict?.band ?? null;
  out.push({ id: it.id, kind: it.kind, band, score: verdict?.score ?? null, headline: verdict?.headline ?? null, secs: Math.round((Date.now() - t0) / 1000), error, note: it.note });
  process.stderr.write(`${it.id} ${it.kind} -> ${band} ${verdict?.score ?? ""} ${error ?? ""}\n`);
}
const scams = out.filter((r) => r.kind === "scam"), genuine = out.filter((r) => r.kind === "genuine");
const summary = {
  scams: scams.length,
  scams_flagged: scams.filter((r) => r.band === "likely_scam" || r.band === "suspicious").length,
  scams_likely: scams.filter((r) => r.band === "likely_scam").length,
  genuine: genuine.length,
  genuine_ok: genuine.filter((r) => r.band === "looks_genuine").length,
  genuine_false_alarm: genuine.filter((r) => r.band === "likely_scam").length,
  errors: out.filter((r) => r.error || !r.band).length,
};
console.log(JSON.stringify({ summary, results: out }, null, 2));
