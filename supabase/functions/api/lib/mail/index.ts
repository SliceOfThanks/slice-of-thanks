// Picks the email service. The choice lives in app_settings (key email_provider): { pizza: "brevo", fallback: ["sendfox"] }.
// Switching or reordering services is a setting change, not a code change, once a service's adapter exists.
// sendWithFallback tries the main service, then each backup in order, but only when the service before it clearly refused
// the email (it answered with an error). A timeout could mean it went out, so that email is retried later instead, never sent twice.
import { brevo } from "./brevo.ts";
import { sendfox } from "./sendfox.ts";
import type { EmailMessage, EmailProvider, SendResult } from "./types.ts";

export const PROVIDERS: Record<string, EmailProvider> = { brevo, sendfox };
export const DEFAULT_PROVIDER = "brevo";

export function pickProvider(setting: unknown): EmailProvider {
  const key = typeof setting === "string" ? setting : (setting as { pizza?: string } | null)?.pizza;
  return PROVIDERS[String(key ?? "")] ?? PROVIDERS[DEFAULT_PROVIDER];
}

// The main service first, then the backups, without repeats or unknown names
export function providerOrder(setting: unknown): EmailProvider[] {
  const s = (typeof setting === "string" ? { pizza: setting } : setting ?? {}) as { pizza?: string; fallback?: unknown };
  const keys = [String(s.pizza ?? DEFAULT_PROVIDER), ...(Array.isArray(s.fallback) ? s.fallback.map(String) : [])];
  const out: EmailProvider[] = [];
  for (const k of keys) if (PROVIDERS[k] && !out.includes(PROVIDERS[k])) out.push(PROVIDERS[k]);
  return out.length ? out : [PROVIDERS[DEFAULT_PROVIDER]];
}

export type SentVia = SendResult & { provider: string; tried: string[] };

export async function sendWithFallback(msg: EmailMessage, setting: unknown, env: (k: string) => string, fetchFn?: typeof fetch): Promise<SentVia> {
  const tried: string[] = [];
  let last: SendResult = { ok: false, retry: true, reached: false, error: "no email service has a key" };
  let lastKey = DEFAULT_PROVIDER;
  for (const p of providerOrder(setting)) {
    const key = env(p.secret);
    if (!key) continue; // a backup without its key saved is skipped
    tried.push(p.key);
    const r = await p.send(msg, key, fetchFn, p.key === "sendfox" ? env("SENDFOX_API_URL") || undefined : undefined);
    last = r; lastKey = p.key;
    if (r.ok) return { ...r, provider: p.key, tried };
    if (!r.reached) break; // unknown whether it went out: retry later, do not hand it to another service
  }
  return { ...last, provider: lastKey, tried };
}

export type { EmailMessage, EmailProvider, SendResult } from "./types.ts";
