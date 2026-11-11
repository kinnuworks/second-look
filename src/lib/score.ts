// The red-flag score runs as Python in Otari's code-execution sandbox. The
// formula is fixed and shown to the user; the evidence is passed in as JSON.
export const SCORE_WEIGHTS = [
  ["link_lookalike", 30, "Link imitates the company's real website"],
  ["link_not_official", 15, "Link goes somewhere other than the company's real website"],
  ["phishing_listed", 40, "Link is on a public phishing list"],
  ["new_domain", 20, "Link's website was registered in the last 90 days"],
  ["domain_unregistered", 15, "Link's website has no registration record"],
  ["asks_payment", 15, "Asks you to pay"],
  ["asks_credentials", 15, "Asks for a password, code or card details"],
  ["urgency", 10, "Pressure: a deadline or threat"],
  ["page_asks_card", 15, "The linked page asks for card or login details"],
  ["planted_instructions", 25, "The linked page contains hidden instructions aimed at AI checkers"],
  ["official_scam_warning", 10, "The company warns about messages like this"],
  ["sender_matches_official", -25, "Every link goes to the company's real website"],
] as const;

export function scoreScript(evidence: Record<string, unknown>): string {
  const weights = SCORE_WEIGHTS.map(([k, w, label]) => `    (${JSON.stringify(k)}, ${w}, ${JSON.stringify(label)}),`).join("\n");
  return `import json
evidence = json.loads(${JSON.stringify(JSON.stringify(evidence))})
WEIGHTS = [
${weights}
]
score = 0
fired = []
for key, weight, label in WEIGHTS:
    if evidence.get(key):
        score += weight
        fired.append({"flag": key, "weight": weight, "label": label})
score = max(0, min(100, score))
band = "likely_scam" if score >= 50 else ("suspicious" if score >= 25 else "looks_genuine")
print(json.dumps({"score": score, "band": band, "fired": fired}))
`;
}

// Same formula in TypeScript, used only if the sandbox is unreachable, and
// labelled as such on the page.
export function scoreLocally(evidence: Record<string, unknown>) {
  let score = 0;
  const fired: { flag: string; weight: number; label: string }[] = [];
  for (const [k, w, label] of SCORE_WEIGHTS) {
    if (evidence[k]) {
      score += w;
      fired.push({ flag: k, weight: w, label });
    }
  }
  score = Math.max(0, Math.min(100, score));
  const band = score >= 50 ? "likely_scam" : score >= 25 ? "suspicious" : "looks_genuine";
  return { score, band, fired };
}
