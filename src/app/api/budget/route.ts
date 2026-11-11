import { readAllowance, FULL_CHECK_USD, QUICK_CHECK_USD, depthFor } from "@/lib/allowance";
import { visitorId } from "@/lib/visitor";

export const runtime = "nodejs";

// This visitor's allowance, read back from their Otari end-user budget.
export async function GET() {
  const { id } = await visitorId();
  const a = await readAllowance(id);
  if (!a) return Response.json({ allowance: null });
  return Response.json({ allowance: a, nextDepth: depthFor(a), fullCheckUsd: FULL_CHECK_USD, quickCheckUsd: QUICK_CHECK_USD });
}
