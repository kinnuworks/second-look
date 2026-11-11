import { OTARI_BASE } from "@/lib/otari";
import { visitorId } from "@/lib/visitor";

export const runtime = "nodejs";

// Reads this visitor's Otari end-user budget and turns the dollars left into an
// estimated number of checks (a check costs roughly CHECK_COST_ESTIMATE dollars).
export async function GET() {
  const key = process.env.OTARI_SERVICE_KEY;
  if (!key) return Response.json({ checksLeft: null, note: "no service key" });
  const { id } = await visitorId();
  const per = Number(process.env.CHECK_COST_ESTIMATE ?? "0.01");
  const perDay = Number(process.env.CHECKS_PER_DAY ?? "5");
  try {
    const r = await fetch(`${OTARI_BASE}/end-users?external_id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (r.status === 404) return Response.json({ checksLeft: perDay, note: "new visitor" });
    const j: any = await r.json();
    const u = Array.isArray(j) ? j[0] : Array.isArray(j?.data) ? j.data[0] : j;
    if (!u) return Response.json({ checksLeft: perDay, note: "new visitor" });
    if (u.blocked) return Response.json({ checksLeft: 0, note: "blocked" });
    const remaining = u.remaining_usd ?? u.budget?.remaining_usd ?? u.limits?.[0]?.remaining ?? null;
    if (remaining == null) return Response.json({ checksLeft: null, note: "no remaining field", raw: Object.keys(u) });
    return Response.json({ checksLeft: Math.max(0, Math.floor(Number(remaining) / per)), remainingUsd: Number(remaining) });
  } catch (e) {
    return Response.json({ checksLeft: null, note: (e as Error).message });
  }
}
