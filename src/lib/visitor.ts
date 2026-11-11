import { headers } from "next/headers";
import { createHash } from "node:crypto";

// Each visitor is an Otari end user with a daily budget. The id is a salted hash
// of the visitor's network address, so clearing cookies or calling the API
// directly doesn't reset the allowance, and no address is ever sent to Otari.
export async function visitorId(): Promise<{ id: string }> {
  const h = await headers();
  const ip =
    h.get("x-real-ip") ??
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "local";
  const salt = process.env.VISITOR_SALT ?? process.env.GUARD_TOKEN ?? "second-look";
  const id = "v_" + createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
  return { id };
}
