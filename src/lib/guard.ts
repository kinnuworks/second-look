// Our guardrails service for Otari. Otari sends
//   POST {profile, input_text, validate_kwargs}  (Authorization: Bearer <credential>)
// and expects {profile, result: {valid, explanation, score}}. valid:false = flagged.
//
// The check is an open-weight safety model (Qwen3Guard) called back through Otari,
// plus a few plain rules for instructions aimed at an AI reader.
import { chat } from "./otari";

const GUARD_MODEL = process.env.GUARD_MODEL ?? "alibaba/qwen3guard-gen-8b";

const RULES: [RegExp, string][] = [
  [/ignore (all |any )?(the )?(previous|prior|above|earlier) (instructions|rules|messages)/i, "asks the reader to ignore its instructions"],
  [/(you are|act as|pretend to be) (now )?(an? )?(ai|assistant|language model|chatbot)/i, "tries to re-role an AI reader"],
  [/\b(system prompt|developer message|jailbreak)\b/i, "mentions system prompts or jailbreaks"],
  [/(tell|say to|inform) the (user|reader|customer) (that )?(this|it) is (safe|legit|legitimate|genuine|not a scam)/i, "tells an AI to call the page safe"],
  [/\b(ai|llm|model|assistant)s?\b[^.\n]{0,60}\b(must|should|always)\b[^.\n]{0,60}\b(safe|legitimate|trust)/i, "instructs an AI to vouch for the page"],
];

export type GuardResult = { valid: boolean | null; explanation: string | null; score: number | null };

export async function validate(profile: string, text: string): Promise<GuardResult> {
  const hits = RULES.filter(([re]) => re.test(text)).map(([, why]) => why);
  if (hits.length) {
    return { valid: false, explanation: `Planted instruction: ${hits.join("; ")}`, score: 0.99 };
  }
  try {
    const { content } = await chat({
      step: "guard",
      model: GUARD_MODEL,
      visitor: null,
      maxTokens: 64,
      messages: [{ role: "user", content: text.slice(0, 12000) }],
    });
    // Qwen3Guard answers "Safety: Safe|Unsafe|Controversial" and "Categories: ...".
    const unsafe = /Safety:\s*Unsafe/i.test(content);
    const jailbreak = /Jailbreak/i.test(content);
    if (profile === "prompt-injection") {
      if (jailbreak) return { valid: false, explanation: "Safety model flagged a jailbreak attempt", score: 0.9 };
      return { valid: true, explanation: content.trim().slice(0, 200) || null, score: 0.1 };
    }
    return { valid: !unsafe, explanation: content.trim().slice(0, 200) || null, score: unsafe ? 0.9 : 0.1 };
  } catch (e) {
    return { valid: null, explanation: `guard model unavailable: ${(e as Error).message.slice(0, 120)}`, score: null };
  }
}

export function authorized(req: Request): boolean {
  const want = process.env.GUARD_TOKEN;
  if (!want) return true;
  return req.headers.get("authorization") === `Bearer ${want}`;
}
