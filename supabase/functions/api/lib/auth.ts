// Verifies the short-lived token signed by the SOT-Auth widget in Brilliant Directories.
// Format: base64url(JSON payload) + "." + hex HMAC-SHA256 of the base64url part, keyed with BD_SHARED_SECRET.
// Payload: { uid: number, sub: string, name?: string, adm?: 0|1, exp: unix seconds }
import { b64urlDecode, hmacHex, safeEqual } from "./crypto.ts";

export type BdClaims = { uid: number; sub: string; name?: string; adm?: number; exp: number };

export async function verifyBdToken(token: string | undefined, secret: string, now = Date.now()): Promise<BdClaims | null> {
  if (!token || typeof token !== "string" || token.length > 2000) return null;
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  const body = token.slice(0, dot);
  const sig = token.slice(dot + 1).toLowerCase();
  const expected = await hmacHex(secret, body);
  if (!safeEqual(sig, expected)) return null;
  let claims: BdClaims;
  try {
    claims = JSON.parse(new TextDecoder().decode(b64urlDecode(body)));
  } catch {
    return null;
  }
  if (!claims || typeof claims.uid !== "number" || claims.uid <= 0) return null;
  if (typeof claims.exp !== "number" || claims.exp * 1000 < now) return null;
  if (claims.exp * 1000 > now + 2 * 60 * 60 * 1000) return null; // never more than 2 hours ahead
  claims.sub = String(claims.sub ?? "");
  return claims;
}
