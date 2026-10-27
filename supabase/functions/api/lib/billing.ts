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

// The login email and the sign-up form's "Where did you hear about us?" answer (BD form field sot_heard_from), from the same
// GET {site}/api/v2/user/get/{user_id}. The answer can sit on the user record or in its meta list, so both are checked.
export async function fetchBdProfile(opts: { site: string; key: string; bdUserId: number; fetchFn?: typeof fetch }): Promise<{ email: string | null; heardFrom: string | null } | null> {
  const res = await (opts.fetchFn ?? fetch)(opts.site.replace(/\/+$/, "") + "/api/v2/user/get/" + encodeURIComponent(String(opts.bdUserId)), {
    headers: { "X-Api-Key": opts.key, accept: "application/json" }, signal: AbortSignal.timeout(6000), redirect: "manual",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j || (j.status && j.status !== "success")) return null;
  const m = Array.isArray(j.message) ? j.message[0] : j.message;
  if (!m || typeof m !== "object") return null;
  const e = String(m.email ?? "").trim().toLowerCase();
  return { email: e.includes("@") && e.length <= 200 ? e : null, heardFrom: heardFromOf(m) };
}

export function heardFromOf(user: any): string | null {
  const clean = (v: unknown) => { const t = typeof v === "string" || typeof v === "number" ? String(v).trim().slice(0, 80) : ""; return t || null; };
  if (!user || typeof user !== "object") return null;
  if (clean(user.sot_heard_from)) return clean(user.sot_heard_from);
  for (const k of ["meta", "user_meta", "users_meta", "meta_data"]) {
    const meta = user[k];
    if (Array.isArray(meta)) {
      for (const row of meta) if (row && (row.key === "sot_heard_from" || row.meta_key === "sot_heard_from")) return clean(row.value ?? row.meta_value);
    } else if (meta && typeof meta === "object" && clean(meta.sot_heard_from)) return clean(meta.sot_heard_from);
  }
  return null;
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

// AppSumo: move a member to the free, hidden Lifetime (AppSumo) plan. BD API: {site}/api/v2/user/update, form body user_id and subscription_id.
// BD's docs name the endpoint but not the verb, so PUT is tried first and POST if BD answers 404 or 405.
export async function setBdPlan(opts: { site: string; key: string; bdUserId: number; planId: number; fetchFn?: typeof fetch }): Promise<{ ok: boolean; status: number; method?: string; error?: string }> {
  const url = opts.site.replace(/\/+$/, "") + "/api/v2/user/update";
  let last = { ok: false, status: 0, error: "not_tried" };
  for (const method of ["PUT", "POST"]) {
    try {
      const res = await (opts.fetchFn ?? fetch)(url, {
        method,
        headers: { "X-Api-Key": opts.key, "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
        body: new URLSearchParams({ user_id: String(opts.bdUserId), subscription_id: String(opts.planId) }),
        signal: AbortSignal.timeout(8000),
        redirect: "manual",
      });
      const j = await res.json().catch(() => null);
      if (res.ok && j && (!j.status || j.status === "success")) return { ok: true, status: res.status, method };
      last = { ok: false, status: res.status, error: `bd_api ${method} ${res.status} ${String(j?.message ?? "").slice(0, 120)}` };
      if (res.status !== 404 && res.status !== 405) return last;
    } catch (e) {
      return { ok: false, status: 0, error: "bd_api network " + String(e).slice(0, 120) };
    }
  }
  return last;
}

// A member's BD plan (subscription_id), read back to confirm a plan change. BD API: GET {site}/api/v2/user/get/{user_id}.
export async function fetchBdPlan(opts: { site: string; key: string; bdUserId: number; fetchFn?: typeof fetch }): Promise<number | null> {
  const res = await (opts.fetchFn ?? fetch)(opts.site.replace(/\/+$/, "") + "/api/v2/user/get/" + encodeURIComponent(String(opts.bdUserId)), {
    headers: { "X-Api-Key": opts.key, accept: "application/json" }, signal: AbortSignal.timeout(6000), redirect: "manual",
  });
  const j = await res.json().catch(() => null);
  if (!res.ok || !j || (j.status && j.status !== "success")) return null;
  const m = Array.isArray(j.message) ? j.message[0] : j.message;
  const n = Number(m?.subscription_id ?? NaN);
  return Number.isFinite(n) ? n : null;
}
