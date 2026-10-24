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
  isTest?: boolean;
};

const T = {
  en: {
    subject: (s: string) => `${s} sent you a slice of thanks`,
    hi: (n?: string) => (n ? `Hi ${n},` : "Hi,"),
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
  },
  es: {
    subject: (s: string) => `${s} te envió una porción de agradecimiento`,
    hi: (n?: string) => (n ? `Hola ${n}:` : "Hola:"),
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

// The member's own address when they added one; otherwise Slice of Thanks's address as the designated sender
export function footerAddress(s: Sender, via: string): string {
  const own = (s.mailing_address ?? "").trim();
  if (own) return own;
  const ours = (s.platform_address ?? "").trim();
  return ours ? `${via}, ${ours}` : via;
}

export function buildEmail(i: EmailInput): { subject: string; html: string; text: string } {
  const t = i.locale === "es" ? T.es : T.en;
  const who = senderLabel(i.sender);
  const headline = senderHeadline(i.sender, t.from);
  const fullFrom = [i.sender.name, i.sender.business].filter(Boolean).join(", ");
  const address = footerAddress(i.sender, t.via);
  const subject = (i.isTest ? `[${t.test}] ` : "") + t.subject(headline);
  const html = `<!doctype html><html><body style="margin:0;background:#FFF3E0;font-family:Arial,Helvetica,sans-serif;color:#3E2416">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#FFF3E0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3E2416;border-radius:18px">
<tr><td style="height:14px;background:#D62828;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px 24px 8px;text-align:center">
${i.potatoImageUrl ? `<img src="${esc(i.potatoImageUrl)}" width="240" alt="Potato the bulldog on her delivery scooter" style="display:block;margin:0 auto 12px;max-width:100%;height:auto">` : ""}
<p style="margin:0 0 6px;font-size:16px">${esc(t.hi(i.recipientName))}</p>
<p style="margin:0 0 18px;font-size:20px;font-weight:bold;line-height:1.3">${esc(t.lead(headline))}</p>
${i.pizzaImageUrl ? `<img src="${esc(i.pizzaImageUrl)}" width="200" alt="" style="display:block;margin:0 auto 18px;max-width:100%;height:auto">` : ""}
<a href="${esc(i.link)}" style="display:inline-block;background:#D62828;color:#FFF3E0;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3E2416">${esc(t.button)}</a>
<p style="margin:16px 0 0;font-size:14px;color:#6b4a3a">${esc(t.note)}</p>
</td></tr>
<tr><td style="padding:18px 24px 22px;font-size:12px;line-height:1.6;color:#6b4a3a;text-align:center;border-top:1px dashed #d8c4a4">
${esc(fullFrom)}<br>${esc(address)}<br>
${esc(t.why(who))}<br>
<a href="${esc(i.unsubscribeSender)}" style="color:#C21F1F">${esc(t.unsubSender(who))}</a> · <a href="${esc(i.unsubscribeAll)}" style="color:#C21F1F">${esc(t.unsubAll)}</a><br>
<a href="${SITE}/privacy" style="color:#C21F1F">${esc(t.privacy)}</a> · <a href="${SITE}/terms" style="color:#C21F1F">${esc(t.terms)}</a> · <a href="${SITE}/report" style="color:#C21F1F">${esc(t.report)}</a>
${i.sender.show_made_with ? `<br><a href="${SITE}" style="color:#6b4a3a">${esc(t.made)}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    t.hi(i.recipientName), "", t.lead(headline), "", `${t.button}: ${i.link}`, "", t.note, "", "--",
    fullFrom, address, t.why(who),
    `${t.unsubSender(who)}: ${i.unsubscribeSender}`, `${t.unsubAll}: ${i.unsubscribeAll}`,
    `${t.privacy}: ${SITE}/privacy`, `${t.terms}: ${SITE}/terms`,
  ].join("\n");
  return { subject, html, text };
}
