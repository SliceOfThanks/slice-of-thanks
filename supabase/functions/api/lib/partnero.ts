// Partnero (referral and partner programs) through its REST API. Our server tells Partnero about customers and sales;
// Partnero runs the dashboard, partner commissions and payouts. Docs: docs.partnero.com, base https://api.partnero.com/v1.
// Partnero answers 2xx even when it ignores a call it cannot match, so a success here means "accepted", not "attributed".

export const PARTNERO_API = "https://api.partnero.com/v1";

export type PartneroResult = { ok: boolean; status: number; error?: string; data?: any };

export async function partneroCall(apiKey: string, method: "GET" | "POST", path: string, body?: unknown, fetchFn: typeof fetch = fetch): Promise<PartneroResult> {
  try {
    const res = await fetchFn(PARTNERO_API + path, {
      method,
      headers: { authorization: `Bearer ${apiKey}`, accept: "application/json", ...(body ? { "content-type": "application/json" } : {}) },
      body: body ? JSON.stringify(body) : undefined,
      signal: AbortSignal.timeout(10_000),
    });
    const data = await res.json().catch(() => null);
    if (res.ok) return { ok: true, status: res.status, data };
    const msg = String(data?.message ?? data?.error ?? JSON.stringify(data?.errors ?? "") ?? "").slice(0, 200);
    return { ok: false, status: res.status, error: `partnero ${res.status} ${msg}`, data };
  } catch (e) {
    return { ok: false, status: 0, error: "partnero network " + String(e).slice(0, 150) };
  }
}

// A customer that is already there is not an error: Partnero says so with 409 or a validation message about the key
function alreadyThere(r: PartneroResult) {
  return r.status === 409 || (r.status === 422 && /already|taken|exist/i.test(r.error ?? ""));
}

export type Customer = { key: string; email: string; name: string; referrerKey?: string | null; partnerKey?: string | null };

export async function sendCustomer(apiKey: string, c: Customer, fetchFn?: typeof fetch): Promise<PartneroResult> {
  const [first, ...rest] = (c.name || "").trim().split(/\s+/);
  const body: Record<string, unknown> = { key: c.key, email: c.email || undefined, name: first || undefined, surname: rest.join(" ") || undefined };
  if (c.referrerKey) body.referring_customer = { key: c.referrerKey };
  if (c.partnerKey) body.partner = { key: c.partnerKey };
  const r = await partneroCall(apiKey, "POST", "/customers", body, fetchFn);
  return r.ok || alreadyThere(r) ? { ...r, ok: true } : r;
}

export type Sale = { customerKey: string; key: string; amountCents: number };

export async function sendSale(apiKey: string, s: Sale, fetchFn?: typeof fetch): Promise<PartneroResult> {
  const r = await partneroCall(apiKey, "POST", "/transactions", {
    customer: { key: s.customerKey }, key: s.key, amount: Math.round(s.amountCents) / 100, amount_units: "usd", action: "sale",
  }, fetchFn);
  return r.ok || alreadyThere(r) ? { ...r, ok: true } : r;
}
