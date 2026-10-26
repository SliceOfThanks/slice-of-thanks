// Slice of Thanks API. One Edge Function, many routes.
// Auth: members prove who they are with a token signed by the SOT-Auth widget in BD.
// Recipients use their private link token. Everything else is refused.
import { createClient } from "npm:@supabase/supabase-js@2";
import { verifyBdToken } from "./lib/auth.ts";
import { recipientToken, tokenHash } from "./lib/crypto.ts";
import { buildDateEmail, buildEmail, buildTrialEmail, buildWaitingEmail, SITE } from "./lib/email.ts";
import { birthdaySpecial, dateBox, datePizza, type DateKind } from "./lib/gerald.ts";
import { dataUrlToBlob, publitioUpload } from "./lib/publitio.ts";
import { billingLines, deleteBdUser, fetchBdEmail, fetchTransactions, invoiceList, type ProductMatch } from "./lib/billing.ts";
import { sendWithFallback, type EmailMessage } from "./lib/mail/index.ts";
import { fillNote } from "./lib/merge.ts";
import { sendCustomer, sendSale } from "./lib/partnero.ts";
import { authorizeUrl, CAL, CalendarAuthError, exchangeCode, isProvider, listContacts, listMeetings, needsRefresh, refreshTokens, type Provider, type Tokens, whoAmI } from "./lib/calendar.ts";

const VERSION = "api-0.21.4";
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
  // The signature list can be large; the app loads it from /signatures instead
  if (s?.prefs && typeof s.prefs === "object" && "signatures" in s.prefs) { const { signatures: _drop, ...rest } = s.prefs; s.prefs = rest; }
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
    await reportSales(memberId, tx);
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

// Paid BD invoices of a referred member go to Partnero as sales (once each). Members nobody referred are skipped in the database.
async function reportSales(memberId: string, tx: unknown) {
  for (const inv of invoiceList(tx)) {
    if (inv.status.toLowerCase() !== "paid" || inv.totalCents <= 0) continue;
    const added = await rpc<boolean>("sot_partnero_sale", { p_member: memberId, p_invoice: inv.id, p_amount_cents: inv.totalCents, p_paid_at: inv.paidAt ?? inv.date }).catch(() => false);
    if (added === false) return; // not referred, or nothing new
  }
}

// Sends what is waiting for Partnero: each member as a customer (with who invited them), then their sales
async function partneroOutbox(limit: number): Promise<number> {
  const key = env("PARTNERO_API_KEY");
  if (!key) return 0;
  let sent = 0;
  for (const o of (await rpc<Record<string, any>[]>("sot_partnero_due", { p_limit: limit })) ?? []) {
    // The customer key is their email: PartneroJS (universal integration in BD's HEAD code) records sign-ups by email,
    // so our report of the same sign-up is "already there" and sales land on the same customer.
    const custKey = String(o.email || o.member_id);
    const r = o.kind === "customer"
      ? await sendCustomer(key, { key: custKey, email: o.email, name: o.name, referrerKey: o.referred_by ?? null, partnerKey: o.partner_key ?? null })
      : await sendSale(key, { customerKey: custKey, key: "bd-" + String(o.payload?.invoice ?? o.id), amountCents: Number(o.payload?.amount_cents ?? 0) });
    // Partnero answers 2xx even when it cannot match the partner, so log which partner it linked (or none)
    if (o.kind === "customer") console.log("partnero customer", JSON.stringify({ member: o.member_id, sent_partner: o.partner_key ?? null, status: r.status, linked: r.data?.data?.partner ?? r.data?.partner ?? null, referred_by: r.data?.data?.referring_customer ?? r.data?.data?.referrer ?? null }));
    await rpc("sot_partnero_done", { p_id: o.id, p_ok: r.ok, p_error: r.error ?? null });
    if (r.ok) sent++; else console.error("partnero", o.kind, r.error);
  }
  return sent;
}

