import { runCheck } from "@/lib/pipeline";
import { visitorId } from "@/lib/visitor";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const text = String(body?.text ?? "").trim();
  if (text.length < 8) return Response.json({ error: "Paste the message you want checked." }, { status: 400 });
  const { id } = await visitorId();
  const enc = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const emit = (e: unknown) => controller.enqueue(enc.encode(JSON.stringify(e) + "\n"));
      try {
        await runCheck(text, id, emit, { drill: !!body?.drill, budgetDrill: !!body?.budgetDrill, depth: body?.depth === "quick" ? "quick" : "full" });
      } catch (e) {
        emit({ type: "fatal", message: (e as Error).message });
      } finally {
        controller.close();
      }
    },
  });
  const headers: Record<string, string> = { "Content-Type": "application/x-ndjson; charset=utf-8", "Cache-Control": "no-store" };
  return new Response(stream, { headers });
}
