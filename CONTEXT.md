# ChatDiWa

A self-hosted tool that reads a TikTok LIVE chat aloud via TTS, with a browser Control Panel for settings and a separate OBS View for audio output.

## Language

**Room**:
The TikTok LIVE broadcast ChatDiWa is currently connected to, identified by a TikTok username. ChatDiWa is connected to at most one Room at a time.
_Avoid_: stream, session, broadcast, live

**Control Panel**:
The browser page at the plain server URL (no `?obs=1`), where the streamer views the chat log, manages the Room connection, and edits settings. Never plays audio itself.
_Avoid_: dashboard, settings page, web UI

**OBS View**:
The browser page at `?obs=1`, added as a Browser Source in a broadcaster app (OBS, TikTok LIVE Studio, etc.). Plays synthesized Speech, and renders the Overlay when it's enabled. Relies on the host app disabling the browser's autoplay-blocking policy, which normal browser tabs enforce. Audio-only vs. audio-with-Overlay isn't a separate URL — the streamer chooses by showing or hiding this one Browser Source, and by the Overlay setting, in OBS.
_Avoid_: widget

**Overlay**:
Fading, on-screen bubbles (name + message) rendered inside the OBS View for every Comment that became Speech. Toggled by the `overlayEnabled` setting; when off, the OBS View renders nothing visible, same as before the Overlay existed. Never shows a Comment that wasn't read aloud — it shares Read Mode's decision rather than filtering separately.
_Avoid_: overlay view, widget

**Launcher**:
`run.bat`, the single downloadable file that checks for Node.js (asking before installing anything), then reinstalls ChatDiWa fresh on every launch via `npm install --prefix` against a GitHub tarball URL (not the `github:` npm spec, which needs Git installed — see ADR-0003; not `npx`, which caches that URL forever after the first run and never picks up updates — see ADR-0005). Not a copy of the app — always defers to whatever that URL currently resolves to, so there's nothing in the Launcher itself to keep in sync with releases.
_Avoid_: installer, setup script

**Tunnel**:
A temporary public HTTPS URL (via a Cloudflare Quick Tunnel) forwarding to the local server, for TikTok LIVE Studio's Link source — which, unlike OBS's Browser Source, rejects `localhost` URLs outright (see ADR-0004). Off by default (`tunnelEnabled`); OBS users never need it. The URL changes every time the Tunnel is (re)started, so it's shown live in the Control Panel with a copy button rather than documented anywhere fixed.
_Avoid_: ngrok, proxy

**Comment**:
A single chat message received from the connected Room, carrying a viewer's username and raw text.

**Speech**:
The text actually sent to the TTS engine for a Comment, after Read Mode and the message template are applied. Distinct from the Comment's raw text — may have a Trigger Prefix stripped, or a username prepended.
_Avoid_: spoken comment, tts text

**Read Mode**:
The setting controlling which Comments become Speech. `all`: every Comment is read. `prefix`: only Comments starting with one of the configured Trigger Prefixes are read; all others still appear in the Control Panel's chat log, just silently. Room is left for future modes.
_Avoid_: comment types, filter mode

**Trigger Prefix**:
One of the literal strings (e.g. `.`, `/`) a Comment's text must start with to become Speech when Read Mode is `prefix`. The matched prefix is stripped before the Comment becomes Speech.
_Avoid_: command prefix, trigger word
