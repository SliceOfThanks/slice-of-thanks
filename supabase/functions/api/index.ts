// Slice of Thanks API. One Edge Function, many routes.
// Auth: members prove who they are with a token signed by the SOT-Auth widget in BD.
// Recipients use their private link token. Everything else is refused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyBdToken } from "./lib/auth.ts";
import { recipientToken, tokenHash } from "./lib/crypto.ts";
import { buildEmail, SITE } from "./lib/email.ts";
import { dataUrlToBlob, publitioUpload } from "./lib/publitio.ts";
import { billingLines, fetchTransactions, type ProductMatch } from "./lib/billing.ts";

const VERSION = "api-0.4.1";
const ASSETS = "https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@6ee4e204b57bdb3c50150e9a5fe275383e9b22e9/brand";
const ORIGINS = ["https://www.sliceofthanks.app", "https://sliceofthanks.app"];
const SENDER_EMAIL = "pizza@sliceofthanks.app";

const env = (k: string) => Deno.env.get(k) ?? "";
const db = () => createClient(env("SUPABASE_URL"), env("SUPABASE_SERVICE_ROLE_KEY"), { auth: { persistSession: false } });

function cors(req: Request) {
  const o = req.headers.get("origin") ?? "";
  return {
    "Access-Control-Allow-Origin": ORIGINS.includes(o) ? o : ORIGINS[0],
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "content-type, x-sot-auth",
    "Vary": "Origin",
  };
}
const json = (req: Request, body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors(req), "content-type": "application/json" } });

async function rpc<T = unknown>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await db().rpc(fn, args);
  if (error) throw new Error(fn + ": " + error.message);
  return data as T;
}

async function member(req: Request) {
  const claims = await verifyBdToken(req.headers.get("x-sot-auth") ?? undefined, env("BD_SHARED_SECRET"));
  if (!claims) return null;
  const s = await rpc<Record<string, any>>("sot_session", { p: { bd_user_id: claims.uid, bd_sub_id: claims.sub, name: claims.name ?? "", legal_signup: claims.lg === 1, joined: typeof claims.jn === "string" ? claims.jn : "" } });
  return { claims, session: s };
}

// Credits paid BD Digital Products (email packs, Special Delivery) and takes back refunded ones.
// Runs when the Kitchen opens (at most every 10 minutes) and right after a member comes back from checkout.
async function syncBilling(memberId: string, bdUserId: number, minSeconds: number): Promise<{ checked: boolean; changed: boolean }> {
  if (!env("BD_API_KEY")) return { checked: false, changed: false };
  const due = await rpc<boolean | null>("sot_billing_claim", { p_member: memberId, p_seconds: minSeconds });
  if (!due) return { checked: false, changed: false };
  let changed = false;
  try {
    const products = (await rpc<ProductMatch[] | null>("sot_setting", { p_env: "live", p_key: "bd_products" })) ?? [];
    const tx = await fetchTransactions({ site: env("BD_SITE_URL") || SITE, key: env("BD_API_KEY"), bdUserId });
    for (const line of billingLines(tx, products)) {
      if (line.status === "paid") {
        const r = await rpc<Record<string, any>>("sot_grant_purchase", { p_member: memberId, p_ref: line.ref, p_product: line.product, p_amount_cents: line.amountCents, p_paid_at: line.paidAt });
        if (r?.granted) changed = true;
      } else {
        const r = await rpc<Record<string, any>>("sot_refund_purchase", { p_ref: line.ref });
        if (r?.changed) changed = true;
      }
    }
  } catch (e) {
    console.error("billing sync", String(e));
  }
  return { checked: true, changed };
}

async function deliver(sendId: string, pizzaImageUrl?: string) {
  const job = await rpc<Record<string, any> | null>("sot_claim_send", { p_send: sendId });
  if (!job) return { delivered: false, reason: "not_due" };
  const token = await recipientToken(env("LINK_SECRET"), sendId);
  const snap = job.snapshot ?? {};
  const mail = buildEmail({
    locale: job.locale, recipientName: job.name, sender: snap.sender ?? {}, isTest: job.is_test,
    link: `${SITE}/p?t=${encodeURIComponent(token)}`,
    unsubscribeSender: `${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=sender`,
    unsubscribeAll: `${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=global`,
    pizzaImageUrl, potatoImageUrl: `${ASSETS}/characters/potato-delivery-side.png`,
  });
  const fromName = (snap.sender?.send_as === "business" && snap.sender?.business) ? snap.sender.business : (snap.sender?.name || "Slice of Thanks");
  try {
    const res = await fetch("https://api.brevo.com/v3/smtp/email", {
      method: "POST",
      headers: { "api-key": env("BREVO_API_KEY"), "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify({
        sender: { name: `${fromName} via Slice of Thanks`, email: SENDER_EMAIL },
        to: [{ email: job.email, name: job.name || undefined }],
        replyTo: job.reply_to ? { email: job.reply_to } : undefined,
        subject: mail.subject, htmlContent: mail.html, textContent: mail.text,
        headers: { "List-Unsubscribe": `<${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=sender>` },
        tags: [job.is_test ? "test" : "live", job.send_type],
      }),
    });
    const out = await res.json().catch(() => ({}));
    if (!res.ok) {
      await rpc("sot_mark_failed", { p_send: sendId, p_reason: `brevo ${res.status} ${out?.code ?? ""}`, p_retry: res.status >= 500 || res.status === 429 });
      return { delivered: false, reason: "provider_error" };
    }
    await rpc("sot_mark_sent", { p_send: sendId, p_provider_id: String(out.messageId ?? "") });
    return { delivered: true };
  } catch (e) {
    await rpc("sot_mark_failed", { p_send: sendId, p_reason: String(e).slice(0, 200), p_retry: true });
    return { delivered: false, reason: "network" };
  }
}

