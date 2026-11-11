import { authorized, validate } from "@/lib/guard";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(req: Request) {
  if (!authorized(req)) return Response.json({ detail: "unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const profile = String(body.profile ?? "prompt-injection");
  const text = String(body.input_text ?? body.text ?? "");
  const result = await validate(profile, text);
  return Response.json({ profile, result });
}

export async function GET() {
  return Response.json([{ name: "prompt-injection", guardrail_name: "second-look-guard" }]);
}
