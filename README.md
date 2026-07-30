# Charm Discovery Asset Generator

Enter a prospect's domain, get a personalized top-of-funnel discovery deck.
Built for `discovery.hirecharm.com`.

Chris enters a domain before a call. Claude researches the company and its
market, then writes the personalized slots of the Charm discovery narrative.
The output is a hosted, keyboard-driven deck at `/d/<slug>` that Chris presents
from and can send afterwards.

## The narrative

The deck spine is fixed. Only the copy inside it is personalized.

1. Cover
2. What are we doing at top of funnel? Generate awareness. Educate.
3. How do we do that? Channels.
4. Charm runs outbound: email, LinkedIn, phone.
5. The turn: we are here to talk about driving awareness using email and LinkedIn.
6. Your world: who you are, who you sell to, your TAM.
7. Where the TAM splits.
8. What we do for you: 1) get the leads, 2) write the words, 3) **read the
   signals** (teased), 4) manage the infrastructure.
9. All at once: intertwined multi-touch sequences for every prospect in your TAM.
10. "But this is where it gets cool."
11. Pain is not always stated. The scream versus the wince.
12. Signals we would watch for this prospect.
13. The signal fires, the words change: real sample email and LinkedIn touches.
14. The read: what we noticed, the gap, the question.
15. Two calls. The read, then the remedy.

Presenter notes live on every slide. Press **N**.

## Deck controls

| Key | Action |
| --- | --- |
| `→` `space` | Next slide |
| `←` | Previous slide |
| `N` | Toggle presenter notes |
| `M` | Slide menu |
| `Home` / `End` | First / last slide |
| swipe | Next / previous on touch |

The URL carries the slide number (`/d/acme#7`), so you can send someone straight
to a slide.

## How generation works

Two model passes, both `claude-opus-5`.

**Pass 1, research** (`research.js` → `researchPass`). Web search plus web fetch,
capped at 12 searches and 10 fetches. Produces a factual brief: what they do, who
they sell to, TAM shape, deal shape, observable go-to-market, market pressure,
five buying signals, risks, sources. The prompt forbids inventing customers,
headcounts, funding, or metrics, and requires "unknown" where it cannot verify.
Handles `pause_turn` by resuming, up to 5 continuations.

**Pass 2, write** (`writePass`). No tools. Takes the brief and returns deck copy
constrained to `DECK_SCHEMA` via structured outputs. The system prompt carries the
Charm brand kit, the lexicon, and the fixed narrative from `brand.js`.

The two are split so the schema-constrained call never has to deal with server
tool pausing, and so the research prompt can be tuned without touching the writer.

Everything is scrubbed for em dashes on the way out, because the model will
occasionally sneak one in despite the instruction.

The raw research brief is kept and readable at `/d/<slug>/brief` (password gated),
so Chris can skim the facts before the call.

## Daily GHL pre-warm

Each morning the app reads that day's GoHighLevel appointments, resolves each
booker's website, and generates a deck for anyone who does not already have a
fresh one. Decks land silently in the console. Nothing is sent anywhere.

**Off by default.** With no `GHL_TOKEN` the scheduler never starts and the app
behaves exactly as before.

**Setup.** In GHL: Settings > Private Integrations > create a token scoped to
`calendars.readonly`, `calendars/events.readonly`, `contacts.readonly`. Then set
`GHL_TOKEN` and `GHL_LOCATION_ID` (the id in the GHL URL,
`/v2/location/<this>/dashboard`).

**Domain resolution**, in order: the contact's website field (including any
custom field whose name looks like website / url / domain), then the email
domain, skipping free providers like gmail and outlook. Anything unresolved is
listed in the run report rather than guessed at.

A domain with a deck younger than `PREWARM_FRESH_DAYS` (default 14) is reused
rather than regenerated, since signals go stale and that is the premise of the
pitch.

**Endpoints** (all password gated):

| Route | Does |
| --- | --- |
| `GET /api/prewarm/check` | Proves the token works and prints what GHL returns. Generates nothing. |
| `GET /api/prewarm/dry` | Full run without generating: which meetings, which domains, what it would skip. Spends nothing. |
| `POST /api/prewarm/run` | Fires the real job now. Returns immediately, generates in the background. |
| `GET /api/prewarm/state` | Whether a run is in flight and when it last ran. |

**Timing.** Defaults to 08:00 `America/Los_Angeles` via `PREWARM_HOUR` /
`PREWARM_MINUTE` / `PREWARM_TZ`. Note a deck takes 4 to 13 minutes, so a full
morning of meetings can take a while. If Chris has early calls, move the hour
earlier so the decks are ready rather than still building.

DST is handled by reading the real UTC offset from `Intl`, so the day window is
23 hours on spring-forward and 25 on fall-back rather than a naive 24.

## Auth

- `/` (the generator console) and `/api/*` are gated by `APP_PASSWORD`.
- `/d/<slug>` is **open**. Deck links are unlisted, not authenticated, so Chris can
  send one to a prospect without handing over a password. Decks are `noindex`.
- `/d/<slug>/brief` is gated. The internal research notes stay internal.

## Local development

```sh
npm install
cp .env.example .env      # fill in ANTHROPIC_API_KEY and APP_PASSWORD
export $(grep -v '^#' .env | xargs)
npm start                 # http://localhost:3000
```

Without `DATABASE_URL`, decks are stored in `./data/decks.json`. No database
needed to run locally.

## Deploying to Coolify

Matches the pattern used by `charm-content-pipeline` and `charm-disco-booked`.

1. Push this directory to a GitHub repo.
2. New application in Coolify, Dockerfile buildpack, port 3000.
3. Environment variables: `ANTHROPIC_API_KEY`, `APP_PASSWORD`, and optionally
   `SESSION_SECRET`.
4. Link a Postgres service so Coolify injects `DATABASE_URL`. Without it the
   file store works but decks are lost on redeploy, since there is no volume.
5. DNS: `discovery` A record on the `hirecharm.com` Cloudflare zone pointing at
   the Coolify host, DNS only (not proxied), mirroring how `go` was set up. The
   zone id and DNS token are in the Charm disco-booked notes.
6. If Let's Encrypt does not issue on the first try, redeploy once to force the
   ACME challenge after the record resolves. That was needed for `go`.

## Cost

Roughly a few cents to about twenty cents per deck, depending on how much the
research pass searches. Both passes run at `effort: high`. Drop the writing pass
to `medium` in `research.js` if you want to trim it.

## Files

| File | What it does |
| --- | --- |
| `server.js` | Routes, auth, SSE progress stream |
| `research.js` | The two Claude passes and the deck schema |
| `deck.js` | Renders deck data into a self-contained HTML deck |
| `brand.js` | Brand tokens, voice rules, the fixed narrative |
| `store.js` | Postgres, or a JSON file when there is no `DATABASE_URL` |
| `public/index.html` | The generator console |

## Known gaps

- No editing. If a generated line is wrong, regenerate or edit the stored JSON.
  An edit view is the obvious next build.
- Phone is named as a channel but has no personalized content, by design. The
  deck is email and LinkedIn.
- No client logos, testimonials, or case-study numbers on the deck. Those are
  still blocked on real assets, same as the disco-booked deck.
