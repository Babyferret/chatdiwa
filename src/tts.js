import { EdgeTTS } from "node-edge-tts";
import { mkdirSync } from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const AUDIO_CACHE_DIR = resolve(process.cwd(), ".chatdiwa-audio-cache");
mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

// A file is normally deleted by the /audio/ route right after it's served
// (see server.js), but that only happens if some client actually requests
// it - if no OBS/browser view is connected (or connected but backed up in
// its own unbounded playback queue during a burst) the file never gets
// fetched and would otherwise sit on disk forever. This is the safety net:
// age-based, not an unconditional wipe, for two reasons - (1) a burst can
// legitimately leave a file waiting well past a short window, so the
// threshold has to be generous enough that it never outraces a real
// client still working through a backlog, and (2) two instances launched
// from the same folder (e.g. an accidental double-launch while already
// live) would otherwise let one instance's cleanup delete the other's
// in-flight files - only touching files old enough to be implausible as
// "still in flight" avoids that regardless of which instance runs it.
const MAX_AUDIO_AGE_MS = 10 * 60 * 1000;

export function isStale(mtimeMs, now, maxAgeMs = MAX_AUDIO_AGE_MS) {
  return now - mtimeMs > maxAgeMs;
}

async function sweepStaleAudioFiles() {
  let entries;
  try {
    entries = await readdir(AUDIO_CACHE_DIR);
  } catch {
    return;
  }
  const now = Date.now();
  for (const entry of entries) {
    const filepath = resolve(AUDIO_CACHE_DIR, entry);
    try {
      const fileStat = await stat(filepath);
      if (isStale(fileStat.mtimeMs, now)) {
        await unlink(filepath);
      }
    } catch {
      // Already gone (served/deleted concurrently by the normal path) - fine.
    }
  }
}

// Runs once immediately (catches anything left over from a previous run,
// without the blocking unconditional wipe this replaced) and then on an
// interval; both are async and never block startup.
sweepStaleAudioFiles();
setInterval(sweepStaleAudioFiles, 60 * 1000).unref();

export function formatPercent(value) {
  return `${value >= 0 ? "+" : ""}${value}%`;
}

export async function synthesizeToFile(text, { voice, rate = 0, pitch = 0, volume = 0 }) {
  // e.g. "th-TH-NiwatNeural" -> "th-TH", so the SSML <speak xml:lang> tag
  // matches the voice's own locale instead of the library's zh-CN default.
  const lang = voice.split("-").slice(0, 2).join("-");
  const tts = new EdgeTTS({
    voice,
    lang,
    rate: formatPercent(rate),
    pitch: formatPercent(pitch),
    volume: formatPercent(volume),
  });
  const filename = `${randomUUID()}.mp3`;
  const filepath = resolve(AUDIO_CACHE_DIR, filename);
  await tts.ttsPromise(text, filepath);
  return { filename, filepath };
}
