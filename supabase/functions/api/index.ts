// Slice of Thanks API. One Edge Function, many routes.
// Auth: members prove who they are with a token signed by the SOT-Auth widget in BD.
// Recipients use their private link token. Everything else is refused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyBdToken } from "./lib/auth.ts";
import { recipientToken, tokenHash } from "./lib/crypto.ts";
import { buildEmail, buildWaitingEmail, SITE } from "./lib/email.ts";
import { dataUrlToBlob, publitioUpload } from "./lib/publitio.ts";
import { billingLines, fetchTransactions, invoiceList, type ProductMatch } from "./lib/billing.ts";
import { pickProvider } from "./lib/mail/index.ts";
import { fillNote } from "./lib/merge.ts";
import { authorizeUrl, CAL, CalendarAuthError, exchangeCode, isProvider, listContacts, listMeetings, needsRefresh, refreshTokens, type Provider, type Tokens, whoAmI } from "./lib/calendar.ts";

const VERSION = "api-0.12.0";
const ASSETS = "https://cdn.jsdelivr.net/gh/SliceOfThanks/slice-of-thanks@b2daf45f83bb13e416264136401456c95f2cde3f/brand";
const ORIGINS = ["https://www.sliceofthanks.app", "https://sliceofthanks.app"];
const SENDER_EMAIL = "pizza@sliceofthanks.app";
// BD's own domain. The www address redirects, and the redirect turns the API POST into a GET (405).
const BD_API_SITE = "https://sliceofthanks.app";

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
    const tx = await fetchTransactions({ site: env("BD_SITE_URL") || BD_API_SITE, key: env("BD_API_KEY"), bdUserId });
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
    locale: job.locale, recipientName: job.name, sender: snap.sender ?? {}, isTest: job.is_test, occasion: snap.box?.sticker,
    link: `${SITE}/p?t=${encodeURIComponent(token)}`,
    unsubscribeSender: `${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=sender`,
    unsubscribeAll: `${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=global`,
    pizzaImageUrl: pizzaImageUrl ?? snap.image_url ?? undefined, potatoImageUrl: `${ASSETS}/characters/potato-delivery-side-email-logo.png`,
    markImageUrl: `${ASSETS}/logo/slice-of-thanks-logo.png`,
  });
  const fromName = (snap.sender?.send_as === "business" && snap.sender?.business) ? snap.sender.business : (snap.sender?.name || "Slice of Thanks");
  // Which service sends is a setting (app_settings email_provider); everything above is ours
  const provider = pickProvider(await rpc("sot_setting", { p_env: "live", p_key: "email_provider" }).catch(() => null));
  const r = await provider.send({
    from: { name: `${fromName} via Slice of Thanks`, email: SENDER_EMAIL },
    to: { email: job.email, name: job.name || undefined },
    replyTo: job.reply_to || undefined,
    subject: mail.subject, html: mail.html, text: mail.text,
    headers: { "List-Unsubscribe": `<${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=sender>` },
    tags: [job.is_test ? "test" : "live", job.send_type],
  }, env(provider.secret));
  if (!r.ok) {
    await rpc("sot_mark_failed", { p_send: sendId, p_reason: r.error, p_retry: r.retry });
    return { delivered: false, reason: r.retry ? "provider_retrying" : "provider_error" };
  }
  await rpc("sot_mark_sent_via", { p_send: sendId, p_provider_id: r.messageId, p_provider: provider.key });
  return { delivered: true };
}

// One send from a member: the Kitchen, the People tab, or a row of a CSV list
async function createSend(memberId: string, envName: string, body: any, source: string, idem: string) {
  const sendId = crypto.randomUUID();
  const token = await recipientToken(env("LINK_SECRET"), sendId);
  const recipient = body.recipient ?? {};
  // Each person gets their own note: [first name], [last name], [role] and [company] are filled in here
  const box = { ...(body.box ?? {}) };
  if (typeof box.note === "string") box.note = fillNote(box.note, recipient).slice(0, 400);
  const payload = {
    pizza: body.pizza ?? {}, box, recipient, consent: body.consent ?? null,
    send_type: body.send_type, special_delivery: !!body.special_delivery, scheduled_for: body.scheduled_for ?? null,
    is_test: !!body.is_test, source, label: typeof body.label === "string" ? body.label.slice(0, 120) : null,
  };
  const r = await rpc<Record<string, any>>("sot_create_send", {
    p_member: memberId, p_env: envName, p_send_id: sendId, p_token_hash: await tokenHash(token), p_idem: `${memberId}:${idem.slice(0, 140)}`, p: payload,
  });
  return { sendId, r };
}

