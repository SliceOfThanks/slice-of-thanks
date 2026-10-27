// Brevo adapter: transactional email API v3.
import type { EmailMessage, EmailProvider, SendResult } from "./types.ts";

export const brevo: EmailProvider = {
  key: "brevo",
  name: "Brevo",
  secret: "BREVO_API_KEY",
  async send(msg: EmailMessage, apiKey: string, fetchFn: typeof fetch = fetch): Promise<SendResult> {
    try {
      const res = await fetchFn("https://api.brevo.com/v3/smtp/email", {
        method: "POST",
        headers: { "api-key": apiKey, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          sender: msg.from,
          to: [{ email: msg.to.email, name: msg.to.name || undefined }],
          replyTo: msg.replyTo ? { email: msg.replyTo } : undefined,
          subject: msg.subject, htmlContent: msg.html, textContent: msg.text,
          headers: msg.headers, tags: msg.tags,
        }),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, retry: res.status >= 500 || res.status === 429, reached: true, error: `brevo ${res.status} ${out?.code ?? ""}`.trim() };
      return { ok: true, messageId: String(out.messageId ?? "") };
    } catch (e) {
      return { ok: false, retry: true, reached: false, error: "brevo network " + String(e).slice(0, 180) };
    }
  },
};

// What the Brevo plan has left to send this cycle (owner dashboard). Reads GET /v3/account: the plan entry with
// creditsType "sendLimit" holds the remaining sends and the day the plan renews.
export type Credits = { ok: boolean; remaining?: number | null; resets?: string | null; company?: string | null; email?: string | null; error?: string };
export async function brevoCredits(apiKey: string, fetchFn: typeof fetch = fetch): Promise<Credits> {
  try {
    const res = await fetchFn("https://api.brevo.com/v3/account", { headers: { "api-key": apiKey, accept: "application/json" }, signal: AbortSignal.timeout(6000) });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: `brevo ${res.status}` };
    const plans: Array<Record<string, unknown>> = Array.isArray(out?.plan) ? out.plan : [];
    const p = plans.find((x) => x?.creditsType === "sendLimit") ?? plans.find((x) => typeof x?.credits === "number");
    const remaining = p && typeof p.credits === "number" ? p.credits : null;
    const resets = p && typeof p.endDate === "string" && /^\d{4}-\d{2}-\d{2}/.test(p.endDate) ? p.endDate.slice(0, 10) : null;
    return { ok: remaining !== null, remaining, resets, company: typeof out?.companyName === "string" ? out.companyName : null, email: typeof out?.email === "string" ? out.email : null, error: remaining === null ? "no credits on the plan" : undefined };
  } catch (e) {
    return { ok: false, error: "brevo network " + String(e).slice(0, 120) };
  }
}
