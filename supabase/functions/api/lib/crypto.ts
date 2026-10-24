// Small crypto helpers: base64url, HMAC-SHA256, SHA-256, random tokens.

const enc = new TextEncoder();

export function b64url(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replaceAll("+", "-").replaceAll("/", "_").replaceAll("=", "");
}

export function b64urlDecode(s: string): Uint8Array {
  const pad = s.length % 4 === 0 ? "" : "=".repeat(4 - (s.length % 4));
  const bin = atob(s.replaceAll("-", "+").replaceAll("_", "/") + pad);
  return Uint8Array.from(bin, (c) => c.charCodeAt(0));
}

async function hmacKey(secret: string) {
  return await crypto.subtle.importKey("raw", enc.encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
}

export async function hmac(secret: string, data: string): Promise<Uint8Array> {
  const sig = await crypto.subtle.sign("HMAC", await hmacKey(secret), enc.encode(data));
  return new Uint8Array(sig);
}

export async function hmacHex(secret: string, data: string): Promise<string> {
  return [...await hmac(secret, data)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha256Hex(data: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(data));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export async function sha1Hex(data: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-1", enc.encode(data));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}

// Recipient link token: derived from the send ID so scheduled sends can rebuild it.
export async function recipientToken(linkSecret: string, sendId: string): Promise<string> {
  const sig = (await hmac(linkSecret, "recipient:" + sendId)).slice(0, 18);
  return sendId.replaceAll("-", "") + "." + b64url(sig);
}

export async function tokenHash(token: string): Promise<string> {
  return await sha256Hex("sot-recipient:" + token);
}
