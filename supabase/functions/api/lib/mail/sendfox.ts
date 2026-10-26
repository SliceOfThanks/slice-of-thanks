// SendFox adapter: SendFox's Transactional API, which takes the same request as Resend's send-email call.
// Default address https://api.sendfox.com/transactional/resend/emails; the secret SENDFOX_API_URL can change it.
// Tags in this format allow letters, numbers, underscores and dashes only.
import type { EmailMessage, EmailProvider, SendResult } from "./types.ts";

const DEFAULT_URL = "https://api.sendfox.com/transactional/resend/emails";
const tagValue = (t: string) => t.replace(/[^A-Za-z0-9_-]/g, "_").slice(0, 256);
const fromLine = (f: { name: string; email: string }) => (f.name ? `${f.name.replace(/["<>]/g, "")} <${f.email}>` : f.email);

export const sendfox: EmailProvider = {
  key: "sendfox",
  name: "SendFox",
  secret: "SENDFOX_API_KEY",
  async send(msg: EmailMessage, apiKey: string, fetchFn: typeof fetch = fetch, url = DEFAULT_URL): Promise<SendResult> {
    try {
      const res = await fetchFn(url || DEFAULT_URL, {
        method: "POST",
        headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json", accept: "application/json" },
        body: JSON.stringify({
          from: fromLine(msg.from),
          to: [msg.to.name ? `${msg.to.name.replace(/["<>]/g, "")} <${msg.to.email}>` : msg.to.email],
          reply_to: msg.replyTo || undefined,
          subject: msg.subject, html: msg.html, text: msg.text,
          headers: msg.headers,
          tags: (msg.tags ?? []).filter(Boolean).map((t, i) => ({ name: i === 0 ? "kind" : `tag${i}`, value: tagValue(t) })),
        }),
        signal: AbortSignal.timeout(15000),
      });
      const out = await res.json().catch(() => ({}));
      if (!res.ok) return { ok: false, retry: res.status >= 500 || res.status === 429, reached: true, error: `sendfox ${res.status} ${out?.name ?? out?.message ?? ""}`.trim().slice(0, 200) };
      return { ok: true, messageId: String(out.id ?? "") };
    } catch (e) {
      return { ok: false, retry: true, reached: false, error: "sendfox network " + String(e).slice(0, 180) };
    }
  },
};
