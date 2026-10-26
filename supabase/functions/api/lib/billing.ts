// Reads a member's BD invoices and finds Slice of Thanks Digital Product lines.
// BD API: POST {site}/api/v2/user/transactions, header X-Api-Key, form body user_id.
// Returns { message: { invoices: [{ invoice_details: { id, date, datepaid, total, status, items: [{ description, amount, type }] } }] } }.

export type ProductMatch = { match: string; product: string };
export type BillingLine = { ref: string; product: string; status: "paid" | "refunded"; amountCents: number; paidAt: string | null };

const YEAR_MS = 366 * 24 * 60 * 60 * 1000;

function bdDate(s: unknown): string | null {
  const v = String(s ?? "").trim();
  if (!v || v.startsWith("0000")) return null;
  const d = new Date(v.includes("T") ? v : v.replace(" ", "T") + "Z");
  return isNaN(d.getTime()) ? null : d.toISOString();
}

export function matchProduct(description: unknown, products: ProductMatch[]): string | null {
  const d = String(description ?? "").toLowerCase();
  const sorted = [...products].sort((a, b) => b.match.length - a.match.length);
  for (const p of sorted) if (p.match && d.includes(p.match.toLowerCase())) return p.product;
  return null;
}

export function billingLines(apiResponse: any, products: ProductMatch[], now = Date.now()): BillingLine[] {
  const invoices = apiResponse?.message?.invoices;
  if (!Array.isArray(invoices)) return [];
  const out: BillingLine[] = [];
  for (const inv of invoices) {
    const d = inv?.invoice_details ?? inv;
    const id = String(d?.id ?? "").trim();
    if (!id) continue;
    const status = String(d?.status ?? "").toLowerCase();
    if (status !== "paid" && status !== "refunded") continue;
    const when = bdDate(d?.datepaid) ?? bdDate(d?.date);
    if (when && now - Date.parse(when) > YEAR_MS) continue;
    const items = Array.isArray(d?.items) ? d.items : (Array.isArray(d?.items?.item) ? d.items.item : []);
    items.forEach((it: any, i: number) => {
      const product = matchProduct(it?.description, products);
      if (!product) return;
      const amt = Math.round(parseFloat(String(it?.amount ?? "0")) * 100);
      // Prefer the line's own ID so a reordered invoice can never credit twice
      const ref = it?.id ? `${id}:i${it.id}` : `${id}:${i}`;
      out.push({ ref, product, status: status === "paid" ? "paid" : "refunded", amountCents: isNaN(amt) ? 0 : amt, paidAt: bdDate(d?.datepaid) });
    });
  }
  return out;
}

export async function fetchTransactions(opts: { site: string; key: string; bdUserId: number; fetchFn?: typeof fetch }) {
  const res = await (opts.fetchFn ?? fetch)(opts.site.replace(/\/+$/, "") + "/api/v2/user/transactions", {
    method: "POST",
    headers: { "X-Api-Key": opts.key, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ user_id: String(opts.bdUserId) }),
    signal: AbortSignal.timeout(6000),
    redirect: "manual",
  });
  const j = await res.json().catch(() => null);
  if (res.status >= 300 && res.status < 400) throw new Error(`bd_api redirect to ${res.headers.get("location") ?? "?"}`);
  if (!res.ok || !j) throw new Error(`bd_api ${res.status} ${String(j?.message ?? "").slice(0, 120)}`);
  // A member with no billing record yet also comes back as an error. Either way nothing is granted; the next check tries again.
  if (j.status && j.status !== "success") throw new Error("bd_api " + String(typeof j.message === "string" ? j.message : j.status).slice(0, 120));
  return j;
}

// A member's login email, used to fill "Where replies go" when they have not set one. BD API: GET {site}/api/v2/user/get/{user_id}.
export async function fetchBdEmail(opts: { site: string; key: string; bdUserId: number; fetchFn?: typeof fetch }): Promise<string | null> {
  const res = await (opts.fetchFn ?? fetch)(opts.site.replace(/\/+$/, "") + "/api/v2/user/get/" + encodeURIComponent(String(opts.bdUserId)), {
    headers: { "X-Api-Key": opts.key, accept: "application/json" }, signal: AbortSignal.timeout(6000), redirect: "manual",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j || (j.status && j.status !== "success")) return null;
  const m = Array.isArray(j.message) ? j.message[0] : j.message;
  const e = String(m?.email ?? "").trim().toLowerCase();
  return e.includes("@") && e.length <= 200 ? e : null;
}

export type Invoice = { id: string; number: string; date: string | null; paidAt: string | null; status: string; totalCents: number; items: { description: string; amountCents: number }[] };

const cents = (v: unknown) => { const n = Math.round(parseFloat(String(v ?? "0")) * 100); return isNaN(n) ? 0 : n; };

// The member's invoices for the in-app Billing card: newest first, last 24 months, no card or payment details.
export function invoiceList(apiResponse: any, now = Date.now()): Invoice[] {
  const invoices = apiResponse?.message?.invoices;
  if (!Array.isArray(invoices)) return [];
  const out: Invoice[] = [];
  for (const inv of invoices) {
    const d = inv?.invoice_details ?? inv;
    const id = String(d?.id ?? "").trim();
    if (!id) continue;
    const date = bdDate(d?.date);
    if (date && now - Date.parse(date) > 2 * YEAR_MS) continue;
    const items = Array.isArray(d?.items) ? d.items : (Array.isArray(d?.items?.item) ? d.items.item : []);
    out.push({
      id, number: String(d?.invoicenum || id), date, paidAt: bdDate(d?.datepaid),
      status: String(d?.status ?? "").slice(0, 20), totalCents: cents(d?.total),
      items: items.slice(0, 10).map((it: any) => ({ description: String(it?.description ?? "").slice(0, 120), amountCents: cents(it?.amount) })),
    });
  }
  return out.sort((a, b) => String(b.date ?? "").localeCompare(String(a.date ?? ""))).slice(0, 50);
}

// Delete my account: removes the member's BD login and listing. BD API: DELETE {site}/api/v2/user/delete, form body user_id.
export async function deleteBdUser(opts: { site: string; key: string; bdUserId: number; fetchFn?: typeof fetch }) {
  const res = await (opts.fetchFn ?? fetch)(opts.site.replace(/\/+$/, "") + "/api/v2/user/delete", {
    method: "DELETE",
    headers: { "X-Api-Key": opts.key, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ user_id: String(opts.bdUserId) }),
    signal: AbortSignal.timeout(8000),
    redirect: "manual",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j || (j.status && j.status !== "success")) throw new Error(`bd_api ${res.status} ${String(j?.message ?? "").slice(0, 120)}`);
  return j;
}
