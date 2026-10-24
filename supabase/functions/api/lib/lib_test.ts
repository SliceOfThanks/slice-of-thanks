import { ok as assert, deepStrictEqual as assertEquals } from "node:assert";
import { verifyBdToken } from "./auth.ts";
import { b64url, hmacHex, recipientToken, tokenHash } from "./crypto.ts";
import { buildEmail, senderLabel } from "./email.ts";
import { dataUrlToBlob, publitioSignature } from "./publitio.ts";
import { billingLines, invoiceList, matchProduct } from "./billing.ts";

const SECRET = "abc123DEF456ghi789JKL012mno345PQR678stu9";
async function sign(payload: object, secret = SECRET) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  return body + "." + await hmacHex(secret, body);
}
const now = Date.now();
const exp = Math.floor(now / 1000) + 600;

Deno.test("valid token passes", async () => {
  const c = await verifyBdToken(await sign({ uid: 42, sub: 3, name: "Stacey", exp }), SECRET, now);
  assertEquals(c?.uid, 42);
  assertEquals(c?.sub, "3");
});
Deno.test("wrong secret fails", async () => {
  assertEquals(await verifyBdToken(await sign({ uid: 42, sub: "3", exp }, "other"), SECRET, now), null);
});
Deno.test("tampered payload fails", async () => {
  const t = await sign({ uid: 42, sub: "3", exp });
  const forged = b64url(new TextEncoder().encode(JSON.stringify({ uid: 1, sub: "3", exp }))) + t.slice(t.indexOf("."));
  assertEquals(await verifyBdToken(forged, SECRET, now), null);
});
Deno.test("expired and far-future tokens fail", async () => {
  assertEquals(await verifyBdToken(await sign({ uid: 42, sub: "3", exp: Math.floor(now / 1000) - 1 }), SECRET, now), null);
  assertEquals(await verifyBdToken(await sign({ uid: 42, sub: "3", exp: Math.floor(now / 1000) + 99999 }), SECRET, now), null);
});
Deno.test("garbage fails", async () => {
  for (const g of [undefined, "", "abc", ".", "x.y", "a".repeat(3000)]) assertEquals(await verifyBdToken(g as string, SECRET, now), null);
});
Deno.test("recipient token is stable and hashes differ", async () => {
  const id = "3f2b1c4d-0000-4000-8000-123456789abc";
  const a = await recipientToken("link", id), b = await recipientToken("link", id), c = await recipientToken("other", id);
  assertEquals(a, b); assert(a !== c);
  assert(!a.includes("+") && !a.includes("/") && !a.includes("="));
  assertEquals((await tokenHash(a)).length, 64);
});
Deno.test("email has legal footer, escapes, and Spanish", () => {
  const e = buildEmail({ sender: { name: "Stacey <b>", business: "Mountain Studio", send_as: "business", mailing_address: "PO Box 1", show_made_with: true },
    link: "https://www.sliceofthanks.app/p?t=x", unsubscribeSender: "u1", unsubscribeAll: "u2", recipientName: "Jordan" });
  assert(e.subject.startsWith("Mountain Studio"));
  assert(e.html.includes("PO Box 1") && e.html.includes("u1") && e.html.includes("u2") && e.html.includes("/privacy") && e.html.includes("/terms"));
  assert(!e.html.includes("<b>") && e.html.includes("&lt;b&gt;"));
  assert(e.html.includes("Make your own"));
  const es = buildEmail({ locale: "es", sender: { name: "Stacey" }, link: "l", unsubscribeSender: "a", unsubscribeAll: "b" });
  assert(es.subject.includes("te envió"));
  assertEquals(senderLabel({ name: "Stacey", business: "Biz", send_as: "person" }), "Stacey");
});
Deno.test("publitio signature and image parsing", async () => {
  assertEquals((await publitioSignature("s", "1", "2")).length, 40);
  assert(dataUrlToBlob("data:image/png;base64,iVBORw0KGgo=") !== null);
  assertEquals(dataUrlToBlob("data:text/html;base64,PGI+"), null);
  assertEquals(dataUrlToBlob("javascript:alert(1)"), null);
});

const PRODUCTS = [
  { match: "1,000 email pack", product: "pack_1000" }, { match: "1000 email pack", product: "pack_1000" },
  { match: "500 email pack", product: "pack_500" }, { match: "100 email pack", product: "pack_100" },
  { match: "special delivery", product: "special_delivery" },
];
Deno.test("product names match, longest first", () => {
  assertEquals(matchProduct("Digital Product: 1,000 Email Pack", PRODUCTS), "pack_1000");
  assertEquals(matchProduct("100 Email Pack", PRODUCTS), "pack_100");
  assertEquals(matchProduct("Special Delivery (one pizza)", PRODUCTS), "special_delivery");
  assertEquals(matchProduct("The Whole Pie monthly", PRODUCTS), null);
});
Deno.test("billing lines: paid and refunded, skips unpaid, old and plan invoices", () => {
  const now = Date.parse("2026-10-24T00:00:00Z");
  const api = { status: "success", message: { total: 4, invoices: [
    { invoice_details: { id: 71, date: "2026-10-20", datepaid: "2026-10-20 10:00:00", status: "Paid", items: [{ description: "500 Email Pack", amount: "15.00", type: "Item" }, { description: "Special Delivery", amount: "2.99" }] } },
    { invoice_details: { id: 72, date: "2026-10-21", datepaid: "0000-00-00 00:00:00", status: "Unpaid", items: [{ description: "100 Email Pack", amount: "5.00" }] } },
    { invoice_details: { id: 73, date: "2026-10-01", datepaid: "2026-10-01 09:00:00", status: "Refunded", items: [{ description: "The Whole Pie", amount: "9.00" }, { description: "100 Email Pack", amount: "5.00" }] } },
    { invoice_details: { id: 9, date: "2025-01-01", datepaid: "2025-01-01 09:00:00", status: "Paid", items: [{ description: "100 Email Pack", amount: "5.00" }] } },
  ] } };
  assertEquals(billingLines(api, PRODUCTS, now), [
    { ref: "71:0", product: "pack_500", status: "paid", amountCents: 1500, paidAt: "2026-10-20T10:00:00.000Z" },
    { ref: "71:1", product: "special_delivery", status: "paid", amountCents: 299, paidAt: "2026-10-20T10:00:00.000Z" },
    { ref: "73:1", product: "pack_100", status: "refunded", amountCents: 500, paidAt: "2026-10-01T09:00:00.000Z" },
  ]);
  assertEquals(billingLines({ status: "error" }, PRODUCTS, now), []);
});