async function uploadPizza(dataUrl: unknown, title: string): Promise<string | undefined> {
  const blob = dataUrl ? dataUrlToBlob(String(dataUrl), 1_500_000) : null;
  if (!blob) return undefined;
  try { return await publitioUpload({ key: env("PUBLITIO_API_KEY"), secret: env("PUBLITIO_API_SECRET"), blob, folder: "slice-of-thanks", title }); } catch { return undefined; }
}

// ---- Calendars (Calendly, TidyCal) ----
const calCfg = (p: Provider) => ({
  clientId: env(CAL[p].idEnv), clientSecret: env(CAL[p].secretEnv),
  redirectUri: `${env("SUPABASE_URL")}/functions/v1/api/oauth/${p}/callback`,
});

// Reads the member's meetings from a day ago to a week ahead and saves them. False when it could not.
async function syncCalendar(memberId: string, p: Provider): Promise<boolean> {
  const info = await rpc<Record<string, any> | null>("sot_integration_tokens", { p_member: memberId, p_provider: p });
  let tokens = info?.tokens as Tokens | undefined;
  if (!info || info.status === "disconnected" || !tokens?.access) return false;
  try {
    if (needsRefresh(tokens)) {
      tokens = await refreshTokens(p, calCfg(p), tokens.refresh!);
      await rpc("sot_integration_tokens_update", { p_member: memberId, p_provider: p, p_tokens: tokens });
    }
    const now = Date.now();
    const items = await listMeetings(p, tokens.access, String(info.account ?? ""), new Date(now - 86_400_000), new Date(now + 8 * 86_400_000));
    await rpc("sot_meetings_upsert", { p_member: memberId, p_provider: p, p_items: items });
    await rpc("sot_integration_synced", { p_member: memberId, p_provider: p, p_ok: true });
    return true;
  } catch (e) {
    console.error("calendar sync", p, String(e));
    await rpc("sot_integration_synced", { p_member: memberId, p_provider: p, p_ok: !(e instanceof CalendarAuthError) }).catch(() => null);
    return false;
  }
}

// Tells a member their pizza is waiting, at their reply-to address. Uses no email credit.
async function notifyWaiting(m: Record<string, any>, reason?: string) {
  const to = String(m.reply_to ?? "").trim();
  if (!to || to.indexOf("@") < 1) return;
  const mail = buildWaitingEmail({ guest: m.name ?? "", meeting: m.title ?? "", link: SITE + (m.return_path || "/"), reason });
  const provider = pickProvider(await rpc("sot_setting", { p_env: "live", p_key: "email_provider" }).catch(() => null));
  const r = await provider.send({ from: { name: "Slice of Thanks", email: SENDER_EMAIL }, to: { email: to }, subject: mail.subject, html: mail.html, text: mail.text, tags: ["member_notice"] }, env(provider.secret));
  if (!r.ok) console.error("waiting notice", r.error);
}

