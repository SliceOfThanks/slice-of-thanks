// Calendly and TidyCal: each member signs in to their own account with OAuth, and we read their meetings.
// Calendly: auth.calendly.com OAuth, api.calendly.com v2 (scheduled_events plus invitees). Refresh tokens rotate on every refresh.
// TidyCal: tidycal.com/oauth (Laravel Passport), tidycal.com/api (bookings, booking-types, me).

export type Provider = "calendly" | "tidycal";
export type Tokens = { access: string; refresh?: string; expires_at?: number };
export type CalMeeting = { id: string; title: string; starts_at: string; ends_at: string; name?: string; email?: string; canceled: boolean };
export type CalConfig = { clientId: string; clientSecret: string; redirectUri: string; fetchFn?: typeof fetch };

export const CAL = {
  calendly: { label: "Calendly", authorize: "https://auth.calendly.com/oauth/authorize", token: "https://auth.calendly.com/oauth/token", idEnv: "CALENDLY_CLIENT_ID", secretEnv: "CALENDLY_CLIENT_SECRET" },
  tidycal: { label: "TidyCal", authorize: "https://tidycal.com/oauth/authorize", token: "https://tidycal.com/oauth/token", idEnv: "TIDYCAL_CLIENT_ID", secretEnv: "TIDYCAL_CLIENT_SECRET" },
} as const;

export const isProvider = (p: unknown): p is Provider => p === "calendly" || p === "tidycal";

// The member has to connect again (token revoked or expired for good)
export class CalendarAuthError extends Error {}

export function authorizeUrl(p: Provider, cfg: CalConfig, state: string): string {
  const q = new URLSearchParams({ client_id: cfg.clientId, response_type: "code", redirect_uri: cfg.redirectUri, state });
  return `${CAL[p].authorize}?${q}`;
}

async function tokenCall(p: Provider, cfg: CalConfig, fields: Record<string, string>): Promise<Tokens> {
  const res = await (cfg.fetchFn ?? fetch)(CAL[p].token, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
    body: new URLSearchParams({ client_id: cfg.clientId, client_secret: cfg.clientSecret, ...fields }),
    signal: AbortSignal.timeout(10000),
  });
  const j = await res.json().catch(() => ({}));
  if (res.status === 400 || res.status === 401) throw new CalendarAuthError(`${p} token ${res.status} ${j?.error ?? ""}`.trim());
  if (!res.ok || !j.access_token) throw new Error(`${p} token ${res.status}`);
  return {
    access: String(j.access_token),
    refresh: j.refresh_token ? String(j.refresh_token) : fields.refresh_token,
    expires_at: j.expires_in ? Math.floor(Date.now() / 1000) + Number(j.expires_in) : undefined,
    ...(p === "calendly" && j.owner ? { owner: String(j.owner) } : {}),
  } as Tokens;
}

export const exchangeCode = (p: Provider, cfg: CalConfig, code: string) =>
  tokenCall(p, cfg, { grant_type: "authorization_code", code, redirect_uri: cfg.redirectUri });

export const refreshTokens = (p: Provider, cfg: CalConfig, refresh: string) =>
  tokenCall(p, cfg, { grant_type: "refresh_token", refresh_token: refresh });

// Refresh a minute or two before the access token runs out
export const needsRefresh = (t: Tokens, now = Date.now()) => !!(t.refresh && t.expires_at && t.expires_at * 1000 < now + 120_000);

async function getJson(url: string, access: string, fetchFn: typeof fetch = fetch) {
  const res = await fetchFn(url, { headers: { authorization: `Bearer ${access}`, accept: "application/json" }, signal: AbortSignal.timeout(10000) });
  if (res.status === 401) throw new CalendarAuthError(`401 ${url.split("?")[0]}`);
  const j = await res.json().catch(() => null);
  if (!res.ok || !j) throw new Error(`${res.status} ${url.split("?")[0]}`);
  return j;
}

// Who signed in: the account ID we sync with, and a label for Settings
export async function whoAmI(p: Provider, access: string, fetchFn?: typeof fetch): Promise<{ account: string; label: string }> {
  if (p === "calendly") {
    const r = (await getJson("https://api.calendly.com/users/me", access, fetchFn)).resource ?? {};
    return { account: String(r.uri ?? ""), label: String(r.email || r.name || "") };
  }
  const j = await getJson("https://tidycal.com/api/me", access, fetchFn);
  const u = j.data ?? j;
  return { account: String(u.email ?? u.vanity_path ?? ""), label: String(u.email || u.name || "") };
}

const MAX = 60;

export async function listMeetings(p: Provider, access: string, account: string, from: Date, to: Date, fetchFn?: typeof fetch): Promise<CalMeeting[]> {
  return p === "calendly" ? calendlyMeetings(access, account, from, to, fetchFn) : tidycalMeetings(access, from, to, fetchFn);
}

