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

**If the Mac is asleep or offline at 06:30**, nothing breaks loudly: the server
still runs at 08:00 and the digest reports those prospects as needing a deck.
You lose the pre-generation, not the notification.

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

The job runs at **06:30 local**, and this Mac is on `America/Los_Angeles`, so
that is 06:30 PT. It passes `--no-slack` because the server owns the digest.

### Two things that will bite you

**The Mac has to be awake.** launchd will not wake a sleeping machine on its
own. Either leave it plugged in and awake, or schedule a wake:

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
