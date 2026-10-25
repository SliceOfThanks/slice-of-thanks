// Fills the details that change for each person in a note: [first name] [last name] [role] [company].
// The older {first} and {company} tags still work. A detail with no value is dropped so the note still reads well.
// Same rules as fillNote in the Kitchen, so the preview matches what the recipient sees.

export type Person = { name?: string; first_name?: string; last_name?: string; role?: string; company?: string };

export function personParts(p: Person) {
  const words = String(p.name ?? "").trim().split(/\s+/).filter(Boolean);
  return {
    first: String(p.first_name ?? words[0] ?? "").trim(),
    last: String(p.last_name ?? words.slice(1).join(" ")).trim(),
    role: String(p.role ?? "").trim(),
    company: String(p.company ?? "").trim(),
  };
}

const GAP = "\u0000";

export function fillNote(text: unknown, p: Person): string {
  const t = String(text ?? "");
  if (!t) return "";
  const v = personParts(p);
  const map: Record<string, string> = {
    "[first name]": v.first, "[last name]": v.last, "[role]": v.role, "[company]": v.company,
    "{first}": v.first, "{company}": v.company || "your team",
  };
  let out = t;
  for (const [k, val] of Object.entries(map)) {
    const re = new RegExp(k.replace(/[[\]{}]/g, (c) => "\\" + c), "gi");
    out = out.replace(re, val || GAP);
  }
  // A blank detail also drops the little word before it, so "everyone at [company]" reads "everyone"
  return out.replace(/ (at|from|with|of|for|in|as) ?\u0000/gi, "\u0000").replace(/ ?\u0000/g, "").replace(/ +([,.!?])/g, "$1").replace(/ {2,}/g, " ").trim();
}
