// Builds the "you got a pizza" email in English or Spanish.
// Every email carries the sender's identity and mailing address, unsubscribe links, why-you-got-this and legal links.

export const SITE = "https://www.sliceofthanks.app";

type Sender = { name?: string; business?: string; send_as?: string; mailing_address?: string; platform_address?: string; show_made_with?: boolean };
export type EmailInput = {
  locale?: string;
  recipientName?: string;
  sender: Sender;
  link: string;
  unsubscribeSender: string;
  unsubscribeAll: string;
  pizzaImageUrl?: string;
  potatoImageUrl?: string;
  markImageUrl?: string; // the Slice of Thanks text logo
  isTest?: boolean;
  occasion?: string; // the box's occasion sticker; it picks the subject line
  replyName?: string; // set when replies go straight to the sender (a confirmed address and they want replies)
};

const T = {
  en: {
    subject: (s: string) => `${s} sent you a slice of thanks`,
    special: (s: string) => `A special pizza delivery for you from ${s}`,
    hi: (n?: string) => { const f = (n ?? "").trim().split(" ")[0]; return f ? `Hi ${f},` : "Hi,"; },
    lead: (s: string) => `${s} sent you a pizza. Potato is on her way with it now.`,
    button: "Open your pizza",
    note: "It only takes a minute, and there may be something hidden under the pizza.",
    why: (s: string) => `You got this because ${s} sent it to you through Slice of Thanks.`,
    unsubSender: (s: string) => `Stop pizzas from ${s}`,
    unsubAll: "Stop all Slice of Thanks pizzas",
    privacy: "Privacy",
    terms: "Terms",
    report: "Report",
    made: "Made with Slice of Thanks. Make your own, free.",
    via: "Sent through Slice of Thanks",
    from: "from",
    test: "TEST SEND",
    reply: (s: string) => `Hit reply to say thanks to ${s}. Your reply goes straight to them.`,
  },
  es: {
    subject: (s: string) => `${s} te envió una porción de agradecimiento`,
    special: (s: string) => `Una entrega especial de pizza para ti de ${s}`,
    hi: (n?: string) => { const f = (n ?? "").trim().split(" ")[0]; return f ? `Hola ${f}:` : "Hola:"; },
    lead: (s: string) => `${s} te envió una pizza. Potato ya va en camino con ella.`,
    button: "Abre tu pizza",
    note: "Solo toma un minuto, y puede que haya algo escondido debajo de la pizza.",
    why: (s: string) => `Recibiste esto porque ${s} te lo envió a través de Slice of Thanks.`,
    unsubSender: (s: string) => `No recibir más pizzas de ${s}`,
    unsubAll: "No recibir ninguna pizza de Slice of Thanks",
    privacy: "Privacidad",
    terms: "Términos",
    report: "Reportar",
    made: "Hecho con Slice of Thanks. Crea la tuya gratis.",
    via: "Enviado a través de Slice of Thanks",
    from: "de",
    test: "ENVÍO DE PRUEBA",
    reply: (s: string) => `Responde a este correo para darle las gracias a ${s}. Tu respuesta le llega directamente.`,
  },
};

