// Minimal GoHighLevel v2 client: today's appointments, and the contact behind
// each one. Read only.
//
// Auth is a Private Integration Token (pit-...) created in
// GHL > Settings > Private Integrations, scoped to:
//   calendars.readonly, calendars/events.readonly, contacts.readonly
//
// The v2 API's exact response shape varies by account, so every accessor here
// is defensive: it looks in several plausible places and returns null rather
// than throwing. checkGhl() prints what it actually found so the shape can be
// confirmed against a real account.

const BASE = 'https://services.leadconnectorhq.com';
const VERSION = '2021-04-15';

// Free providers: an address here tells us nothing about the company.
const FREE_EMAIL = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'ymail.com', 'hotmail.com',
  'outlook.com', 'live.com', 'msn.com', 'aol.com', 'icloud.com', 'me.com',
  'mac.com', 'proton.me', 'protonmail.com', 'pm.me', 'gmx.com', 'mail.com',
  'zoho.com', 'yandex.com', 'fastmail.com', 'hey.com', 'duck.com',
]);

function token() {
  const t = process.env.GHL_TOKEN;
  if (!t) throw new Error('GHL_TOKEN is not set.');
  return t;
}

function locationId() {
  const l = process.env.GHL_LOCATION_ID;
  if (!l) throw new Error('GHL_LOCATION_ID is not set.');
  return l;
}

