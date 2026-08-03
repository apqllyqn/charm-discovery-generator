// Daily pre-warm: read today's GHL appointments, resolve each booker's domain,
// and generate a deck for anyone who does not already have a fresh one.
//
// Decks land silently in the console. Nothing is sent anywhere.

import {
  todaysAppointments,
  getContact,
  domainFromContact,
  customFieldNames,
  domainResolves,
} from './ghl.js';
import { generateDeckData } from './research.js';
import { saveDeck, getDeck, listDecks } from './store.js';
import { sendDigest } from './slack.js';

const TZ = process.env.PREWARM_TZ || 'America/Los_Angeles';

// A deck older than this gets regenerated rather than reused, since signals go
// stale fast and that is the whole premise of the pitch.
const FRESH_DAYS = Number(process.env.PREWARM_FRESH_DAYS || 14);

// Domains never worth generating: internal test bookings and the like. A
// reachability check cannot catch these because they are really registered.
// Comma separated, e.g. PREWARM_SKIP_DOMAINS=troll.com,example.com
// Manual email to domain mapping, for people who book from a personal address.
// Without this they are skipped forever, because guessing a company from a
// gmail address produces confidently wrong decks. Format:
//   PREWARM_EMAIL_DOMAINS=someone@gmail.com=acme.com,other@gmail.com=foo.io
const EMAIL_OVERRIDES = new Map(
  (process.env.PREWARM_EMAIL_DOMAINS || '')
    .split(',')
    .map((pair) => pair.split('='))
    .filter((p) => p.length === 2 && p[0].includes('@'))
    .map(([email, domain]) => [email.trim().toLowerCase(), domain.trim().toLowerCase()])
);

const SKIP_DOMAINS = new Set(
  (process.env.PREWARM_SKIP_DOMAINS || 'troll.com,example.com,test.com')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)
);

function slugify(company, domain) {
  const base = (company || domain)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40);
  return base || domain.replace(/\./g, '-');
}

let running = false;
let lastRunDate = null;

export function prewarmState() {
  return { running, lastRunDate, tz: TZ };
}

