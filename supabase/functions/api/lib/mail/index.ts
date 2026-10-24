// Picks the email provider. The choice lives in app_settings (key email_provider), so switching
// providers is a setting change, not a code change, once the new provider's adapter exists.
import { brevo } from "./brevo.ts";
import type { EmailProvider } from "./types.ts";

export const PROVIDERS: Record<string, EmailProvider> = { brevo };
export const DEFAULT_PROVIDER = "brevo";

export function pickProvider(setting: unknown): EmailProvider {
  const key = typeof setting === "string" ? setting : (setting as { pizza?: string } | null)?.pizza;
  return PROVIDERS[String(key ?? "")] ?? PROVIDERS[DEFAULT_PROVIDER];
}

export type { EmailMessage, EmailProvider, SendResult } from "./types.ts";
