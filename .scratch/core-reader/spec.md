Status: ready-for-agent

# ChatDiWa — TikTok LIVE chat-to-speech reader

## Problem Statement

The streamer runs solo during TikTok LIVE broadcasts (currently PUBG streams) and cannot read the live chat while playing. They want viewer comments read aloud so they can react without looking away from the game. Existing third-party tools (TikFinity, TikControl, TikOps) solve this, but the streamer wants to own a small self-hosted version they understand and can hand to friends who stream too, without those friends needing to install extra audio software (like a virtual audio cable) or understand the underlying code.

## Solution

A Node.js CLI application, `chatdiwa`, that:

- Connects anonymously to a given TikTok LIVE room by `@username` (no login) and listens for chat comments.
- Filters, rate-limits, and formats each comment, then converts it to speech using an Edge-TTS Node library.
- Serves the generated audio to a local web page (`http://localhost:<port>`) that the streamer adds once as an OBS Browser Source — OBS then captures that page's audio as its own isolated track, with no virtual audio cable or system-audio routing required.
- Presents a terminal UI: a live status view of what's being read, plus an arrow-key-navigable settings menu (opened with a keypress) to change voice, message template, and other options without restarting.
- Ships as a public GitHub repo runnable via `npx github:<owner>/chatdiwa`, with a plain-language SETUP guide for non-technical friends.

## User Stories

1. As a streamer, I want to type my TikTok `@username` once during first-run setup, so that the tool connects to my own LIVE room without further configuration.
2. As a streamer, I want every viewer comment read aloud automatically, so that I don't miss chat while focused on gameplay.
3. As a streamer, I want the spoken form to optionally include the commenter's name ("ชื่อ พูดว่า ข้อความ") or just the message text, and to switch between the two from settings.
4. As a streamer, I want a default Thai neural voice reading all comments (including ones with English words mixed in), so that setup requires no per-message language logic.
5. As a streamer, I want to switch between a male and female voice while the app is running, without restarting it or editing a config file.
6. As a streamer, I want an arrow-key settings menu (not raw config-file editing or typed commands), so that I can change options without understanding the underlying code.
7. As a streamer, I want long comments truncated (~200 characters) and the read-aloud queue capped (~20 items, dropping the oldest on overflow), so that TTS playback doesn't fall further and further behind live chat during bursts.
8. As a streamer, I want a basic profanity wordlist filter and a username blocklist, both editable later, so that hostile or spam comments aren't read aloud.
9. As a streamer, I want the audio to come out of a source I add to OBS once (a Browser Source pointed at a local URL), so that I don't have to install or configure any virtual audio device.
10. As a friend of the streamer, I want to run one `npx` command and follow a short plain-language guide, so that I can try the tool without understanding Node.js, npm, or the codebase.
11. As a streamer, I want the tool to keep working (reconnect) if the TikTok LIVE connection drops mid-stream, so that a network blip doesn't silently stop chat readout for the rest of the broadcast.

## Implementation Decisions

