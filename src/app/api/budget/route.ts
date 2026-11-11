import { OTARI_BASE } from "@/lib/otari";
import { visitorId } from "@/lib/visitor";

export const runtime = "nodejs";

// Reads this visitor's Otari end-user budget and turns the dollars left into an
// estimated number of checks (a check costs roughly CHECK_COST_ESTIMATE dollars).
export async function GET() {
  const key = process.env.OTARI_SERVICE_KEY;
  if (!key) return Response.json({ checksLeft: null, note: "no service key" });
  const { id } = await visitorId();
  const per = Number(process.env.CHECK_COST_ESTIMATE ?? "0.022");
  const perDay = Math.floor(Number(process.env.VISITOR_BUDGET_USD ?? "0.08") / Number(process.env.CHECK_COST_ESTIMATE ?? "0.022"));
  try {
    const r = await fetch(`${OTARI_BASE}/end-users?external_id=${encodeURIComponent(id)}`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
    if (r.status === 404) return Response.json({ checksLeft: perDay, note: "new visitor" });
    const j: any = await r.json();
    const u = Array.isArray(j) ? j[0] : Array.isArray(j?.data) ? j.data[0] : j;
    if (!u) return Response.json({ checksLeft: perDay, note: "new visitor" });
    if (u.blocked) return Response.json({ checksLeft: 0, note: "blocked" });
    // Otari reports spend against the visitor budget's max_budget.
    let max = Number(process.env.VISITOR_BUDGET_USD ?? "0.08");
    try {
      const b = await fetch(`${OTARI_BASE}/end-user-budgets`, { headers: { Authorization: `Bearer ${key}` }, cache: "no-store" });
      const list: any[] = await b.json();
      const mine = list.find((x) => x.budget_id === u.budget_id);
      if (mine?.max_budget != null) max = Number(mine.max_budget);
    } catch {}
    const remaining = Math.max(0, max - Number(u.spend ?? 0) - Number(u.reserved ?? 0));
    return Response.json({ checksLeft: Math.floor(remaining / per), remainingUsd: remaining, resetsAt: u.next_budget_reset_at ?? null });
  } catch (e) {
    return Response.json({ checksLeft: null, note: (e as Error).message });
  }
}
