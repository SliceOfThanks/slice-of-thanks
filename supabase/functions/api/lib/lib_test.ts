import { ok as assert, deepStrictEqual as assertEquals } from "node:assert";
import { verifyBdToken } from "./auth.ts";
import { b64url, hmacHex, recipientToken, tokenHash } from "./crypto.ts";
import { buildEmail, senderLabel } from "./email.ts";
import { dataUrlToBlob, publitioSignature } from "./publitio.ts";

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
