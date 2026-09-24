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
The browser page at `?obs=1`, added as a Browser Source in a broadcaster app (OBS, TikTok LIVE Studio, etc.). Plays synthesized Speech and renders no visible UI. Relies on the host app disabling the browser's autoplay-blocking policy, which normal browser tabs enforce.
_Avoid_: overlay, widget

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
