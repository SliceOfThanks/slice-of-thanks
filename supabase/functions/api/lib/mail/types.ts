// The one email shape every provider adapter accepts. Templates, credits, suppressions and
// recipient tracking all live in Slice of Thanks; an adapter only hands a finished email to a service.
// To add a provider: write lib/mail/<name>.ts exporting an EmailProvider, add it to PROVIDERS in
// lib/mail/index.ts, save its API key as a Supabase secret, then set app_settings email_provider.

export type EmailMessage = {
  from: { name: string; email: string };
  to: { email: string; name?: string };
  replyTo?: string;
  subject: string;
  html: string;
  text: string;
  headers?: Record<string, string>;
  tags?: string[];
};

export type SendResult =
  | { ok: true; messageId: string }
  // retry: true only for temporary failures (rate limit, provider outage, network)
  | { ok: false; retry: boolean; error: string };

export type EmailProvider = {
  key: string;
  name: string;
  secret: string; // Supabase secret that holds this provider's API key
  send(msg: EmailMessage, apiKey: string, fetchFn?: typeof fetch): Promise<SendResult>;
};
