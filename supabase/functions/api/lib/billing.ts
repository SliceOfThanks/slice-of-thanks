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