// A meeting just ended. Pro and Team send the signature pizza; A Slice gets it waiting on Home.
async function meetingEnded(m: Record<string, any>) {
  if (!m.want) return rpc("sot_meeting_result", { p_id: m.id, p_state: "ended", p_note: null, p_send: null });
  if (!m.email) return rpc("sot_meeting_result", { p_id: m.id, p_state: "ended", p_note: "no_email", p_send: null });
  const sig = m.signature ?? {};
  if (!sig.pizza) {
    await rpc("sot_meeting_result", { p_id: m.id, p_state: "ready", p_note: "no_signature", p_send: null });
    return notifyWaiting(m, "no_signature");
  }
  if (!m.auto) {
    await rpc("sot_meeting_result", { p_id: m.id, p_state: "ready", p_note: null, p_send: null });
    return notifyWaiting(m);
  }
  const { sendId, r } = await createSend(m.member_id, "live", {
    pizza: sig.pizza, box: { ...(sig.box ?? {}), meeting: m.title ?? "" }, recipient: { name: m.name ?? "", email: m.email },
    consent: { basis: "one_to_one", method: "Calendar meeting", note: m.title ?? "" }, send_type: "one_to_one",
    label: m.title ? `After ${String(m.title).toLowerCase()}` : "After a meeting",
  }, "calendar", `meeting:${m.id}`);
  if (!r.ok) {
    await rpc("sot_meeting_result", { p_id: m.id, p_state: "ready", p_note: r.code ?? "not_sent", p_send: null });
    return notifyWaiting(m, r.code);
  }
  const id = r.send_id ?? sendId;
  if (sig.image_url && !r.duplicate) await rpc("sot_set_send_image", { p_send: id, p_url: sig.image_url }).catch(() => null);
  await rpc("sot_meeting_result", { p_id: m.id, p_state: "sent", p_note: null, p_send: id });
  if (r.due_now && !r.duplicate) await deliver(id, sig.image_url).catch((e) => console.error("meeting deliver", String(e)));
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

  // Calendly or TidyCal sends the member back here after they approve. The state ties it to the member.
  const cb = path.match(/^\/oauth\/(calendly|tidycal)\/callback$/);
  if (cb && req.method === "GET") {
    const p = cb[1] as Provider;
    const q = new URL(req.url).searchParams;
    const fin = await rpc<Record<string, any> | null>("sot_oauth_finish", { p_state: q.get("state") ?? "", p_provider: p });
    const back = (ok: boolean) => Response.redirect(SITE + (fin?.return_path || "/") + `?calendar=${p}_${ok ? "connected" : "failed"}`, 302);
    if (!fin || !q.get("code")) return back(false);
    try {
      const tokens = await exchangeCode(p, calCfg(p), q.get("code")!);
      const me = await whoAmI(p, tokens.access);
      await rpc("sot_integration_save", { p_member: fin.member_id, p_provider: p, p_account: me.account, p_label: me.label, p_tokens: tokens, p_return: fin.return_path ?? null });
      await syncCalendar(fin.member_id, p);
      return back(true);
    } catch (e) {
      console.error("oauth callback", p, String(e));
      return back(false);
    }
  }

  // Send worker: pg_cron calls this every minute with the vault secret (migration send_worker.sql).
  // Delivers scheduled sends and provider retries that are due, and closes out sends stuck mid-send.
  if (path === "/worker" && req.method === "POST") {
    const ok = await rpc<boolean>("sot_worker_ok", { p_secret: req.headers.get("x-sot-worker") ?? "" });
    if (!ok) return json(req, { error: "not_allowed" }, 403);
    const stuck = await rpc<number>("sot_recover_stuck", {});
    const started = Date.now();
    let delivered = 0, failed = 0;
    for (const id of (await rpc<string[]>("sot_due_sends", { p_limit: 50 })) ?? []) {
      if (Date.now() - started > 40_000) break; // the rest go next minute
      try {
        const d = await deliver(id);
        if (d.delivered) delivered++; else if (d.reason !== "not_due") failed++;
      } catch (e) {
        failed++;
        console.error("worker send", id, String(e));
      }
    }
    // Calendars: a few syncs a minute, then meetings that just ended
    let synced = 0, ended = 0;
    for (const it of (await rpc<{ member_id: string; provider: Provider }[]>("sot_integrations_due", { p_limit: 5 })) ?? []) {
      if (Date.now() - started > 45_000) break;
      if (await syncCalendar(it.member_id, it.provider)) synced++;
    }
    for (const mt of (await rpc<Record<string, any>[]>("sot_meetings_ended", { p_limit: 20 })) ?? []) {
      if (Date.now() - started > 50_000) break;
      try { await meetingEnded(mt); ended++; } catch (e) {
        console.error("meeting ended", mt.id, String(e));
        await rpc("sot_meeting_result", { p_id: mt.id, p_state: "ready", p_note: "server_error", p_send: null }).catch(() => null);
      }
    }
    if (stuck || delivered || failed || synced || ended) console.log("worker", JSON.stringify({ stuck, delivered, failed, synced, ended }));
    return json(req, { ok: true, stuck, delivered, failed, synced, ended });
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
  // In-app Billing card: the member's own invoices from BD (no card details ever leave BD)
  if (path === "/billing" && req.method === "GET") {
    if (!env("BD_API_KEY")) return json(req, { ok: false, code: "billing_unavailable" });
    try {
      const tx = await fetchTransactions({ site: env("BD_SITE_URL") || BD_API_SITE, key: env("BD_API_KEY"), bdUserId: m.claims.uid });
      return json(req, { ok: true, invoices: invoiceList(tx), links: (await rpc("sot_setting", { p_env: "live", p_key: "bd_links" }).catch(() => null)) ?? {} });
    } catch (e) {
      console.error("billing list", String(e));
      // A member with no billing record yet comes back as an error from BD
      return json(req, { ok: true, invoices: [], links: (await rpc("sot_setting", { p_env: "live", p_key: "bd_links" }).catch(() => null)) ?? {} });
    }
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
  // A photo for a personal pizza's lid. Kept with that send only; the member's logo is not changed
  if (path === "/photo" && req.method === "POST") {
    const blob = dataUrlToBlob(String(body.data_url ?? ""), 1_000_000);
    if (!blob) return json(req, { error: "bad_image" }, 400);
    const url = await publitioUpload({ key: env("PUBLITIO_API_KEY"), secret: env("PUBLITIO_API_SECRET"), blob, folder: "slice-of-thanks", title: `photo-${memberId}-${Date.now()}` });
    return json(req, { ok: true, photo_url: url });
  }
  if (path === "/send" && req.method === "POST") {
    const { sendId, r } = await createSend(memberId, m.session.env, body, body.source === "people" ? "people" : "kitchen", String(body.idem ?? "") || crypto.randomUUID());
    // A pizza sent for a calendar meeting from Home marks that meeting done
    if (r.ok && body.meeting_id) await rpc("sot_meeting_done", { p_member: memberId, p_id: String(body.meeting_id), p_send: r.send_id ?? sendId }).catch(() => null);
    if (!r.ok || r.duplicate) return json(req, r);
    // Upload the picture now and keep it with the pizza, so a send the worker delivers later has it too
    const imageUrl = await uploadPizza(body.image_data_url, `pizza-${sendId}`);
    if (imageUrl) await rpc("sot_set_send_image", { p_send: sendId, p_url: imageUrl }).catch(() => null);
    if (!r.due_now) return json(req, r);
    const d = await deliver(sendId, imageUrl);
    return json(req, { ...r, ...d });
  }
  // Calendars: connect, this week's meetings, the pizza choice per meeting, disconnect
  if (path === "/calendar/connect" && req.method === "POST") {
    const p = body.provider;
    if (!isProvider(p)) return json(req, { ok: false, code: "bad_provider" }, 400);
    if (!env(CAL[p].idEnv) || !env(CAL[p].secretEnv)) return json(req, { ok: false, code: "not_ready" });
    const state = await rpc<string>("sot_oauth_start", { p_member: memberId, p_provider: p, p_return: String(body.return ?? "") });
    return json(req, { ok: true, url: authorizeUrl(p, calCfg(p), state) });
  }
  if (path === "/calendar" && req.method === "GET") {
    let cal = await rpc<Record<string, any>>("sot_calendar", { p_member: memberId });
    // Opening Home refreshes a calendar that has not synced in the last 3 minutes
    const stale = (cal.integrations ?? []).filter((i: any) => i.status === "connected" && (!i.last_sync_at || Date.now() - Date.parse(i.last_sync_at) > 180_000));
    if (stale.length) {
      for (const i of stale) await syncCalendar(memberId, i.provider);
      cal = await rpc<Record<string, any>>("sot_calendar", { p_member: memberId });
    }
    return json(req, { ok: true, ...cal });
  }
  if (path === "/calendar/sync" && req.method === "POST") {
    const cal = await rpc<Record<string, any>>("sot_calendar", { p_member: memberId });
    for (const i of cal.integrations ?? []) if (i.status !== "disconnected") await syncCalendar(memberId, i.provider);
    return json(req, { ok: true, ...(await rpc<Record<string, any>>("sot_calendar", { p_member: memberId })) });
  }
  if (path === "/calendar/disconnect" && req.method === "POST") {
    if (!isProvider(body.provider)) return json(req, { ok: false, code: "bad_provider" }, 400);
    await rpc("sot_integration_disconnect", { p_member: memberId, p_provider: body.provider });
    return json(req, { ok: true });
  }
  // Import everyone from a connected calendar into People
  if (path === "/calendar/import" && req.method === "POST") {
    const p = body.provider;
    if (!isProvider(p)) return json(req, { ok: false, code: "bad_provider" }, 400);
    const info = await rpc<Record<string, any> | null>("sot_integration_tokens", { p_member: memberId, p_provider: p });
    let tokens = info?.tokens as Tokens | undefined;
    if (!info || info.status !== "connected" || !tokens?.access) return json(req, { ok: false, code: "not_connected" });
    try {
      if (needsRefresh(tokens)) {
        tokens = await refreshTokens(p, calCfg(p), tokens.refresh!);
        await rpc("sot_integration_tokens_update", { p_member: memberId, p_provider: p, p_tokens: tokens });
      }
      const people = await listContacts(p, tokens.access, String(info.account ?? ""));
      return json(req, await rpc("sot_import_contacts", { p_member: memberId, p_source: p, p_items: people }));
    } catch (e) {
      console.error("calendar import", p, String(e));
      if (e instanceof CalendarAuthError) await rpc("sot_integration_synced", { p_member: memberId, p_provider: p, p_ok: false }).catch(() => null);
      return json(req, { ok: false, code: e instanceof CalendarAuthError ? "needs_reconnect" : "server_error" });
    }
  }
  if (path === "/calendar/meeting" && req.method === "POST") {
    return json(req, await rpc("sot_meeting_set", { p_member: memberId, p_id: String(body.id ?? ""), p_want: !!body.want }));
  }
  if (path === "/calendar/skip" && req.method === "POST") {
    return json(req, await rpc("sot_meeting_done", { p_member: memberId, p_id: String(body.id ?? ""), p_send: null }));
  }
  // The signature pizza is kept on the account so it can go out when a meeting ends
  if (path === "/signature" && req.method === "POST") {
    const imageUrl = await uploadPizza(body.image_data_url, `signature-${memberId}-${Date.now()}`);
    return json(req, await rpc("sot_save_signature", { p_member: memberId, p: { pizza: body.pizza ?? null, box: body.box ?? {}, image_url: imageUrl ?? body.image_url ?? null } }));
  }
  // People tab: contacts with their last pizzas, and add or edit a person
  if (path === "/people" && req.method === "GET") {
    return json(req, { ok: true, people: (await rpc("sot_people", { p_member: memberId })) ?? [] });
  }
  if (path === "/people/save" && req.method === "POST") {
    return json(req, await rpc("sot_save_contact", { p_member: memberId, p: body.person ?? {} }));
  }
  // Box presets: saved box setups (style, sticker, confetti, note, sign-off, button, gift). Limits per plan in app_settings preset_limits.
  if (path === "/presets" && req.method === "GET") {
    return json(req, { ok: true, ...(await rpc<Record<string, unknown>>("sot_presets", { p_member: memberId })) });
  }
  if (path === "/presets/save" && req.method === "POST") {
    return json(req, await rpc("sot_save_preset", { p_member: memberId, p: body.preset ?? {} }));
  }
  if (path === "/presets/remove" && req.method === "POST") {
    return json(req, await rpc("sot_remove_preset", { p_member: memberId, p_id: String(body.id ?? "") }));
  }
  // CSV list send: up to 50 rows per call. Each row becomes a queued send; the worker delivers them.
  if (path === "/send/bulk" && req.method === "POST") {
    if (!m.session.features?.csv_import) return json(req, { ok: false, code: "needs_upgrade", features: ["csv_import"] });
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, 50) : [];
    const batch = String(body.batch ?? "").slice(0, 60) || crypto.randomUUID();
    const imageUrl = await uploadPizza(body.image_data_url, `pizza-list-${batch}`);
    const results: { i: number; ok: boolean; code?: string }[] = [];
    for (const row of rows) {
      const i = Number(row?.i ?? results.length);
      try {
        const { sendId, r } = await createSend(memberId, m.session.env, { ...row, scheduled_for: body.scheduled_for ?? null, label: body.label }, "csv", `list:${batch}:${i}`);
        if (r.ok && !r.duplicate && imageUrl && row.image !== false) await rpc("sot_set_send_image", { p_send: sendId, p_url: imageUrl }).catch(() => null);
        results.push({ i, ok: !!r.ok, code: r.ok ? undefined : r.code });
        if (r.code === "needs_terms" || r.code === "sending_paused" || r.code === "account_inactive") break;
      } catch (e) {
        console.error("bulk row", String(e));
        results.push({ i, ok: false, code: "server_error" });
      }
    }
    return json(req, { ok: true, results });
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
