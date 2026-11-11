import { OTARI_BASE } from "./otari";

// A visitor's allowance is their Otari end-user budget. We read it back from Otari
// (spend and reserved against the budget's max) rather than counting on our side.
export type Allowance = {
  maxUsd: number;
  spentUsd: number;
  remainingUsd: number;
  fullChecksLeft: number;
  resetsAt: string | null;
  source: "otari" | "new visitor" | "estimate";
};

export const FULL_CHECK_USD = Number(process.env.CHECK_COST_ESTIMATE ?? "0.032");
export const QUICK_CHECK_USD = Number(process.env.QUICK_CHECK_COST_ESTIMATE ?? "0.011");

const defaultMax = () => Number(process.env.VISITOR_BUDGET_USD ?? "0.15");

function shape(maxUsd: number, spentUsd: number, resetsAt: string | null, source: Allowance["source"]): Allowance {
  const remainingUsd = Math.max(0, maxUsd - spentUsd);
  return { maxUsd, spentUsd, remainingUsd, fullChecksLeft: Math.floor(remainingUsd / FULL_CHECK_USD), resetsAt, source };
}

export async function readAllowance(visitor: string): Promise<Allowance | null> {
  const key = process.env.OTARI_SERVICE_KEY;
  if (!key) return null;
  const h = { Authorization: `Bearer ${key}` };
  try {
    const r = await fetch(`${OTARI_BASE}/end-users?external_id=${encodeURIComponent(visitor)}`, { headers: h, cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (r.status === 404) return shape(defaultMax(), 0, null, "new visitor");
    const j: any = await r.json();
    const u = Array.isArray(j) ? j[0] : Array.isArray(j?.data) ? j.data[0] : j;
    if (!u || !u.budget_id) return shape(defaultMax(), 0, null, "new visitor");
    if (u.blocked) return shape(0, 0, u.next_budget_reset_at ?? null, "otari");
    let max = defaultMax();
    try {
      const b = await fetch(`${OTARI_BASE}/end-user-budgets`, { headers: h, cache: "no-store", signal: AbortSignal.timeout(8000) });
      const list: any[] = await b.json();
      const mine = Array.isArray(list) ? list.find((x) => x.budget_id === u.budget_id) : null;
      if (mine?.max_budget != null) max = Number(mine.max_budget);
    } catch {}
    return shape(max, Number(u.spend ?? 0) + Number(u.reserved ?? 0), u.next_budget_reset_at ?? null, "otari");
  } catch {
    return null;
  }
}

// How deep a check can go on what's left. A full check runs web search (most of
// the cost); a quick check skips it and leans on the MCP lookups and the page.
export type CheckDepth = "full" | "quick";
export function depthFor(a: Allowance | null): CheckDepth {
  if (!a) return "full";
  return a.remainingUsd >= FULL_CHECK_USD ? "full" : "quick";
}
