import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";

export const CONFIG_PATH = resolve(process.cwd(), "chatdiwa.config.json");

export const VOICES = {
  male: "th-TH-NiwatNeural",
  female: "th-TH-PremwadeeNeural",
};

export const TEMPLATE_CHOICES = [
  { name: "name-and-message", message: "ชื่อ พูดว่า ข้อความ" },
  { name: "message-only", message: "ข้อความอย่างเดียว" },
];

export const READ_MODES = ["all", "prefix"];

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
    readMode: "all",
    triggerPrefixes: [],
    rate: 0,
    pitch: 0,
    volume: 0,
    overlayEnabled: true,
    audioMuted: false,
    tunnelEnabled: false,
  };
}

// Read at call time so tests can point at a temp file instead of the real one.
function configPath() {
  return process.env.CHATDIWA_CONFIG_PATH || CONFIG_PATH;
}

export function loadConfig() {
  const path = configPath();
  if (!existsSync(path)) {
    return null;
  }
  const config = { ...defaultConfig(), ...JSON.parse(readFileSync(path, "utf-8")) };
  // Port 0 means "any free port", which leaves nobody knowing the URL.
  if (!Number.isInteger(config.port) || config.port < 1 || config.port > 65535) {
    config.port = defaultConfig().port;
  }
  return config;
}

export function saveConfig(config) {
  writeFileSync(configPath(), JSON.stringify(config, null, 2), "utf-8");
}

const VALID_VOICES = Object.values(VOICES);
const VALID_TEMPLATES = TEMPLATE_CHOICES.map((c) => c.name);

function parseWordList(value) {
  return value
    .split(/\r?\n|,/)
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

// Only known, valid fields from `updates` are applied on top of `current`;
// anything missing or invalid is left as-is rather than rejecting the whole
// update, since this backs a web settings form that submits every field
// on every save.
export function sanitizeConfigUpdate(current, updates) {
  const next = { ...current };

  if (VALID_VOICES.includes(updates.voice)) {
    next.voice = updates.voice;
  }

  if (VALID_TEMPLATES.includes(updates.template)) {
    next.template = updates.template;
  }

  if (Number.isInteger(updates.maxMessageLength) && updates.maxMessageLength > 0) {
    next.maxMessageLength = updates.maxMessageLength;
  }

  if (Number.isInteger(updates.maxQueueSize) && updates.maxQueueSize > 0) {
    next.maxQueueSize = updates.maxQueueSize;
  }

  if (typeof updates.blockedUsers === "string") {
    next.blockedUsers = parseWordList(updates.blockedUsers);
  }

  if (typeof updates.bannedWords === "string") {
    next.bannedWords = parseWordList(updates.bannedWords);
  }

  if (READ_MODES.includes(updates.readMode)) {
    next.readMode = updates.readMode;
  }

  if (typeof updates.triggerPrefixes === "string") {
    next.triggerPrefixes = parseWordList(updates.triggerPrefixes);
  }

  for (const field of ["rate", "pitch", "volume"]) {
    const value = updates[field];
    if (Number.isInteger(value) && value >= -50 && value <= 50) {
      next[field] = value;
    }
  }

  if (typeof updates.overlayEnabled === "boolean") {
    next.overlayEnabled = updates.overlayEnabled;
  }

  if (typeof updates.audioMuted === "boolean") {
    next.audioMuted = updates.audioMuted;
  }

  if (typeof updates.tunnelEnabled === "boolean") {
    next.tunnelEnabled = updates.tunnelEnabled;
  }

  return next;
}
