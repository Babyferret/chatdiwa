import { EdgeTTS } from "node-edge-tts";
import { mkdirSync } from "node:fs";
import { resolve } from "node:path";
import { randomUUID } from "node:crypto";

export const AUDIO_CACHE_DIR = resolve(process.cwd(), ".chatdiwa-audio-cache");
mkdirSync(AUDIO_CACHE_DIR, { recursive: true });

export async function synthesizeToFile(text, voice) {
  const tts = new EdgeTTS({ voice });
  const filename = `${randomUUID()}.mp3`;
  const filepath = resolve(AUDIO_CACHE_DIR, filename);
  await tts.ttsPromise(text, filepath);
  return { filename, filepath };
}
