// Gerald makes a pizza on the server, for birthdays and work anniversaries (Gerald never forgets a date).
// Same rules as geraldPizza in the Kitchen: a Reserve vibe's sauce, cheese and recipe, the person's first name in pepperoni,
// and a note in the member's chosen style. Uses shared/gerald.json through lib/gerald-data.ts.
import { GERALD } from "./gerald-data.ts";

export type DateKind = "birthday" | "anniversary";
export type DatePerson = { name?: string; vegan?: boolean; years?: number | null };

const first = (n?: string) => String(n ?? "").trim().split(/\s+/)[0] || "";

// rand is passed in so tests can make the same pizza twice
export function datePizza(kind: DateKind, person: DatePerson, veganDefault = false, rand: () => number = Math.random) {
  const rv = GERALD.reserve.find((r: any) => r.id === GERALD.dateVibes[kind]);
  const vegan = !!person.vegan || veganDefault;
  const toppings: { k: string; x: number; y: number; rot: number }[] = [];
  for (const [k, n0] of rv.recipe as [string, number][]) {
    const fixed = ["handshake", "idea", "duck", "rocket", "eyes"].includes(k);
    const n = fixed ? n0 : Math.max(1, Math.round(n0 * 1.2));
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.283, d = Math.sqrt(rand()) * 0.8;
      toppings.push({ k, x: Math.cos(a) * d, y: Math.sin(a) * d, rot: rand() * 6.283 });
    }
  }
  const topic = first(person.name).slice(0, 16);
  return {
    size: 0.92, seed: rand() * 9 + 1, sauce: rv.sauce, cheese: vegan ? (rv.cheese === "cheddar" ? "vched" : "vmozz") : rv.cheese,
    vegan, toppings, bake: 1, baked: true, byGerald: true, bakeLevel: 3,
    ...(topic ? { sign: { text: topic } } : {}),
    name: topic && topic.length <= 22 ? `The ${topic} Reserve` : rv.pizza,
  };
}

// The note uses [first name], which the send fills in for each person
export function dateNote(kind: DateKind, style: string, years?: number | null, rand: () => number = Math.random): string {
  const byStyle = GERALD.notes[kind] ?? {};
  const list: string[] = byStyle[style] ?? byStyle.heartfelt ?? [];
  let note = list.length ? list[Math.floor(rand() * list.length)] : (kind === "birthday" ? "Happy birthday, [first name]!" : "Happy work anniversary, [first name]!");
  if (kind === "anniversary" && years && years > 0) note = `${years} ${years === 1 ? "year" : "years"}! ` + note;
  return note;
}

// The box: the member's signature box for their logo, sign-off and button, dressed for the occasion by Gerald.
// Pro boxes get the Reserve style and confetti; A Slice gets the Classic box and confetti.
export function dateBox(kind: DateKind, style: string, signatureBox: any, memberName: string | undefined, years: number | null | undefined, pro: boolean, rand?: () => number) {
  const rv = GERALD.reserve.find((r: any) => r.id === GERALD.dateVibes[kind]);
  const base = signatureBox && typeof signatureBox === "object" ? { ...signatureBox } : {};
  delete base.meeting; delete base.gift; delete base.topper;
  return {
    ...base,
    style: pro ? rv.style : "classic", sticker: rv.sticker, confetti: pro ? rv.confetti : "classic",
    note: dateNote(kind, style, years, rand),
    sign: base.sign || (memberName ? `From ${first(memberName) || memberName}` : ""),
    pro_style: pro, gerald_note: true,
  };
}

// Gerald's Birthday Special: only for Slice of Thanks members, on their birthday (docs/MEMBER_BIRTHDAY_PLAN.md).
// Star and heart pepperoni, sprinkles and candles (only on this pizza), their first name in pepperoni, the Birthday Bash box.
export function birthdaySpecial(name: string | undefined, year: number, gift: "trial" | "emails", site: string, rand: () => number = Math.random) {
  const toppings: { k: string; x: number; y: number; rot: number }[] = [];
  for (const [k, n] of [["pepStar", 12], ["pepHeart", 12], ["sprinkle", 22], ["candle", 6]] as [string, number][]) {
    for (let i = 0; i < n; i++) {
      const a = rand() * 6.283, d = Math.sqrt(rand()) * 0.8;
      toppings.push({ k, x: Math.cos(a) * d, y: Math.sin(a) * d, rot: rand() * 6.283 });
    }
  }
  const f = first(name).slice(0, 16);
  const pizza = {
    size: 0.92, seed: rand() * 9 + 1, sauce: "red", cheese: "mozz", vegan: false, toppings, bake: 1, baked: true, byGerald: true, bakeLevel: 3,
    ...(f ? { sign: { text: f } } : {}), name: "Gerald's Birthday Special",
  };
  const giftBox = gift === "trial"
    ? { text: "14 days of The Whole Pie, on the house. Unlock them within 30 days.", code: "HAPPY-BIRTHDAY", url: `${site}/kitchen?birthday=unlock`, cta: "Unlock my 14 days" }
    : { text: `100 bonus emails for the next 30 days, plus the ${year} birthday box topper, yours to keep.`, code: `PARTY-${year}`, url: `${site}/kitchen`, cta: "Open my Kitchen" };
  const box = {
    style: "hearts", sticker: "Happy Birthday", confetti: "party", tone: "playful", topper: `bday${year}`,
    note: `Happy birthday, ${f || "friend"}! The whole kitchen made this one just for you. Potato ate one slice. Sorry.`,
    sign: "Gerald, Head Chef, and Potato, Head of Delivery",
    birthday_special: true, gerald_note: true, gift: giftBox,
  };
  return { pizza, box };
}
