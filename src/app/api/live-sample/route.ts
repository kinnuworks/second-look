import { hostOf } from "@/lib/domains";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// Picks a phishing link from today's OpenPhish community feed whose page still
// loads, so a visitor can watch a check run on a real, live scam page.
const FEED = "https://raw.githubusercontent.com/openphish/public_feed/refs/heads/main/feed.txt";
// Pages on shared hosting, and "clone" projects, are often student work that a
// feed flags; prefer standalone domains registered for the scam.
const SHARED = /github\.io|vercel\.app|netlify\.app|pages\.dev|web\.app|firebaseapp|amazonaws\.com|blogspot|wixsite|weebly|glitch\.me|onrender\.com|workers\.dev|clone/i;
const BRANDS = /paypal|apple|icloud|microsoft|office|outlook|netflix|amazon|dhl|usps|fedex|royal|post|bank|chase|wells|hsbc|barclays|santander|coinbase|binance|metamask|facebook|meta|instagram|whatsapp|login|signin|verify|secure|account|wallet/i;

let cache: { at: number; urls: string[] } | null = null;

async function feed() {
  if (cache && Date.now() - cache.at < 15 * 60_000) return cache.urls;
  const r = await fetch(FEED, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  const urls = (await r.text()).split(/\r?\n/).map((l) => l.trim()).filter((l) => /^https?:\/\//i.test(l));
  cache = { at: Date.now(), urls };
  return urls;
}

async function alive(url: string) {
  try {
    const r = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(5000),
      headers: { "User-Agent": "Mozilla/5.0 (compatible; SecondLookChecker/1.0)" },
    });
    const type = r.headers.get("content-type") ?? "";
    if (!r.ok || !type.includes("html")) return false;
    const body = await r.text();
    return body.length > 800;
  } catch {
    return false;
  }
}

function shuffle<T>(a: T[]) {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export async function GET() {
  let urls: string[];
  try {
    urls = await feed();
  } catch (e) {
    return Response.json({ error: `OpenPhish feed unavailable: ${(e as Error).message}` }, { status: 503 });
  }
  const own = urls.filter((u) => !SHARED.test(u));
  const branded = shuffle(own.filter((u) => BRANDS.test(u)));
  const rest = shuffle(own.filter((u) => !BRANDS.test(u)));
  const pool = [...branded, ...rest, ...shuffle(urls.filter((u) => SHARED.test(u)))];
  for (let i = 0; i < Math.min(pool.length, 24); i += 8) {
    const batch = pool.slice(i, i + 8);
    const ok = await Promise.all(batch.map(alive));
    const hit = batch.find((_, k) => ok[k]);
    if (hit) {
      return Response.json({ url: hit, host: hostOf(hit), feedSize: urls.length, source: "OpenPhish community feed", checkedAt: new Date().toISOString() });
    }
  }
  return Response.json({ error: "No link in today's feed loaded just now. Try again in a minute." }, { status: 404 });
}