export async function calendlyMeetings(access: string, userUri: string, from: Date, to: Date, fetchFn?: typeof fetch): Promise<CalMeeting[]> {
  const q = new URLSearchParams({ user: userUri, min_start_time: from.toISOString(), max_start_time: to.toISOString(), count: "100", sort: "start_time:asc" });
  const events = ((await getJson(`https://api.calendly.com/scheduled_events?${q}`, access, fetchFn)).collection ?? []).slice(0, MAX);
  const out: CalMeeting[] = [];
  for (const e of events) {
    const uri = String(e.uri ?? "");
    if (!uri || !e.start_time || !e.end_time) continue;
    // The first active invitee is the guest who gets the pizza
    let name: string | undefined, email: string | undefined;
    try {
      const inv = (await getJson(`${uri}/invitees?count=10`, access, fetchFn)).collection ?? [];
      const g = inv.find((x: any) => x.status === "active") ?? inv[0];
      if (g) { name = g.name ? String(g.name) : undefined; email = g.email ? String(g.email) : undefined; }
    } catch (err) {
      if (err instanceof CalendarAuthError) throw err;
    }
    out.push({ id: uri.split("/").pop() || uri, title: String(e.name ?? "Meeting"), starts_at: e.start_time, ends_at: e.end_time, name, email, canceled: e.status === "canceled" });
  }
  return out;
}

// TidyCal only accepts Y-m-dTH:i:sZ (no milliseconds); a plain date is refused with a 422
const day = (d: Date) => d.toISOString().slice(0, 19) + "Z";

export async function tidycalMeetings(access: string, from: Date, to: Date, fetchFn?: typeof fetch): Promise<CalMeeting[]> {
  const types = new Map<number, string>();
  try {
    for (const t of (await getJson("https://tidycal.com/api/booking-types", access, fetchFn)).data ?? []) types.set(Number(t.id), String(t.title ?? ""));
  } catch (err) {
    if (err instanceof CalendarAuthError) throw err;
  }
  const out: CalMeeting[] = [];
  const seen = new Set<string>();
  // Active bookings, then cancelled ones so a cancelled meeting stops waiting for a pizza
  for (const cancelled of [false, true]) {
    const q = new URLSearchParams({ starts_at: day(from), ends_at: day(to) });
    if (cancelled) q.set("cancelled", "true");
    for (const b of ((await getJson(`https://tidycal.com/api/bookings?${q}`, access, fetchFn)).data ?? []).slice(0, MAX)) {
      const id = String(b.id ?? "");
      if (!id || seen.has(id) || !b.starts_at || !b.ends_at) continue;
      seen.add(id);
      out.push({
        id, title: types.get(Number(b.booking_type_id)) || String(b.booking_type?.title ?? "Meeting"), starts_at: b.starts_at, ends_at: b.ends_at,
        name: b.contact?.name ? String(b.contact.name) : undefined, email: b.contact?.email ? String(b.contact.email) : undefined,
        canceled: !!b.cancelled_at,
      });
    }
  }
  return out;
}

// Everyone the member has met through the calendar, for importing into People.
// TidyCal: the contacts list (100 a page). Calendly has no contacts list, so it is the guests of the past year's meetings.
export type CalContact = { name?: string; email: string };

export async function listContacts(p: Provider, access: string, account: string, fetchFn?: typeof fetch): Promise<CalContact[]> {
  const out = new Map<string, CalContact>();
  const add = (name: unknown, email: unknown) => {
    const e = String(email ?? "").trim().toLowerCase();
    if (e && !out.has(e)) out.set(e, { name: name ? String(name) : undefined, email: e });
  };
  if (p === "tidycal") {
    for (let page = 1, last = 1; page <= Math.min(last, 10); page++) {
      const j = await getJson(`https://tidycal.com/api/contacts?page=${page}`, access, fetchFn);
      for (const c of j.data ?? []) add(c.name, c.email);
      last = Number(j.meta?.last_page ?? 1);
    }
    return [...out.values()];
  }
  const now = Date.now();
  let url: string | null = `https://api.calendly.com/scheduled_events?${new URLSearchParams({ user: account, min_start_time: new Date(now - 365 * 86_400_000).toISOString(), max_start_time: new Date(now + 30 * 86_400_000).toISOString(), count: "100", sort: "start_time:desc" })}`;
  let events = 0;
  for (let pages = 0; url && pages < 3 && events < 120; pages++) {
    const j: any = await getJson(url, access, fetchFn);
    for (const e of j.collection ?? []) {
      if (events >= 120 || !e.uri) break;
      events++;
      try {
        for (const g of (await getJson(`${e.uri}/invitees?count=20`, access, fetchFn)).collection ?? []) add(g.name, g.email);
      } catch (err) {
        if (err instanceof CalendarAuthError) throw err;
      }
    }
    url = j.pagination?.next_page ?? null;
  }
  return [...out.values()];
}