- **Runtime**: Node.js CLI (`bin` entry point), distributed as a public GitHub repo, run via `npx github:<owner>/chatdiwa` — no npm registry publish required.
- **TikTok connection**: `tiktok-live-connector` (zerodytrash), connected anonymously by `@username`, no credentials. This library depends on EulerStream's signing service for the WebSocket handshake; EulerStream's free community rate limit is a shared external dependency risk across this tool and most third-party TikTok LIVE tools (TikFinity included) — note this as an operational risk, not something to build around yet.
- **Speech synthesis**: a Node Edge-TTS library (Microsoft Edge's online TTS, no API key). Default voice `th-TH-NiwatNeural` (male); `th-TH-PremwadeeNeural` offered as the female alternative. One fixed voice per session — no per-message language auto-detection in this version.
- **Audio delivery**: local HTTP + WebSocket server. The server pushes queued TTS audio to a connected browser client, which plays it through a sequential `<audio>` queue. The browser page is added to OBS as a Browser Source — this is the sole audio output path. No system-audio playback, no virtual-audio-cable integration.
- **Pipeline stages** (comment in → decision to speak):
  1. Length cap: truncate/drop text beyond ~200 characters (config).
  2. Filter: drop if sender is on the username blocklist, or if text matches the profanity wordlist.
  3. Format: apply the active template (`"{user} พูดว่า {message}"` or `"{message}"`).
  4. Queue: FIFO, max ~20 pending items (config); on overflow, drop the oldest queued item, never the newest.
  The pipeline is a plain function chain so a future cooldown/rate-limit stage can be inserted without restructuring.
- **Settings/control surface**: a terminal UI (arrow-key menu, e.g. via `enquirer` or `@inquirer/prompts`) reachable by a keypress while the app runs, covering: voice (male/female), message template, blocklist/wordlist entries, queue/length limits, and the local server port. Changes apply live and persist to a local JSON config file.
- **First-run wizard**: on first launch (no config file present), the same TUI prompts for TikTok `@username`, voice, and template, then writes the config file.
- **Reconnection**: on TikTok LIVE disconnect, retry connecting on a backoff; surface connection state in the terminal status view.
- **Config storage**: single local JSON file (e.g. `chatdiwa.config.json`) in the run directory.

## Testing Decisions

- Tests target pure functions at these seams, using the project's own vocabulary (length cap, filter, format, queue):
  - **Length-cap function**: given raw text, returns text truncated to the configured max, unchanged if under the limit.
  - **Filter function**: given a comment (`{ user, text }`) and blocklist/wordlist config, returns keep/drop, independent of any network or audio code.
  - **Format function**: given a comment and the active template mode, returns the exact string to be spoken.
  - **Queue manager**: enqueue/dequeue behavior, and the drop-oldest-on-overflow rule at the configured cap.
- These are unit tests with no I/O: no real TikTok connection, no real TTS call, no real HTTP/WebSocket server. Each test supplies plain in-memory input and asserts on the return value.
- The TikTok connector wiring, the Edge-TTS call, the HTTP/WebSocket server, and the terminal UI are integration glue around the tested seams; verify these manually against a real TikTok LIVE room during implementation, not via automated tests.
- No prior art for tests exists yet in this repo (greenfield); use `node:test` + `node:assert` to keep the dependency footprint minimal for an `npx`-run tool.

## Out of Scope

- Gift, follow, share, like, or subscribe alert readouts (chat comments only).
- Automatic per-message language detection / voice switching.
- Per-user cooldown or global messages-per-minute rate limiting (the pipeline leaves room for this later; not built now, since current viewer counts don't need it).
- Publishing to the npm registry (GitHub-based `npx` install only).
- A windowed/GUI settings app (the control surface is the terminal TUI + the browser-rendered audio page, not a native GUI).
- Support for TikTok accounts requiring login/paid-API tiers.

## Further Notes

- Project name: **ChatDiWa**.
- Audio architecture mirrors how TikFinity/StreamElements avoid virtual-audio-cable installs: render in a page, add that page as an OBS Browser Source, and let OBS capture its audio track directly.
- The SETUP guide (deliverable alongside the code) must walk a non-technical friend through: installing Node.js, the one-line `npx` command, the first-run wizard, and adding the Browser Source URL to OBS.

### Amendment: settings moved from terminal TUI to a web control panel

The original terminal-based arrow-key settings menu (via `enquirer`) was replaced after real usage surfaced two problems: (1) `enquirer`'s named ESM export wasn't reliably detected across environments, crashing the app on first run for at least one user; (2) `enquirer` left the terminal in raw input mode afterward, so the plain `process.stdin` listener used for the `s`/`q` commands silently stopped echoing typed characters.

Current design: the first-run wizard now only asks for `tiktokUsername` (via `node:readline/promises`, no `enquirer` dependency). Everything else — voice, template, length/queue limits, blocklist, banned words — is read and written through `GET`/`POST /api/config` and edited from a browser control panel (`http://localhost:<port>`, no `?obs=1`) with a scrollable chat-log tab and a settings-form tab. The OBS Browser Source URL is now `http://localhost:<port>/?obs=1`: it plays the queued TTS audio but renders no visible UI, so it can be hidden in OBS (audio keeps playing while hidden) without also hiding the control panel. Both views share one WebSocket broadcast; only the `?obs=1` view enqueues audio playback, so having the control panel open in a normal tab at the same time as the OBS source never double-plays audio. Quitting the app is now a plain `Ctrl+C` — there is no more in-app terminal command loop.

### Amendment: live Room switching, voice tuning, Read Mode, and dropping the wizard entirely (see ADR-0001)

Grilled and implemented as one batch:

- **No more first-run wizard at all** (superseding the amendment above, which had already reduced it to a single question). The app always starts with no Room connected; if `tiktokUsername` was saved from a previous run, it auto-connects on startup. See `docs/adr/0001-no-first-run-wizard.md`.
- **Connect/status panel**: the control panel has a username field plus separate **Connect** and **Disconnect** buttons, and a status badge (idle / connecting / connected / error) fed live over the existing WebSocket. Connecting while already connected tears down the old Room and connects the new one immediately, no confirmation step, and clears the chat log (a `{type: "clear"}` broadcast). A manual Disconnect stops the auto-reconnect backoff until the next explicit Connect; an unexpected drop keeps auto-reconnecting as before. Implemented as `createTikTokManager()` in `tiktokConnection.js`, replacing the old always-auto-connecting `connectToTikTok()`.
- **Voice tuning**: `rate`, `pitch`, and `volume` config fields (integers, -50 to 50, default 0), rendered as sliders and passed through to the Edge-TTS call as `±N%` strings.
- **Read Mode** (glossary term, see `CONTEXT.md`): `config.readMode` is `"all"` (default) or `"prefix"`; in `"prefix"` mode only comments starting with one of `config.triggerPrefixes` become Speech (prefix stripped before synthesis), and non-matching comments still reach the chat log, just silently. Room is left for future modes beyond these two.
- **Unified comment broadcast**: `broadcastSpeech(filename, meta)` became `broadcastComment({ user, message, url })`, one WebSocket message type (`"comment"`) for every kept comment, whether or not it was read aloud (`url` is `null` when not). `processComment()` now returns `{ user, displayText, speech }` (or `null` if fully blocked) instead of a plain string, so the app layer can display a comment without necessarily queuing it for TTS.

### Amendment: on-screen Overlay and a single-file Launcher (see ADR-0002)

Grilled and implemented as one batch:

- **Overlay** (glossary term, see `CONTEXT.md`): fading name+message bubbles rendered inside the *same* OBS View (`?obs=1`), not a third URL — see ADR-0002 for why. Controlled by `config.overlayEnabled` (boolean, default `true`), a checkbox in the Control Panel. Shares Read Mode's decision rather than filtering separately: only comments that became Speech (i.e. `url` is set on the `"comment"` broadcast) get a bubble. Each bubble fades out 8 seconds after appearing. When `overlayEnabled` is off, the OBS View renders nothing visible, identical to before the Overlay existed — audio-only vs. audio-with-Overlay is chosen entirely through OBS's own visibility (👁) toggle and the `overlayEnabled` setting, never a separate URL.
- **Live config broadcast**: `POST /api/config` and `POST /api/reset` now also broadcast `{ type: "config", config }` over the WebSocket, so a change like toggling `overlayEnabled` takes effect in an already-open OBS View without needing a page refresh.
- **Reset**: `POST /api/reset` disconnects the current Room and resets the whole config to `defaultConfig()`, exposed as a "รีเซ็ตการตั้งค่าทั้งหมด" button in the Control Panel. This replaced an earlier idea of a second `reset.bat` file — the "single file" requirement for the Launcher is satisfied by moving reset into the web UI instead.
- **Launcher** (glossary term): `run.bat` at the repo root, downloadable as a single file. Checks for Node.js (`where node`); if missing, asks the user (`choice /C YN`) before attempting a `winget install` of the Node.js LTS package, falling back to opening `https://nodejs.org` if winget is unavailable, the install fails, or the user declines — never installs anything without asking first. If Node.js is present (or just installed), runs `npx github:Babyferret/chatdiwa` — no separate update logic, since `npx`/`npm install` against an unpinned `github:` spec was verified (empirically, against a throwaway local git repo) to always re-resolve to the latest commit on install, with no manual cache-busting needed.
  - **Verified failure mode, fixed**: the Launcher's echo text was originally in Thai; cmd.exe (even with `chcp 65001`) corrupted some lines badly enough that fragments of the Thai text were parsed as stray commands. Rewritten in English; the app's own UI is unaffected and stays Thai.
  - **Verified failure mode, fixed**: `npx --yes` / `npx -y` (and the `npm_config_yes` env var) do **not** suppress the "Ok to proceed? (y)" install-confirmation prompt for an unpublished `github:` spec in the installed npm version (11.13.0) — passing them silently hangs forever with zero output, which would have made the Launcher appear frozen for every user, every run. `run.bat` calls plain `npx github:Babyferret/chatdiwa` and tells the user in advance that the prompt may appear.