// notify defaults to false so that nothing can post by accident. Only the
// scheduled run and an explicit notify=1 opt in.
export async function runPrewarm({ dryRun = false, notify = false } = {}) {
  if (running) return { skipped: 'already running' };
  running = true;
  const started = Date.now();
  const report = { date: null, meetings: 0, generated: [], reused: [], skipped: [], failed: [] };

  try {
    const { date, appointments: raw } = await todaysAppointments(TZ);
    report.date = date;

    // Collapse duplicate bookings by the same contact on the same day, keeping
    // the earliest slot. Someone double booking themselves is common, and
    // counting it twice makes the digest read as though a meeting was missed.
    const byContact = new Map();
    const noContact = [];
    for (const a of raw) {
      if (!a.contactId) { noContact.push(a); continue; }
      const seen = byContact.get(a.contactId);
      if (!seen || String(a.startTime) < String(seen.startTime)) byContact.set(a.contactId, a);
    }
    const appointments = [...byContact.values(), ...noContact].sort((x, y) =>
      String(x.startTime).localeCompare(String(y.startTime))
    );

    report.meetings = appointments.length;
    report.duplicatesCollapsed = raw.length - appointments.length;
    console.log(
      `prewarm: ${appointments.length} meeting(s) on ${date} (${TZ})` +
        (report.duplicatesCollapsed
          ? `, ${report.duplicatesCollapsed} duplicate booking(s) collapsed`
          : '')
    );

    const existing = await listDecks(500);
    const cutoff = Date.now() - FRESH_DAYS * 86400000;
    const freshByDomain = new Map();
    for (const d of existing) {
      if (new Date(d.created_at).getTime() >= cutoff) freshByDomain.set(d.domain, d);
    }

    const seen = new Set();
    const fieldNames = await customFieldNames();

    for (const appt of appointments) {
      const when = appt.startTime || appt.start_time || '';
      const title = appt.title || appt.appointmentTitle || '(untitled)';
      let contact = null;

      if (appt.contactId) {
        try {
          contact = await getContact(appt.contactId);
        } catch (err) {
          console.warn(`prewarm: contact ${appt.contactId} failed: ${err.message}`);
        }
      }

      const who = contact?.email || contact?.name || appt.contactId || 'unknown';
      const override = EMAIL_OVERRIDES.get(String(contact?.email || '').toLowerCase());
      const { domain, via } = override
        ? { domain: override, via: 'manual mapping' }
        : domainFromContact(contact, fieldNames);

      if (!domain) {
        report.skipped.push({ when, title, who, reason: via });
        console.log(`prewarm: skip ${who} (${via})`);
        continue;
      }
      if (seen.has(domain)) continue;
      seen.add(domain);

      if (SKIP_DOMAINS.has(domain)) {
        report.skipped.push({ when, title, who, domain, reason: 'on the skip list' });
        console.log(`prewarm: skip ${domain} (skip list)`);
        continue;
      }

      // Do not spend ten minutes researching a domain that is not even live.
      if (!(await domainResolves(domain))) {
        report.skipped.push({ when, title, who, domain, reason: 'domain does not respond' });
        console.log(`prewarm: skip ${domain} (does not respond)`);
        continue;
      }

      const fresh = freshByDomain.get(domain);
      if (fresh) {
        report.reused.push({ when, title, domain, slug: fresh.slug });
        console.log(`prewarm: reuse ${domain} -> /d/${fresh.slug}`);
        continue;
      }

      if (dryRun) {
        report.generated.push({ when, title, domain, via, slug: '(dry run)' });
        console.log(`prewarm: would generate ${domain} (via ${via})`);
        continue;
      }

      try {
        console.log(`prewarm: generating ${domain} (via ${via})`);
        const data = await generateDeckData(domain, (m) => console.log(`  ${domain}: ${m}`));
        const company = data.company?.name || domain;
        let slug = slugify(company, domain);
        // Do not clobber an unrelated older deck that happens to share a slug.
        const clash = await getDeck(slug);
        if (clash && clash.domain !== domain) slug = `${slug}-${domain.split('.')[0]}`;
        await saveDeck({ slug, domain, company, data });
        report.generated.push({ when, title, domain, via, slug, company });
        console.log(`prewarm: done ${domain} -> /d/${slug}`);
      } catch (err) {
        report.failed.push({ when, title, domain, error: err.message });
        console.error(`prewarm: FAILED ${domain}: ${err.message}`);
      }
    }

    lastRunDate = date;
  } catch (err) {
    report.failed.push({ error: err.message });
    console.error('prewarm: run failed:', err.message);
  } finally {
    running = false;
  }

  report.elapsedSec = Math.round((Date.now() - started) / 1000);
  console.log(
    `prewarm: finished in ${report.elapsedSec}s. ` +
      `generated=${report.generated.length} reused=${report.reused.length} ` +
      `skipped=${report.skipped.length} failed=${report.failed.length}`
  );

  // Only ever posts on a real run that explicitly asked for it.
  if (notify && !dryRun) report.slack = await sendDigest(report, TZ);

  return report;
}

// ---------------------------------------------------------------- scheduler

// Local wall-clock hour and minute in the configured timezone. Using Intl keeps
// this correct across PST and PDT with no date library and no DST maths.
function nowIn(tz) {
  const p = new Intl.DateTimeFormat('en-CA', {
    timeZone: tz,
    hour12: false,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit',
  }).formatToParts(new Date());
  const g = (t) => p.find((x) => x.type === t).value;
  return {
    ymd: `${g('year')}-${g('month')}-${g('day')}`,
    hour: Number(g('hour')) % 24,
    minute: Number(g('minute')),
  };
}

export function startScheduler() {
  if (!process.env.GHL_TOKEN || !process.env.GHL_LOCATION_ID) {
    console.log('prewarm: scheduler off (GHL_TOKEN or GHL_LOCATION_ID not set)');
    return;
  }
  const hour = Number(process.env.PREWARM_HOUR ?? 8);
  const minute = Number(process.env.PREWARM_MINUTE ?? 0);
  console.log(`prewarm: scheduled daily at ${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')} ${TZ}`);

  setInterval(() => {
    const t = nowIn(TZ);
    if (t.hour !== hour || t.minute !== minute) return;
    if (lastRunDate === t.ymd || running) return;
    lastRunDate = t.ymd; // claim the slot before the await so we cannot double fire
    console.log(`prewarm: firing for ${t.ymd}`);
    runPrewarm({ notify: true }).catch((e) => console.error('prewarm:', e.message));
  }, 30_000);
}
