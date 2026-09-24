# ChatDiWa

A self-hosted tool that listens to a TikTok LIVE chat and reads comments aloud via TTS, using `tiktok-live-connector` + an Edge-TTS Node library. Audio plays through a local browser page added as an OBS Browser Source (no virtual audio cable needed).

## Agent skills

### Issue tracker

Local markdown under `.scratch/`. See `docs/agents/issue-tracker.md`.

### Triage labels

Default five canonical roles (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`). See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: `CONTEXT.md` + `docs/adr/` at the repo root. See `docs/agents/domain.md`.
