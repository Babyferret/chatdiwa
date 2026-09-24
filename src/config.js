import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const CONFIG_PATH = resolve(process.cwd(), "chatdiwa.config.json");

export const VOICES = {
  male: "th-TH-NiwatNeural",
  female: "th-TH-PremwadeeNeural",
};

export const VOICE_CHOICES = [
  { name: "male", message: "ชาย (th-TH-NiwatNeural)" },
  { name: "female", message: "หญิง (th-TH-PremwadeeNeural)" },
];

export const TEMPLATE_CHOICES = [
  { name: "name-and-message", message: "ชื่อ พูดว่า ข้อความ" },
  { name: "message-only", message: "ข้อความอย่างเดียว" },
];

export function defaultConfig() {
  return {
    tiktokUsername: "",
    voice: VOICES.male,
    template: "name-and-message",
    port: 3939,
    maxMessageLength: 200,
    maxQueueSize: 20,
    blockedUsers: [],
    bannedWords: [],
  };
}

export function loadConfig() {
  if (!existsSync(CONFIG_PATH)) {
    return null;
  }
  const raw = readFileSync(CONFIG_PATH, "utf-8");
  return { ...defaultConfig(), ...JSON.parse(raw) };
}

export function saveConfig(config) {
  writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2), "utf-8");
}