async function ghl(path, params = {}) {
  const url = new URL(BASE + path);
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token()}`,
      Version: VERSION,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new Error(`GHL ${path} returned ${res.status}: ${body.slice(0, 300)}`);
  }
  return res.json();
}

// The local calendar date (YYYY-MM-DD) in a timezone at a given instant.
function localYmd(timeZone, at) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(at);
  const g = (t) => p.find((x) => x.type === t).value;
  return `${g('year')}-${g('month')}-${g('day')}`;
}

// The zone's UTC offset in millis at a given instant, read straight from Intl
// as "GMT-08:00". Deterministic, unlike parsing a formatted local date string.
function tzOffsetMs(timeZone, at) {
  const name = new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
    .formatToParts(at)
    .find((p) => p.type === 'timeZoneName')?.value || 'GMT+00:00';
  const m = name.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!m) return 0;
  return (m[1] === '-' ? -1 : 1) * (Number(m[2]) * 3600 + Number(m[3]) * 60) * 1000;
}

// The UTC instant of local midnight on a given local date. Iterates so the
// answer is still right when the offset changes across the boundary.
function localMidnightUtc(ymd, timeZone) {
  const target = Date.parse(`${ymd}T00:00:00Z`);
  let ts = target;
  for (let i = 0; i < 3; i++) ts = target - tzOffsetMs(timeZone, new Date(ts));
  return ts;
}

// Start and end of "today" in a given IANA timezone, as epoch millis.
// Derived from the next local midnight rather than start + 24h, because DST
// days are 23 or 25 hours long and the naive version drops or double counts
// an hour twice a year.
export function dayBounds(timeZone, now = new Date()) {
  const ymd = localYmd(timeZone, now);
  const start = localMidnightUtc(ymd, timeZone);
  // Step well clear of the boundary before asking for tomorrow's date.
  const tomorrowYmd = localYmd(timeZone, new Date(start + 36 * 3600 * 1000));
  const end = localMidnightUtc(tomorrowYmd, timeZone) - 1;
  return { startTime: start, endTime: end, ymd };
}

export async function listCalendars() {
  const data = await ghl('/calendars/', { locationId: locationId() });
  return data.calendars || data.calendar || [];
}

export async function todaysAppointments(timeZone = 'America/Los_Angeles') {
  const { startTime, endTime, ymd } = dayBounds(timeZone);
  const calendars = await listCalendars();

  const events = [];
  for (const cal of calendars) {
    const id = cal.id || cal._id || cal.calendarId;
    if (!id) continue;
    try {
      const data = await ghl('/calendars/events', {
        locationId: locationId(),
        calendarId: id,
        startTime,
        endTime,
      });
      for (const e of data.events || []) {
        events.push({ ...e, calendarName: cal.name || cal.calendarName || '' });
      }
    } catch (err) {
      console.warn(`prewarm: calendar ${id} failed: ${err.message}`);
    }
  }

  // Cancelled and no-show appointments are not worth a deck.
  const live = events.filter((e) => {
    const s = String(e.appointmentStatus || e.status || '').toLowerCase();
    return !['cancelled', 'canceled', 'noshow', 'no_show', 'invalid'].includes(s);
  });

  return { date: ymd, appointments: live };
}

export async function getContact(contactId) {
  const data = await ghl(`/contacts/${contactId}`);
  return data.contact || data;
}

// Custom field definitions, fetched once. A contact's customFields array only
// carries {id, value} with no name, so matching a "Website" custom field by
// name requires this id -> name map. Without it that path silently never fires.
let fieldNameCache = null;

export async function customFieldNames() {
  if (fieldNameCache) return fieldNameCache;
  const map = new Map();
  try {
    const res = await fetch(
      `${BASE}/locations/${locationId()}/customFields`,
      {
        headers: {
          Authorization: `Bearer ${token()}`,
          Version: '2021-07-28',
          Accept: 'application/json',
        },
      }
    );
    if (res.ok) {
      const data = await res.json();
      for (const f of data.customFields || data.customField || []) {
        if (f.id) map.set(f.id, String(f.name || f.fieldKey || ''));
      }
    }
  } catch (err) {
    console.warn('ghl: could not load custom field names:', err.message);
  }
  fieldNameCache = map;
  return map;
}

// Pull a website domain off a contact: explicit website field first, then a
// custom field that looks like a website, then the email domain if it is not a
// free provider. Pass fieldNames from customFieldNames() to enable the middle
// step; without it custom fields are skipped rather than silently mismatched.
export function domainFromContact(contact, fieldNames = null) {
  if (!contact) return { domain: null, via: 'no contact' };

  const candidates = [contact.website, contact.companyWebsite, contact.company_website];

  for (const f of contact.customFields || contact.custom_fields || []) {
    const name = String(
      f.name || f.key || f.fieldKey || (fieldNames && fieldNames.get(f.id)) || ''
    ).toLowerCase();
    if (name && /(website|web site|url|domain|company site)/.test(name)) {
      candidates.push(f.value ?? f.fieldValue ?? f.field_value);
    }
  }

  for (const raw of candidates) {
    const d = normalizeDomain(raw);
    if (d) return { domain: d, via: 'website field' };
  }

  const email = contact.email || contact.emailAddress;
  if (email && email.includes('@')) {
    const host = email.split('@').pop().trim().toLowerCase();
    if (!FREE_EMAIL.has(host)) {
      const d = normalizeDomain(host);
      if (d) return { domain: d, via: 'email domain' };
    }
    return { domain: null, via: `free email provider (${host})` };
  }

  return { domain: null, via: 'no website field and no email' };
}

export function normalizeDomain(input) {
  if (!input) return null;
  let d = String(input).trim().toLowerCase();
  d = d.replace(/^https?:\/\//, '').replace(/^www\./, '');
  d = d.split('/')[0].split('?')[0].split('#')[0].split(':')[0].trim();
  if (!/^[a-z0-9]([a-z0-9-]*[a-z0-9])?(\.[a-z0-9]([a-z0-9-]*[a-z0-9])?)+$/.test(d)) return null;
  if (d.split('.').pop().length < 2) return null;
  return d;
}

// Cheap liveness check before spending ten minutes and real money researching a
// domain. Catches typos, dead domains, and junk from test bookings. A HEAD that
// resolves and answers anything at all is enough; we are not judging content.
export async function domainResolves(domain, timeoutMs = 8000) {
  for (const scheme of ['https', 'http']) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), timeoutMs);
      const res = await fetch(`${scheme}://${domain}`, {
        method: 'HEAD',
        redirect: 'follow',
        signal: ctrl.signal,
      });
      clearTimeout(t);
      if (res.status < 500) return true;
    } catch {
      // try the next scheme
    }
  }
  return false;
}

// Prints what the account actually returns, so the response shape can be
// confirmed without guessing. Run with: node -e "import('./ghl.js').then(m=>m.checkGhl())"
export async function checkGhl() {
  console.log('locationId:', locationId());
  const cals = await listCalendars();
  console.log(`calendars: ${cals.length}`);
  for (const c of cals) console.log('  -', c.id || c._id, c.name || c.calendarName);

  const { date, appointments } = await todaysAppointments();
  console.log(`appointments today (${date}): ${appointments.length}`);
  for (const a of appointments) {
    console.log('  -', a.startTime, a.title || a.appointmentTitle || '(untitled)', '| contact:', a.contactId);
  }
  if (appointments[0]?.contactId) {
    const c = await getContact(appointments[0].contactId);
    console.log('first contact keys:', Object.keys(c).join(', '));
    console.log('resolved domain:', domainFromContact(c));
  }
}
