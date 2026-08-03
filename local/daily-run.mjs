// Daily pre-warm driven by the Claude subscription on this Mac.
//
// Reads today's GHL meetings, works out who still needs a deck, generates each
// one by driving Claude Code headlessly, and pushes the result to the server
// through the import endpoint. Then asks the server to post the Slack digest,
// which by then reports everything as ready.
//
//   node local/daily-run.mjs            generate and import
//   node local/daily-run.mjs --dry-run  show what it would do, generate nothing
//   node local/daily-run.mjs --no-slack skip the digest
//
// Credentials come from the macOS Keychain, so nothing sensitive lives on disk.

import { execFileSync } from 'child_process';
import { generateDeck } from './generate-deck.mjs';

const BASE = process.env.DISCOVERY_BASE || 'https://discovery.hirecharm.com';
const TZ = 'America/Los_Angeles';
const DRY = process.argv.includes('--dry-run');
const NO_SLACK = process.argv.includes('--no-slack');

const keychain = (service, account) => {
  try {
    return execFileSync('security', ['find-generic-password', '-s', service, '-a', account, '-w'], {
      encoding: 'utf8',
    }).trim();
  } catch {
    return '';
  }
};

process.env.GHL_TOKEN ||= keychain('charm-discovery', 'ghl-token');
process.env.GHL_LOCATION_ID ||= keychain('charm-discovery', 'ghl-location');
const APP_PASSWORD = process.env.APP_PASSWORD || keychain('charm-discovery', 'app-password');

const log = (...a) => console.log(new Date().toISOString(), ...a);

// The server owns domain resolution, duplicate collapsing and the skip list, so
// ask it what today looks like rather than reimplementing any of that here.
async function serverSession() {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ password: APP_PASSWORD }),
    redirect: 'manual',
  });
  const cookie = (res.headers.getSetCookie?.() || [])
    .map((c) => c.split(';')[0])
    .join('; ');
  if (!cookie) throw new Error('could not sign in to the server, check APP_PASSWORD');
  return cookie;
}

async function main() {
  if (!process.env.GHL_TOKEN || !process.env.GHL_LOCATION_ID) {
    throw new Error('GHL credentials not found in Keychain (charm-discovery / ghl-token, ghl-location)');
  }
  const cookie = await serverSession();

  const dryRes = await fetch(`${BASE}/api/prewarm/dry`, { headers: { cookie } });
  if (!dryRes.ok) throw new Error(`server dry run failed: ${dryRes.status}`);
  const plan = await dryRes.json();

  log(`${plan.date}: ${plan.meetings} meeting(s)` +
      (plan.duplicatesCollapsed ? `, ${plan.duplicatesCollapsed} duplicate(s) collapsed` : ''));

  const needed = plan.generated || [];        // dry run marks these as "would generate"
  const already = plan.reused || [];
  for (const r of already) log(`  already have ${r.domain} -> /d/${r.slug}`);
  for (const s of plan.skipped || []) log(`  skipping ${s.domain || s.who}: ${s.reason}`);

  if (!needed.length) {
    log('nothing to generate');
  } else {
    log(`generating ${needed.length} deck(s) via the Claude subscription`);
  }

  let totalCost = 0;
  for (const item of needed) {
    const domain = item.domain;
    if (DRY) { log(`  [dry run] would generate ${domain}`); continue; }
    const started = Date.now();
    try {
      log(`  ${domain}: researching and writing...`);
      const { deck, cost, turns } = await generateDeck(domain);
      totalCost += cost || 0;

      const company = deck.company?.name || domain;
      const slug = (company.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40)) ||
        domain.replace(/\./g, '-');

      const imp = await fetch(`${BASE}/api/decks/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', cookie },
        body: JSON.stringify({ slug, domain, company, data: deck }),
      });
      const body = await imp.json().catch(() => ({}));
      if (!imp.ok || !body.ok) throw new Error(`import failed: ${imp.status} ${JSON.stringify(body)}`);

      log(`  ${domain}: done in ${Math.round((Date.now() - started) / 1000)}s, ${turns} turns -> ${BASE}${body.url}`);
    } catch (err) {
      log(`  ${domain}: FAILED ${err.message}`);
    }
  }

  if (totalCost) log(`subscription usage reported for this run: $${totalCost.toFixed(4)} equivalent`);

  if (NO_SLACK || DRY) {
    log('skipping the Slack digest');
    return;
  }
  // Everything generated above is now stored, so the server's own run finds it
  // all as fresh and reuses it. No API key is touched.
  const run = await fetch(`${BASE}/api/prewarm/run?notify=1`, { method: 'POST', headers: { cookie } });
  log(`digest triggered: ${run.status} ${JSON.stringify(await run.json().catch(() => ({})))}`);
}

main().catch((e) => { log('RUN FAILED:', e.message); process.exit(1); });