async function route(req: Request, path: string): Promise<Response> {
  const body = req.method === "POST" ? await req.json().catch(() => ({})) : {};

  if (path === "/health") return json(req, { ok: true, version: VERSION });

  // Which app version to load. Testers get staging, everyone else gets live.
  if (path === "/bootstrap" && req.method === "GET") {
    let envName = "live";
    const pass = req.headers.get("x-sot-auth") ?? "";
    const claims = await verifyBdToken(pass || undefined, env("BD_SHARED_SECRET"));
    // Sign in report from SOT-App 1.2.0: which checks failed, by name only
    const why = (new URL(req.url).searchParams.get("why") ?? "").slice(0, 300);
    if (why) console.log("auth_why", why, pass ? (claims ? "pass_valid" : "pass_invalid") : "pass_empty");
    if (claims) {
      const { data } = await db().from("testers").select("bd_user_id").eq("bd_user_id", claims.uid).maybeSingle();
      if (data) envName = "staging";
    }
    const code = await rpc<Record<string, string>>("sot_setting", { p_env: envName, p_key: "code_version" });
    return new Response(JSON.stringify({ env: envName, ...code }), { headers: { ...cors(req), "content-type": "application/json", "cache-control": "max-age=60" } });
  }

  // Recipient routes: private link token only
  if (path === "/p" && req.method === "GET") {
    const t = new URL(req.url).searchParams.get("t") ?? "";
    const data = await rpc("sot_recipient_get", { p_hash: await tokenHash(t) });
    return data ? json(req, data) : json(req, { error: "not_found" }, 404);
  }
  if (path === "/p/event" && req.method === "POST") {
    const r = await rpc("sot_recipient_event", { p_hash: await tokenHash(String(body.t ?? "")), p_type: String(body.type ?? ""), p_slice: Number.isInteger(body.slice) ? body.slice : null });
    return json(req, r);
  }
  if (path === "/unsubscribe" && req.method === "POST") {
    const r = await rpc("sot_unsubscribe", { p_hash: await tokenHash(String(body.t ?? "")), p_scope: body.s === "global" ? "global" : "sender" });
    return json(req, r);
  }

  // Member routes
  const m = await member(req);
  if (!m) return json(req, { error: "not_signed_in" }, 401);
  const memberId = m.session.member_id as string;

  if (path === "/session") {
    const b = await syncBilling(memberId, m.claims.uid, 600);
    return json(req, b.changed ? (await member(req))!.session : m.session);
  }
  if (path === "/purchases/check" && req.method === "POST") {
    const b = await syncBilling(memberId, m.claims.uid, 4);
    return json(req, { ...(b.changed ? (await member(req))!.session : m.session), billing_checked: b.checked });
  }
  if (path === "/terms/accept" && req.method === "POST") {
    const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim() || null;
    const r = await rpc("sot_accept_terms", { p_member: memberId, p_method: "kitchen_checkbox", p_at: null, p_ip: ip, p_ua: (req.headers.get("user-agent") ?? "").slice(0, 300) || null });
    return json(req, r);
  }
  if (path === "/profile" && req.method === "POST") {
    await rpc("sot_update_profile", { p_member: memberId, p: body.profile ?? {} });
    return json(req, { ok: true });
  }
  if (path === "/logo" && req.method === "POST") {
    const blob = dataUrlToBlob(String(body.data_url ?? ""), 1_000_000);
    if (!blob) return json(req, { error: "bad_image" }, 400);
    const url = await publitioUpload({ key: env("PUBLITIO_API_KEY"), secret: env("PUBLITIO_API_SECRET"), blob, folder: "slice-of-thanks", title: `logo-${memberId}` });
    await rpc("sot_update_profile", { p_member: memberId, p: { logo_url: url } });
    return json(req, { ok: true, logo_url: url });
  }
  if (path === "/send" && req.method === "POST") {
    const sendId = crypto.randomUUID();
    const token = await recipientToken(env("LINK_SECRET"), sendId);
    const idem = String(body.idem ?? "").slice(0, 100) || sendId;
    const payload = {
      pizza: body.pizza ?? {}, box: body.box ?? {}, recipient: body.recipient ?? {}, consent: body.consent ?? null,
      send_type: body.send_type, special_delivery: !!body.special_delivery, scheduled_for: body.scheduled_for ?? null,
      is_test: !!body.is_test, source: "kitchen",
    };
    const r = await rpc<Record<string, any>>("sot_create_send", {
      p_member: memberId, p_env: m.session.env, p_send_id: sendId, p_token_hash: await tokenHash(token), p_idem: `${memberId}:${idem}`, p: payload,
    });
    if (!r.ok || r.duplicate || !r.due_now) return json(req, r);
    let imageUrl: string | undefined;
    const blob = body.image_data_url ? dataUrlToBlob(String(body.image_data_url), 1_500_000) : null;
    if (blob) {
      try { imageUrl = await publitioUpload({ key: env("PUBLITIO_API_KEY"), secret: env("PUBLITIO_API_SECRET"), blob, folder: "slice-of-thanks", title: `pizza-${sendId}` }); } catch { /* email still goes without the picture */ }
    }
    const d = await deliver(sendId, imageUrl);
    return json(req, { ...r, ...d });
  }
  return json(req, { error: "not_found" }, 404);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: cors(req) });
  const url = new URL(req.url);
  const path = url.pathname.replace(/^\/api/, "").replace(/^\/functions\/v1\/api/, "") || "/";
  try {
    return await route(req, path);
  } catch (e) {
    console.error(String(e));
    return json(req, { error: "server_error" }, 500);
  }
});
