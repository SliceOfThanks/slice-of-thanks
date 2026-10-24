import { ok as assert, deepStrictEqual as assertEquals } from "node:assert";
import { verifyBdToken } from "./auth.ts";
import { b64url, hmacHex, recipientToken, tokenHash } from "./crypto.ts";
import { buildEmail, senderLabel } from "./email.ts";
import { dataUrlToBlob, publitioSignature } from "./publitio.ts";
import { billingLines, matchProduct } from "./billing.ts";

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