export function esc(s: string | undefined): string {
  return String(s ?? "").replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

export function senderLabel(s: Sender): string {
  const biz = (s.business ?? "").trim();
  const name = (s.name ?? "").trim();
  if (s.send_as === "business" && biz) return biz;
  return name || biz || "Someone";
}

// Who the pizza is from, the same way the Kitchen preview and the recipient page say it:
// "Name from Business", or the business alone when the member sends as their business
export function senderHeadline(s: Sender, from = "from"): string {
  const biz = (s.business ?? "").trim();
  const name = (s.name ?? "").trim();
  if (s.send_as === "business" && biz) return biz;
  if (name && biz) return `${name} ${from} ${biz}`;
  return name || biz || "Someone";
}

// Always Slice of Thanks's own address: it is the designated sender for every email (Stacey, 2026-10-24)
export function footerAddress(s: Sender, via: string): string {
  const ours = (s.platform_address ?? "").trim();
  return ours ? `${via}, ${ours}` : via;
}

// Thank-you and meeting stickers keep the thank-you subject; every other occasion (birthday, retirement...) gets the evergreen one.
// Same rule as isThanksOccasion in the Kitchen, so the preview matches.
const THANKS_STICKERS = ["Great Meeting", "Nice to Meet You", "Following Up", "Let's Do This"];
export function isThanksOccasion(sticker?: string): boolean {
  const st = String(sticker ?? "");
  return !st || st.toLowerCase().includes("thank") || THANKS_STICKERS.includes(st);
}

export function buildEmail(i: EmailInput): { subject: string; html: string; text: string } {
  const t = i.locale === "es" ? T.es : T.en;
  const who = senderLabel(i.sender);
  const headline = senderHeadline(i.sender, t.from);
  const fullFrom = [i.sender.name, i.sender.business].filter(Boolean).join(", ");
  const address = footerAddress(i.sender, t.via);
  const subject = (i.isTest ? `[${t.test}] ` : "") + (isThanksOccasion(i.occasion) ? t.subject(headline) : t.special(headline));
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="height:14px;background:#D62828;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px 24px 8px;text-align:center">
${i.markImageUrl ? `<img src="${esc(i.markImageUrl)}" width="150" alt="Slice of Thanks" style="display:block;margin:0 auto 14px;height:auto">` : ""}
${i.potatoImageUrl ? `<img src="${esc(i.potatoImageUrl)}" width="240" alt="Potato the bulldog on her delivery scooter" style="display:block;margin:0 auto 12px;max-width:100%;height:auto">` : ""}
<p style="margin:0 0 6px;font-size:16px">${esc(t.hi(i.recipientName))}</p>
<p style="margin:0 0 18px;font-size:20px;font-weight:bold;line-height:1.3">${esc(t.lead(headline))}</p>
${i.pizzaImageUrl ? `<img src="${esc(i.pizzaImageUrl)}" width="200" alt="" style="display:block;margin:0 auto 18px;max-width:100%;height:auto">` : ""}
<a href="${esc(i.link)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3E2416">${esc(t.button)}</a>
<p style="margin:16px 0 0;font-size:14px;color:#6b4a3a">${esc(t.note)}</p>
${i.replyName ? `<p style="margin:12px 0 0;font-size:14px;color:#3E2416">${esc(t.reply(i.replyName))}</p>` : ""}
</td></tr>
<tr><td style="padding:18px 24px 22px;font-size:12px;line-height:1.6;color:#6b4a3a;text-align:center;border-top:1px dashed #d8c4a4">
${esc(fullFrom)}<br>${esc(address)}<br>
${esc(t.why(who))}<br>
<a href="${esc(i.unsubscribeSender)}" style="color:#C21F1F">${esc(t.unsubSender(who))}</a> · <a href="${esc(i.unsubscribeAll)}" style="color:#C21F1F">${esc(t.unsubAll)}</a><br>
<a href="${SITE}/privacy" style="color:#C21F1F">${esc(t.privacy)}</a> · <a href="${SITE}/terms" style="color:#C21F1F">${esc(t.terms)}</a> · <a href="${SITE}/report" style="color:#C21F1F">${esc(t.report)}</a>
${i.sender.show_made_with ? `<br><a href="${SITE}" style="color:#6b4a3a">${esc(t.made)}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    t.hi(i.recipientName), "", t.lead(headline), "", `${t.button}: ${i.link}`, "", t.note, ...(i.replyName ? ["", t.reply(i.replyName)] : []), "", "--",
    fullFrom, address, t.why(who),
    `${t.unsubSender(who)}: ${i.unsubscribeSender}`, `${t.unsubAll}: ${i.unsubscribeAll}`,
    `${t.privacy}: ${SITE}/privacy`, `${t.terms}: ${SITE}/terms`,
  ].join("\n");
  return { subject, html, text };
}

// To the member, not a guest: a meeting they picked ended and their signature pizza is waiting on Home.
// Sent to their reply-to address. It uses no email credit.
export function buildWaitingEmail(i: { guest: string; meeting: string; link: string; reason?: string }): { subject: string; html: string; text: string } {
  const who = i.guest || "your guest";
  const subject = `Your pizza for ${who} is ready to send`;
  const lead = i.reason === "no_signature"
    ? `Your ${i.meeting || "meeting"} with ${who} just ended. Set your signature pizza in Settings, then send them a pizza from Home.`
    : i.reason === "no_credits"
      ? `Your ${i.meeting || "meeting"} with ${who} just ended. Your pizza is waiting on Home, but you are out of emails this month. Add a pack to send it.`
      : `Your ${i.meeting || "meeting"} with ${who} just ended. Your signature pizza is waiting on Home. Open Slice of Thanks to send it.`;
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="height:14px;background:#D62828;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px;text-align:center">
<p style="margin:0 0 18px;font-size:18px;font-weight:bold;line-height:1.4">${esc(lead)}</p>
<a href="${esc(i.link)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3E2416">Open Slice of Thanks</a>
<p style="margin:16px 0 0;font-size:12px;color:#6b4a3a">You get this because you picked this meeting for a pizza. Change it on Home or in Settings.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text: `${lead}\n\nOpen Slice of Thanks: ${i.link}` };
}

// To the member: Gerald made a birthday or work anniversary pizza today. It went out, or it is waiting on Home.
// Sent to their reply-to address. It uses no email credit.
export function buildDateEmail(i: { guest: string; kind: "birthday" | "anniversary"; sent: boolean; reason?: string; link: string }): { subject: string; html: string; text: string } {
  const who = i.guest || "someone in People";
  const what = i.kind === "birthday" ? "birthday" : "work anniversary";
  const subject = i.sent ? `Gerald sent ${who} a ${what} pizza` : `${who}'s ${what} pizza is ready to send`;
  const why: Record<string, string> = {
    needs_permission: `It did not go out on its own because there is no permission on file to email ${who}. Choose how you know them when you send it.`,
    needs_upgrade: "Sending on its own is part of The Whole Pie. On your plan, Gerald makes it and you send it.",
    no_credits: "You are out of emails this month. Add an email pack to send it.",
    suppressed: `${who} asked not to get pizzas, so it was not sent.`,
  };
  const lead = i.sent
    ? `It is ${who}'s ${what} today, so Gerald made a pizza and Potato delivered it this morning.`
    : `It is ${who}'s ${what} today. Gerald made a pizza and it is waiting on Home for you to send.` + (i.reason && why[i.reason] ? " " + why[i.reason] : "");
  const button = i.sent ? "See it in Slice of Thanks" : "Send it now";
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="height:14px;background:#D62828;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px;text-align:center">
<p style="margin:0 0 18px;font-size:18px;font-weight:bold;line-height:1.4">${esc(lead)}</p>
<a href="${esc(i.link)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3E2416">${esc(button)}</a>
<p style="margin:16px 0 0;font-size:12px;color:#6b4a3a">You get this because Gerald never forgets a date is on in Settings. Turn it off there any time.</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject, html, text: `${lead}\n\n${button}: ${i.link}` };
}

// To a trial member: 3 days left of The Whole Pie, or the last day. Sent to their reply-to address. It uses no email credit.
export function buildTrialEmail(i: { kind: "3d" | "end"; name?: string; days: number; upgradeLink: string; kitchenLink: string }): { subject: string; html: string; text: string } {
  const f = String(i.name ?? "").trim().split(" ")[0];
  const subject = i.kind === "end" ? "Your free trial of The Whole Pie ends today" : `${i.days} days left of The Whole Pie`;
  const lead = i.kind === "end"
    ? `${f ? f + ", y" : "Y"}our free trial of The Whole Pie ends today.`
    : `${f ? f + ", y" : "Y"}our free trial of The Whole Pie ends in ${i.days} days.`;
  const keep = ["Your logo and brand colors on the box", "Gift codes and your own button", "Pizzas after meetings and on birthdays that send on their own", "Send to a whole list at once", "250 emails a month"];
  const after = "After the trial you move to A Slice, which is free forever. Nothing you made is lost.";
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="height:14px;background:#D62828;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px;text-align:left">
<p style="margin:0 0 12px;font-size:20px;font-weight:bold;line-height:1.3">${esc(lead)}</p>
<p style="margin:0 0 8px;font-size:15px">Upgrade to keep:</p>
<ul style="margin:0 0 14px 20px;padding:0;font-size:15px;line-height:1.6">${keep.map((k) => `<li>${esc(k)}</li>`).join("")}</ul>
<p style="margin:0 0 18px;font-size:14px;color:#6b4a3a">${esc(after)}</p>
<p style="margin:0 0 12px;text-align:center"><a href="${esc(i.upgradeLink)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3E2416">Keep The Whole Pie</a></p>
<p style="margin:0;text-align:center;font-size:14px"><a href="${esc(i.kitchenLink)}" style="color:#C21F1F">Open my Kitchen</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#6b4a3a;text-align:center">You get this because you started a free trial of The Whole Pie. Gerald and Potato, Slice of Thanks.</p>
</td></tr></table></td></tr></table></body></html>`;
  const text = [lead, "", "Upgrade to keep:", ...keep.map((k) => "- " + k), "", after, "", `Keep The Whole Pie: ${i.upgradeLink}`, `Open my Kitchen: ${i.kitchenLink}`].join("\n");
  return { subject, html, text };
}

// To a member who typed a new "Replies go to" address: confirm it before replies go there. It uses no email credit.
export function buildReplyConfirmEmail(i: { link: string; email: string }): { subject: string; html: string; text: string } {
  const lead = `Tap the button to confirm that replies to your Slice of Thanks pizzas can come to ${i.email}.`;
  const after = "Until you confirm, replies go to Slice of Thanks and your email stays private. If you did not ask for this, ignore this email.";
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="padding:24px;text-align:center">
<p style="margin:0 0 14px;font-size:18px;font-weight:bold">Confirm where replies go</p>
<p style="margin:0 0 18px;font-size:15px;line-height:1.5">${esc(lead)}</p>
<a href="${esc(i.link)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:16px;padding:12px 24px;border-radius:999px;border:2px solid #3E2416">Confirm this address</a>
<p style="margin:16px 0 0;font-size:13px;color:#6b4a3a">${esc(after)}</p>
</td></tr></table></td></tr></table></body></html>`;
  return { subject: "Confirm where replies to your pizzas go", html, text: [lead, "", `Confirm: ${i.link}`, "", after].join("\n") };
}