import { brevo } from "./mail/brevo.ts";
import { pickProvider } from "./mail/index.ts";
const MSG = { from: { name: "Stacey via Slice of Thanks", email: "pizza@sliceofthanks.app" }, to: { email: "pat@example.com", name: "Pat" }, replyTo: "s@example.com", subject: "Hi", html: "<p>Hi</p>", text: "Hi", headers: { "List-Unsubscribe": "<x>" }, tags: ["live", "one_to_one"] };
const fakeFetch = (status: number, body: unknown, seen?: { url?: string; init?: RequestInit }) =>
  (async (url: string, init: RequestInit) => { if (seen) { seen.url = url; seen.init = init; } return new Response(JSON.stringify(body), { status }); }) as unknown as typeof fetch;

Deno.test("provider choice comes from the setting, Brevo by default", () => {
  assertEquals(pickProvider({ pizza: "brevo" }).key, "brevo");
  assertEquals(pickProvider("brevo").key, "brevo");
  assertEquals(pickProvider(null).key, "brevo");
  assertEquals(pickProvider({ pizza: "not_built_yet" }).key, "brevo");
});
Deno.test("brevo adapter: request shape and message id", async () => {
  const seen: { url?: string; init?: RequestInit } = {};
  const r = await brevo.send(MSG, "KEY", fakeFetch(201, { messageId: "<abc@brevo>" }, seen));
  assertEquals(r, { ok: true, messageId: "<abc@brevo>" });
  assertEquals(seen.url, "https://api.brevo.com/v3/smtp/email");
  assertEquals((seen.init!.headers as Record<string, string>)["api-key"], "KEY");
  const b = JSON.parse(String(seen.init!.body));
  assertEquals(b.sender, MSG.from);
  assertEquals(b.to, [{ email: "pat@example.com", name: "Pat" }]);
  assertEquals(b.replyTo, { email: "s@example.com" });
  assertEquals([b.subject, b.htmlContent, b.textContent], ["Hi", "<p>Hi</p>", "Hi"]);
  assertEquals(b.tags, ["live", "one_to_one"]);
});
Deno.test("brevo adapter: retries only temporary failures", async () => {
  assertEquals(await brevo.send(MSG, "K", fakeFetch(429, { code: "too_many_requests" })), { ok: false, retry: true, error: "brevo 429 too_many_requests" });
  assertEquals(await brevo.send(MSG, "K", fakeFetch(503, {})), { ok: false, retry: true, error: "brevo 503" });
  assertEquals(await brevo.send(MSG, "K", fakeFetch(400, { code: "invalid_parameter" })), { ok: false, retry: false, error: "brevo 400 invalid_parameter" });
  const net = await brevo.send(MSG, "K", (async () => { throw new Error("down"); }) as unknown as typeof fetch);
  assert(!net.ok && net.retry);
});

Deno.test("invoice list for the Billing card: newest first, no old ones", () => {
  const now = Date.parse("2026-10-24T00:00:00Z");
  const api = { status: "success", message: { invoices: [
    { invoice_details: { id: 5, invoicenum: "", date: "2026-09-01", datepaid: "2026-09-01 10:00:00", status: "Paid", total: "9.00", items: [{ description: "The Whole Pie", amount: "9.00" }] } },
    { invoice_details: { id: 7, invoicenum: "INV-7", date: "2026-10-20", datepaid: "0000-00-00 00:00:00", status: "Unpaid", total: "2.99", items: [{ description: "Special Delivery", amount: "2.99" }] } },
    { invoice_details: { id: 1, date: "2023-01-01", datepaid: "2023-01-01", status: "Paid", total: "9.00", items: [] } },
  ] } };
  assertEquals(invoiceList(api, now), [
    { id: "7", number: "INV-7", date: "2026-10-20T00:00:00.000Z", paidAt: null, status: "Unpaid", totalCents: 299, items: [{ description: "Special Delivery", amountCents: 299 }] },
    { id: "5", number: "5", date: "2026-09-01T00:00:00.000Z", paidAt: "2026-09-01T10:00:00.000Z", status: "Paid", totalCents: 900, items: [{ description: "The Whole Pie", amountCents: 900 }] },
  ]);
});
