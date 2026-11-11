import { cookies } from "next/headers";
import { createHash, randomUUID } from "node:crypto";

// Each visitor gets an anonymous id (a random cookie, hashed) that Otari uses
// as the end user, so per-visitor budgets apply with no signup.
export async function visitorId(): Promise<{ id: string; fresh: string | null }> {
  const jar = await cookies();
  let raw = jar.get("sl_v")?.value ?? null;
  let fresh: string | null = null;
  if (!raw) {
    raw = randomUUID();
    fresh = raw;
  }
  const id = "v_" + createHash("sha256").update(raw).digest("hex").slice(0, 24);
  return { id, fresh };
}