async function fillReplyTo(memberId: string, bdUserId: number): Promise<boolean> {
  if (!env("BD_API_KEY") || !bdUserId) return false;
  try {
    const email = await fetchBdEmail({ site: env("BD_SITE_URL") || BD_API_SITE, key: env("BD_API_KEY"), bdUserId });
    return email ? !!(await rpc<boolean>("sot_fill_reply_to", { p_member: memberId, p_email: email })) : false;
  } catch (e) {
    console.error("reply_to fill", String(e));
    return false;
  }
}

// Every email goes out here: the main service, then the backup if the main one refused it (app_settings email_provider)
async function sendMail(msg: EmailMessage) {
  const setting = await rpc("sot_setting", { p_env: "live", p_key: "email_provider" }).catch(() => null);
  const r = await sendWithFallback(msg, setting, env);
  if (r.ok && r.tried.length > 1) {
    console.log("email fallback", JSON.stringify({ used: r.provider, tried: r.tried }));
    await db().from("events").insert({ type: "email_fallback", props: { used: r.provider, tried: r.tried, tags: msg.tags ?? [] } }).then(() => null, () => null);
  }
  return r;
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
  const r = await sendMail({
    from: { name: `${fromName} via Slice of Thanks`, email: SENDER_EMAIL },
    to: { email: job.email, name: job.name || undefined },
    replyTo: job.reply_to || undefined,
    subject: mail.subject, html: mail.html, text: mail.text,
    headers: { "List-Unsubscribe": `<${SITE}/unsubscribe?t=${encodeURIComponent(token)}&s=sender>` },
    tags: [job.is_test ? "test" : "live", job.send_type],
  });
  if (!r.ok) {
    await rpc("sot_mark_failed", { p_send: sendId, p_reason: r.error, p_retry: r.retry });
    return { delivered: false, reason: r.retry ? "provider_retrying" : "provider_error" };
  }
  await rpc("sot_mark_sent_via", { p_send: sendId, p_provider_id: r.messageId, p_provider: r.provider });
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

// Reads the member's meetings from a day ago to two weeks ahead and saves them. False when it could not.
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
    const items = await listMeetings(p, tokens.access, String(info.account ?? ""), new Date(now - 86_400_000), new Date(now + 15 * 86_400_000));
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
  const r = await sendMail({ from: { name: "Slice of Thanks", email: SENDER_EMAIL }, to: { email: to }, subject: mail.subject, html: mail.html, text: mail.text, tags: ["member_notice"] });
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

// Gerald never forgets a date: a birthday or work anniversary came up at 8 AM the member's time.
// Sends on its own when the member chose that, their plan has automations, and there is permission on file. Otherwise it waits on Home.
async function dateDue(d: Record<string, any>) {
  const kind = d.kind as DateKind, c = d.contact ?? {};
  const pizza = datePizza(kind, { name: c.name, vegan: c.vegan }, !!d.vegan_default);
  const box = dateBox(kind, d.style ?? "heartfelt", d.signature_box, d.member_name, c.years, !!d.auto);
  const payload = { pizza, box };
  const notice = async (sent: boolean, reason?: string) => {
    const to = String(d.reply_to ?? "").trim();
    if (!to || to.indexOf("@") < 1) return;
    const mail = buildDateEmail({ guest: c.name ?? "", kind, sent, reason, link: SITE + "/kitchen" });
    const r = await sendMail({ from: { name: "Slice of Thanks", email: SENDER_EMAIL }, to: { email: to }, subject: mail.subject, html: mail.html, text: mail.text, tags: ["member_notice"] });
    if (!r.ok) console.error("date notice", r.error);
  };
  const why = d.mode !== "auto" ? undefined : !d.auto ? "needs_upgrade" : !d.has_consent ? "needs_permission" : undefined;
  if (d.mode !== "auto" || why) {
    await rpc("sot_date_result", { p_id: d.id, p_state: "waiting", p_note: why ?? null, p_payload: payload, p_send: null });
    return notice(false, why);
  }
  const { sendId, r } = await createSend(d.member_id, "live", {
    pizza, box, recipient: { name: c.name ?? "", email: c.email, company: c.company ?? "", role: c.role ?? "", vegan: !!c.vegan, country: c.country ?? "" },
    consent: null, send_type: "one_to_one", label: kind === "birthday" ? "Birthday pizza" : "Work anniversary pizza",
  }, "dates", `date:${d.id}`);
  if (!r.ok) {
    await rpc("sot_date_result", { p_id: d.id, p_state: "waiting", p_note: r.code ?? "not_sent", p_payload: payload, p_send: null });
    return notice(false, r.code);
  }
  const id = r.send_id ?? sendId;
  await rpc("sot_date_result", { p_id: d.id, p_state: "sent", p_note: null, p_payload: payload, p_send: id });
  if (r.due_now && !r.duplicate) await deliver(id).catch((e) => console.error("date deliver", String(e)));
  return notice(true);
}

// A trial reminder to the member: 3 days left, or the last day
async function trialNotice(n: Record<string, any>) {
  const mail = buildTrialEmail({ kind: n.kind === "end" ? "end" : "3d", name: n.name ?? "", days: Number(n.days ?? 3), upgradeLink: `${SITE}/account/upgrade`, kitchenLink: `${SITE}/kitchen` });
  const r = await sendMail({ from: { name: "Gerald and Potato", email: SENDER_EMAIL }, to: { email: n.email, name: n.name || undefined }, subject: mail.subject, html: mail.html, text: mail.text, tags: ["member_notice", "trial_" + n.kind] });
  if (!r.ok) console.error("trial notice", r.error);
}

// Gerald's Birthday Special: built here, sent from the house account, delivered like any pizza
async function birthdayDue(b: Record<string, any>) {
  const { pizza, box } = birthdaySpecial(b.name ?? "", Number(b.year), b.gift === "trial" ? "trial" : "emails", SITE);
  const sendId = crypto.randomUUID();
  const token = await recipientToken(env("LINK_SECRET"), sendId);
  const r = await rpc<Record<string, any>>("sot_create_birthday_send", { p_birthday: b.id, p_send_id: sendId, p_token_hash: await tokenHash(token), p: { pizza, box } });
  if (!r?.ok || r.duplicate) return;
  await deliver(sendId);
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
    const hash = await tokenHash(t);
    const data = await rpc<Record<string, any> | null>("sot_recipient_get", { p_hash: hash });
    if (!data) return json(req, { error: "not_found" }, 404);
    // The sender's invite code: the receipt's QR code and "Make your own" link credit them when someone joins
    const ref = await rpc<string | null>("sot_recipient_ref", { p_hash: hash }).catch(() => null);
    return json(req, ref ? { ...data, ref } : data);
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
    // Birthdays and work anniversaries due at 8 AM local time. Every claimed one is handled, so none is left half done.
    let dates = 0;
    if (Date.now() - started < 52_000) {
      for (const d of (await rpc<Record<string, any>[]>("sot_dates_due", { p_limit: 10 }).catch((e) => { console.error("dates due", String(e)); return []; })) ?? []) {
        try { await dateDue(d); dates++; } catch (e) {
          console.error("date pizza", d.id, String(e));
          await rpc("sot_date_result", { p_id: d.id, p_state: "waiting", p_note: "server_error", p_payload: null, p_send: null }).catch(() => null);
        }
      }
    }
    // Trial reminders, then members' birthdays
    let notices = 0, birthdays = 0;
    if (Date.now() - started < 53_000) {
      for (const n of (await rpc<Record<string, any>[]>("sot_trial_notices_due", { p_limit: 20 }).catch((e) => { console.error("trial due", String(e)); return []; })) ?? []) {
        try { await trialNotice(n); notices++; } catch (e) { console.error("trial notice", String(e)); }
      }
    }
    if (Date.now() - started < 54_000) {
      for (const b of (await rpc<Record<string, any>[]>("sot_member_birthdays_due", { p_limit: 10 }).catch((e) => { console.error("birthdays due", String(e)); return []; })) ?? []) {
        try { await birthdayDue(b); birthdays++; } catch (e) { console.error("birthday", String(e)); }
      }
    }
    // Referrals: inviters earn their emails, renewals of referred members reach Partnero, then the Partnero queue
    let referrals = 0, partnero = 0;
    if (Date.now() - started < 55_000) {
      referrals = (await rpc<number>("sot_referral_rewards_due", { p_limit: 20 }).catch((e) => { console.error("referral rewards", String(e)); return 0; })) ?? 0;
      if (env("BD_API_KEY") && env("PARTNERO_API_KEY")) {
        for (const d of (await rpc<Record<string, any>[]>("sot_referral_billing_due", { p_limit: 3 }).catch(() => [])) ?? []) {
          try { await reportSales(d.member_id, await fetchTransactions({ site: env("BD_SITE_URL") || BD_API_SITE, key: env("BD_API_KEY"), bdUserId: Number(d.bd_user_id) })); }
          catch (e) { console.error("referral billing", String(e)); }
        }
      }
      partnero = await partneroOutbox(10).catch((e) => { console.error("partnero outbox", String(e)); return 0; });
    }
    if (stuck || delivered || failed || synced || ended || dates || notices || birthdays || referrals || partnero) console.log("worker", JSON.stringify({ stuck, delivered, failed, synced, ended, dates, notices, birthdays, referrals, partnero }));
    return json(req, { ok: true, stuck, delivered, failed, synced, ended, dates, notices, birthdays, referrals, partnero });
  }

  // Member routes
  const m = await member(req);
  if (!m) return json(req, { error: "not_signed_in" }, 401);
  const memberId = m.session.member_id as string;

  if (path === "/session") {
    const b = await syncBilling(memberId, m.claims.uid, 600);
    // "Where replies go" starts as the login email, so replies and Send one back always reach the member
    const filled = !m.session?.profile?.reply_to && await fillReplyTo(memberId, m.claims.uid);
    return json(req, b.changed || filled ? (await member(req))!.session : m.session);
  }
  // Send one back: the person who got a pizza adds its sender to their People, without knowing the email
  if (path === "/sendback" && req.method === "POST") {
    const hash = await tokenHash(String(body.t ?? "").slice(0, 400));
    let r = await rpc<Record<string, any>>("sot_send_back", { p_member: memberId, p_hash: hash });
    if (r?.ok && !r.email && r.sender_member_id && r.sender_bd_user_id && await fillReplyTo(r.sender_member_id, Number(r.sender_bd_user_id))) {
      r = await rpc<Record<string, any>>("sot_send_back", { p_member: memberId, p_hash: hash });
    }
    if (!r?.ok) return json(req, { ok: false, code: r?.code ?? "not_found" });
    // A new member who joined to send a pizza back was brought in by its sender
    await rpc("sot_referral_sendback", { p_member: memberId, p_hash: hash }).catch(() => null);
    return json(req, { ok: true, added: !!r.added, person: { id: r.id ?? null, name: r.name, company: r.company ?? "", email: r.email ?? "" } });
  }
  // Invite friends: the member's invite link and what it has earned
  if (path === "/referral" && req.method === "GET") {
    const st = await rpc<Record<string, any>>("sot_referral_state", { p_member: memberId });
    return json(req, st?.enabled ? { ok: true, ...st, link: `${SITE}/kitchen?ref=${encodeURIComponent(st.code)}` } : { ok: false, code: "off" });
  }
  // A new member arrived through an invite link (code) or a Partnero partner link (partner cookie)
  if (path === "/referral/capture" && req.method === "POST") {
    const code = String(body.code ?? "").replace(/[^A-Za-z0-9]/g, "").slice(0, 16) || null;
    // Partnero's own refer-a-friend cookie holds the inviter's customer key, which is their member id.
    // Anything else in it is a partner's key (a partner link can leave either cookie), so it counts as the partner.
    const ref = String(body.referrer ?? "").trim();
    const referrer = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ref) ? ref.toLowerCase() : null;
    const partner = String(body.partner ?? "").slice(0, 80) || (!referrer && ref ? ref.slice(0, 80) : "") || null;
    if (!code && !partner && !referrer) return json(req, { ok: false, code: "no_referrer" });
    return json(req, await rpc("sot_referral_capture", { p_member: memberId, p_code: code, p_referrer: referrer, p_partner: partner, p_source: code || referrer ? "link" : "partner" }));
  }
  // The member's own birthday, month and day, for Gerald's Birthday Special
  if (path === "/birthday" && req.method === "POST") {
    return json(req, await rpc("sot_set_member_birthday", { p_member: memberId, p_md: body.md ? String(body.md).slice(0, 5) : null }));
  }
  if (path === "/birthday/claim" && req.method === "POST") {
    return json(req, await rpc("sot_birthday_claim", { p_member: memberId }));
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
  // Delete my account and data. The member types DELETE to confirm; a paid plan is cancelled first.
  if (path === "/account/delete" && req.method === "POST") {
    if (String(body.confirm ?? "").trim().toUpperCase() !== "DELETE") return json(req, { ok: false, code: "confirm" });
    const r = await rpc<Record<string, any>>("sot_delete_member", { p_member: memberId });
    if (!r?.ok || r.already) return json(req, r);
    let bd = false;
    if (env("BD_API_KEY")) {
      try { await deleteBdUser({ site: env("BD_SITE_URL") || BD_API_SITE, key: env("BD_API_KEY"), bdUserId: m.claims.uid }); bd = true; await rpc("sot_deletion_bd", { p_id: r.deletion_id, p_ok: true, p_error: null }); }
      catch (e) { console.error("bd delete", String(e)); await rpc("sot_deletion_bd", { p_id: r.deletion_id, p_ok: false, p_error: String(e) }).catch(() => null); }
    }
    return json(req, { ok: true, bd_deleted: bd });
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
  // Gerald never forgets a date: this week's dates and pizzas waiting on Home
  if (path === "/dates" && req.method === "GET") {
    return json(req, { ok: true, ...(await rpc<Record<string, unknown>>("sot_dates", { p_member: memberId })) });
  }
  if (path === "/dates/skip" && req.method === "POST") {
    return json(req, await rpc("sot_date_done", { p_member: memberId, p_id: String(body.id ?? ""), p_send: null }));
  }
  // Send a waiting date pizza. The app sends the picture, and how the member knows the person when there is no permission on file.
  if (path === "/dates/send" && req.method === "POST") {
    const dp = await rpc<Record<string, any> | null>("sot_date_get", { p_member: memberId, p_id: String(body.id ?? "") });
    if (!dp || !dp.payload) return json(req, { ok: false, code: "not_found" });
    if (dp.state !== "waiting" && dp.state !== "pending") return json(req, { ok: false, code: "already_done" });
    const c = dp.contact ?? {};
    const basis = ["permission", "relationship", "one_to_one"].includes(body.basis) ? body.basis : null;
    const { sendId, r } = await createSend(memberId, m.session.env, {
      pizza: dp.payload.pizza, box: dp.payload.box, recipient: { name: c.name ?? "", email: c.email, company: c.company ?? "", role: c.role ?? "", vegan: !!c.vegan, country: c.country ?? "" },
      consent: basis ? { basis, method: "Chosen when sending a date pizza" } : null, send_type: "one_to_one",
      label: dp.kind === "birthday" ? "Birthday pizza" : "Work anniversary pizza",
    }, "dates", `date-home:${dp.id}`);
    if (!r.ok || r.duplicate) return json(req, r);
    await rpc("sot_date_done", { p_member: memberId, p_id: dp.id, p_send: r.send_id ?? sendId });
    const imageUrl = await uploadPizza(body.image_data_url, `pizza-${sendId}`);
    if (imageUrl) await rpc("sot_set_send_image", { p_send: sendId, p_url: imageUrl }).catch(() => null);
    if (!r.due_now) return json(req, r);
    return json(req, { ...r, ...(await deliver(sendId, imageUrl)) });
  }
  // More signature pizzas: a list in prefs.signatures (limits per plan in app_settings signature_limits). main: true also makes it the meeting pizza.
  if (path === "/signatures" && req.method === "GET") {
    return json(req, { ok: true, ...(await rpc<Record<string, unknown>>("sot_signatures", { p_member: memberId })) });
  }
  if (path === "/signatures/save" && req.method === "POST") {
    const it = body.item ?? {};
    const imageUrl = body.image_data_url ? await uploadPizza(body.image_data_url, `signature-${memberId}-${Date.now()}`) : null;
    return json(req, await rpc("sot_save_signature_item", { p_member: memberId, p: { id: it.id ?? null, name: it.name ?? "", kind: it.kind ?? "business", pizza: it.pizza ?? null, box: it.box ?? {}, main: !!it.main, image_url: imageUrl } }));
  }
  if (path === "/signatures/remove" && req.method === "POST") {
    return json(req, await rpc("sot_remove_signature_item", { p_member: memberId, p_id: String(body.id ?? "") }));
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
  // Remove people from People (one or many). People with a scheduled pizza still waiting are kept.
  if (path === "/people/remove" && req.method === "POST") {
    const ids = Array.isArray(body.ids) ? body.ids.filter((x: unknown) => typeof x === "string").slice(0, 1000) : [];
    if (!ids.length) return json(req, { ok: false, code: "nothing_selected" });
    return json(req, await rpc("sot_remove_people", { p_member: memberId, p_ids: ids }));
  }
  // Save a CSV list to People (up to 500 rows): new people are added, people already there get the new tags
  if (path === "/people/import" && req.method === "POST") {
    const rows = Array.isArray(body.people) ? body.people.slice(0, 500) : [];
    return json(req, await rpc("sot_import_people", { p_member: memberId, p_items: rows }));
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
  // CSV list or group send: up to 50 rows per call (10 when each row has its own picture). Each row becomes a queued send; the worker delivers them.
  if (path === "/send/bulk" && req.method === "POST") {
    if (!m.session.features?.csv_import) return json(req, { ok: false, code: "needs_upgrade", features: ["csv_import"] });
    const rows = Array.isArray(body.rows) ? body.rows.slice(0, body.rows.some((x: any) => x?.image_data_url) ? 10 : 50) : [];
    const batch = String(body.batch ?? "").slice(0, 60) || crypto.randomUUID();
    const imageUrl = await uploadPizza(body.image_data_url, `pizza-list-${batch}`);
    const results: { i: number; ok: boolean; code?: string }[] = [];
    for (const row of rows) {
      const i = Number(row?.i ?? results.length);
      try {
        const { sendId, r } = await createSend(memberId, m.session.env, { ...row, scheduled_for: body.scheduled_for ?? null, label: body.label }, "csv", `list:${batch}:${i}`);
        // Gerald's one-of-a-kind pizzas carry their own picture; a signature list shares one
        const own = r.ok && !r.duplicate && row.image_data_url ? await uploadPizza(row.image_data_url, `pizza-${sendId}`) : undefined;
        if (r.ok && !r.duplicate && (own || (imageUrl && row.image !== false))) await rpc("sot_set_send_image", { p_send: sendId, p_url: own || imageUrl }).catch(() => null);
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
