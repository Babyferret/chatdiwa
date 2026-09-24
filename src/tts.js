import { EdgeTTS } from "node-edge-tts";
import { mkdirSync, readdirSync, unlinkSync } from "node:fs";
import { readdir, stat, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const AUDIO_CACHE_DIR = resolve(process.cwd(), ".chatdiwa-audio-cache");
mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

// Anything left over from a previous run is definitely stale (this process
// just started), so clear it out immediately rather than waiting for the
// first sweep below.
for (const entry of readdirSync(AUDIO_CACHE_DIR)) {
  try {
    unlinkSync(resolve(AUDIO_CACHE_DIR, entry));
  } catch {
    // ignore
  }
}

// A file is normally deleted by the /audio/ route right after it's served
// (see server.js), but that only happens if some client actually requests
// it - if no OBS/browser view is connected (or connected but hasn't reached
// this item in its own playback queue yet) the file never gets fetched and
// would otherwise sit on disk forever. This is the safety net: anything
// older than a couple of minutes is well past any normal playback delay, so
// it's safe to assume nothing is coming for it.
const MAX_AUDIO_AGE_MS = 2 * 60 * 1000;

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
