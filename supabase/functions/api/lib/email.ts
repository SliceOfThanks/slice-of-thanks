// Builds the "you got a pizza" email in English or Spanish.
// Every email carries the sender's identity and mailing address, unsubscribe links, why-you-got-this and legal links.

export const SITE = "https://www.sliceofthanks.app";

type Sender = { name?: string; business?: string; send_as?: string; mailing_address?: string; show_made_with?: boolean };
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

export function buildEmail(i: EmailInput): { subject: string; html: string; text: string } {
  const t = i.locale === "es" ? T.es : T.en;
  const who = senderLabel(i.sender);
  const fullFrom = [i.sender.name, i.sender.business].filter(Boolean).join(", ");
  const subject = (i.isTest ? `[${t.test}] ` : "") + t.subject(who);
  const html = `<!doctype html><html><body style="margin:0;background:#fbf0d9;font-family:Arial,Helvetica,sans-serif;color:#3a1d12">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fbf0d9"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#fffaef;border:3px solid #3a1d12;border-radius:18px">
<tr><td style="height:14px;background:#c4122f;border-radius:14px 14px 0 0"></td></tr>
<tr><td style="padding:24px 24px 8px;text-align:center">
${i.potatoImageUrl ? `<img src="${esc(i.potatoImageUrl)}" width="240" alt="Potato the bulldog on her delivery scooter" style="display:block;margin:0 auto 12px;max-width:100%;height:auto">` : ""}
<p style="margin:0 0 6px;font-size:16px">${esc(t.hi(i.recipientName))}</p>
<p style="margin:0 0 18px;font-size:20px;font-weight:bold;line-height:1.3">${esc(t.lead(who))}</p>
${i.pizzaImageUrl ? `<img src="${esc(i.pizzaImageUrl)}" width="200" alt="" style="display:block;margin:0 auto 18px;max-width:100%;height:auto">` : ""}
<a href="${esc(i.link)}" style="display:inline-block;background:#c4122f;color:#fff6e3;text-decoration:none;font-weight:bold;font-size:17px;padding:14px 28px;border-radius:999px;border:2px solid #3a1d12">${esc(t.button)}</a>
<p style="margin:16px 0 0;font-size:14px;color:#6b4a3a">${esc(t.note)}</p>
</td></tr>
<tr><td style="padding:18px 24px 22px;font-size:12px;line-height:1.6;color:#6b4a3a;text-align:center;border-top:1px dashed #d8c4a4">
${esc(fullFrom)}<br>${esc(i.sender.mailing_address)}<br>
${esc(t.why(who))}<br>
<a href="${esc(i.unsubscribeSender)}" style="color:#a3102a">${esc(t.unsubSender(who))}</a> · <a href="${esc(i.unsubscribeAll)}" style="color:#a3102a">${esc(t.unsubAll)}</a><br>
<a href="${SITE}/privacy" style="color:#a3102a">${esc(t.privacy)}</a> · <a href="${SITE}/terms" style="color:#a3102a">${esc(t.terms)}</a> · <a href="${SITE}/report" style="color:#a3102a">${esc(t.report)}</a>
${i.sender.show_made_with ? `<br><a href="${SITE}" style="color:#6b4a3a">${esc(t.made)}</a>` : ""}
</td></tr></table></td></tr></table></body></html>`;
  const text = [
    t.hi(i.recipientName), "", t.lead(who), "", `${t.button}: ${i.link}`, "", t.note, "", "--",
    fullFrom, i.sender.mailing_address ?? "", t.why(who),
    `${t.unsubSender(who)}: ${i.unsubscribeSender}`, `${t.unsubAll}: ${i.unsubscribeAll}`,
    `${t.privacy}: ${SITE}/privacy`, `${t.terms}: ${SITE}/terms`,
  ].join("\n");
  return { subject, html, text };
}
