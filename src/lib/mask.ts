// Masks personal details before a message leaves our server. Links and phone
// numbers stay: they are the evidence we check.
export function maskMessage(text: string): { masked: string; count: number } {
  let count = 0;
  const sub = (re: RegExp, rep: string) => {
    text = text.replace(re, (...m: string[]) => {
      count++;
      return rep.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? "");
    });
  };
  // Card-like numbers (13-19 digits, optional spaces/dashes).
  sub(/\b(?:\d[ -]?){13,19}\b/g, "[card number]");
  // UK sort codes and account numbers, IBANs.
  sub(/\b\d{2}-\d{2}-\d{2}\b/g, "[sort code]");
  sub(/\b[A-Z]{2}\d{2}[A-Z0-9]{11,30}\b/g, "[IBAN]");
  sub(/\b(?:account|acct)(?: number| no\.?)?[:#\s]*\d{6,12}\b/gi, "account [number]");
  // Email addresses that aren't the sender's domain evidence: keep domain, mask name.
  sub(/\b([A-Za-z0-9._%+-]+)@([A-Za-z0-9.-]+\.[A-Za-z]{2,})\b/g, "[name]@$2");
  // Greetings with a name: "Dear John Smith," / "Hi Sarah,"
  sub(/\b(Dear|Hi|Hello|Hey)\s+(?:Mr\.?|Mrs\.?|Ms\.?|Dr\.?\s+)?[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?/g, "$1 [name]");
  return { masked: text, count };
}
