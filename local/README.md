# Subscription runner

Generates decks using the **Claude subscription on this Mac** instead of an
Anthropic API key. Claude Code is driven headlessly (`claude -p`), so research
and writing happen in one pass using its built in WebSearch and WebFetch.

## How the two halves split

| Runs where | Does | Costs |
| --- | --- | --- |
| This Mac, 06:30 PT | Reads today's meetings, generates any missing decks, imports them to the server | Subscription |
| The server, 08:00 PT | Reads the same meetings, finds every deck already there, posts the Slack digest | Nothing |

The server never calls the Anthropic API in this arrangement, because by 08:00
every deck already exists and gets reused. `ANTHROPIC_API_KEY` can stay unset.

## What happens when the Mac is off

This is the real weakness of the subscription route, so it is worth being plain
about it. If the Mac is off, **nothing generates**. The server's 08:00 digest
still fires, because that runs on the server and does not care about your
laptop, but it reports those prospects as needing a deck rather than handing
over a link.

The scheduling is built around that rather than pretending it away:

- The job runs **every 30 minutes**, not once at 06:30, and also **at login**.
- It is **idempotent**: it skips decks that already exist and exits in about
  three seconds when there is nothing to do, silently.
- So whenever the Mac comes on, it catches up within half an hour. Open the lid
  at 09:00 and a 14:00 call still has a deck by 09:30.
- If decks land **after** the 08:00 digest already said they were missing, the
  run posts an updated digest so the Slack thread is not left lying.
- Between `PREWARM_ACTIVE_UNTIL` (18:00) and `PREWARM_ACTIVE_FROM` (05:00) it
  does nothing at all, so it is not researching at 3am.

**The case it cannot solve:** the Mac stays off all day and there is a call.
Nothing generates, and the 08:00 digest is the only warning you get. If that is
unacceptable for a given day, run it by hand from any machine that has Claude
Code, or generate the deck in a Claude Code session and import it.

## Usage

```sh
node local/daily-run.mjs --dry-run    # what it would do, generates nothing
node local/daily-run.mjs --no-slack   # generate and import, no digest
node local/daily-run.mjs              # generate, import, then trigger the digest
node local/generate-deck.mjs acme.com # one deck to stdout, imports nothing
```

Credentials are read from the macOS Keychain, so nothing sensitive is on disk:

| What | Keychain entry |
| --- | --- |
| GHL token | `charm-discovery` / `ghl-token` |
| GHL location | `charm-discovery` / `ghl-location` |
| Console password | `charm-discovery` / `app-password` |

## Scheduling

```sh
cp local/com.charm.discovery-prewarm.plist ~/Library/LaunchAgents/
launchctl load  ~/Library/LaunchAgents/com.charm.discovery-prewarm.plist
launchctl start com.charm.discovery-prewarm     # run once now to test
tail -f local/prewarm.log
```

To stop:

```sh
launchctl unload ~/Library/LaunchAgents/com.charm.discovery-prewarm.plist
```

The job runs **every 30 minutes** and **at login**, passing `--catch-up`. It is
silent unless there is something to generate. See "What happens when the Mac is
off" above for why it is not a single 06:30 run.

### Two things that will bite you

**launchd will not wake a sleeping Mac.** The every-30-minutes schedule covers
you once it is awake, but to have decks ready before you sit down, schedule a
wake:

```sh
sudo pmset repeat wakeorpoweron MTWRF 06:25:00
```

**The login Keychain has to be unlocked.** It is unlocked while you are logged
in, but a machine that rebooted overnight and is sitting at the login window
will fail to read the GHL token. The log will say so.

## Model

Defaults to `claude-opus-5`. Override per run:

```sh
LOCAL_DECK_MODEL=claude-sonnet-5 node local/generate-deck.mjs acme.com
```

Sonnet is worth trying: this workload is search and summarise, which is where
it holds up best, and each run reports its own turn count and usage so the two
can be compared on the same prospect.
