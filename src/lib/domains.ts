// Domain evidence used by the MCP server. All sources are public and keyless:
// RDAP (registration dates) and the OpenPhish community feed.

const MULTI_PART_SUFFIXES = ["co.uk", "org.uk", "gov.uk", "ac.uk", "com.au", "co.in", "co.jp", "com.br", "co.nz"];

export function hostOf(input: string): string | null {
  try {
    const u = new URL(/^https?:\/\//i.test(input) ? input : `https://${input}`);
    return u.hostname.toLowerCase().replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function registrableDomain(host: string): string {
  const parts = host.toLowerCase().split(".");
  const last2 = parts.slice(-2).join(".");
  if (MULTI_PART_SUFFIXES.includes(last2) && parts.length >= 3) return parts.slice(-3).join(".");
  return last2;
}

export async function domainAge(domain: string) {
  const d = registrableDomain(hostOf(domain) ?? domain);
  try {
    const r = await fetch(`https://rdap.org/domain/${encodeURIComponent(d)}`, {
      headers: { Accept: "application/rdap+json", "User-Agent": "second-look/1.0 (scam message checker; domain age lookup)" },
      redirect: "follow",
      signal: AbortSignal.timeout(8000),
    });
    if (r.status === 404) return { domain: d, found: false, note: "No registration record found (domain may not exist)." };
    if (!r.ok) return { domain: d, found: null, note: `RDAP lookup failed (${r.status}).` };
    const j: any = await r.json();
    const ev = (j.events ?? []) as { eventAction: string; eventDate: string }[];
    const reg = ev.find((e) => e.eventAction === "registration")?.eventDate ?? null;
    const registrar =
      (j.entities ?? []).find((e: any) => (e.roles ?? []).includes("registrar"))?.vcardArray?.[1]?.find((v: any) => v[0] === "fn")?.[3] ?? null;
    const ageDays = reg ? Math.floor((Date.now() - Date.parse(reg)) / 86_400_000) : null;
    return { domain: d, found: true, registered: reg, age_days: ageDays, registrar };
  } catch (e) {
    return { domain: d, found: null, note: `RDAP lookup error: ${(e as Error).message}` };
  }
}

let feed: { at: number; urls: Set<string>; hosts: Set<string> } | null = null;

async function loadFeed() {
  if (feed && Date.now() - feed.at < 30 * 60_000) return feed;
  const r = await fetch("https://openphish.com/feed.txt", { signal: AbortSignal.timeout(8000) });
  const lines = (await r.text()).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  feed = {
    at: Date.now(),
    urls: new Set(lines.map((l) => l.toLowerCase())),
    hosts: new Set(lines.map((l) => hostOf(l)).filter(Boolean) as string[]),
  };
  return feed;
}

export async function phishingList(urlOrDomain: string) {
  try {
    const f = await loadFeed();
    const host = hostOf(urlOrDomain);
    const exactUrl = f.urls.has(urlOrDomain.toLowerCase());
    const hostListed = host ? f.hosts.has(host) : false;
    return {
      checked: urlOrDomain,
      source: "OpenPhish community feed",
      feed_size: f.urls.size,
      listed: exactUrl || hostListed,
      match: exactUrl ? "exact URL" : hostListed ? "same host" : null,
    };
  } catch (e) {
    return { checked: urlOrDomain, source: "OpenPhish community feed", listed: null, note: `Feed unavailable: ${(e as Error).message}` };
  }
}

function levenshtein(a: string, b: string) {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

const HOMOGLYPHS: Record<string, string> = { "0": "o", "1": "l", "3": "e", "5": "s", "rn": "m", "vv": "w" };

export function compareDomains(linkUrlOrDomain: string, officialDomain: string) {
  const host = hostOf(linkUrlOrDomain) ?? linkUrlOrDomain;
  const linkReg = registrableDomain(host);
  const off = registrableDomain(hostOf(officialDomain) ?? officialDomain);
  const sameSite = linkReg === off;
  const offBrand = off.split(".")[0];
  let norm = linkReg.split(".")[0];
  for (const [k, v] of Object.entries(HOMOGLYPHS)) norm = norm.split(k).join(v);
  const brandInName = !sameSite && (host.includes(offBrand) || norm.includes(offBrand));
  const distance = levenshtein(linkReg.split(".")[0], offBrand);
  const lookalike = !sameSite && (brandInName || (distance > 0 && distance <= 2));
  return {
    link_host: host,
    link_site: linkReg,
    official_site: off,
    same_site: sameSite,
    brand_name_in_link: brandInName,
    edit_distance: distance,
    lookalike,
    explanation: sameSite
      ? `The link goes to ${off}, the official site.`
      : lookalike
        ? `The link goes to ${linkReg}, which imitates ${off} but is a different site.`
        : `The link goes to ${linkReg}, not ${off}.`,
  };
}
