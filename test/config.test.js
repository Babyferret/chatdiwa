import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeConfigUpdate, defaultConfig, VOICES } from "../src/config.js";

test("applies valid fields on top of the current config", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, {
    voice: VOICES.female,
    template: "message-only",
    maxMessageLength: 100,
    maxQueueSize: 10,
  });
  assert.equal(next.voice, VOICES.female);
  assert.equal(next.template, "message-only");
  assert.equal(next.maxMessageLength, 100);
  assert.equal(next.maxQueueSize, 10);
});

test("ignores an unknown voice value and keeps the current one", () => {
  const current = { ...defaultConfig(), voice: VOICES.male };
  const next = sanitizeConfigUpdate(current, { voice: "not-a-real-voice" });
  assert.equal(next.voice, VOICES.male);
});

test("ignores non-positive or non-integer numeric fields", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, {
    maxMessageLength: -5,
    maxQueueSize: 3.5,
  });
  assert.equal(next.maxMessageLength, current.maxMessageLength);
  assert.equal(next.maxQueueSize, current.maxQueueSize);
});

test("parses blockedUsers/bannedWords from newline or comma separated text", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, {
    blockedUsers: "troll1\ntroll2, troll3\n\n",
    bannedWords: "badword1,badword2",
  });
  assert.deepEqual(next.blockedUsers, ["troll1", "troll2", "troll3"]);
  assert.deepEqual(next.bannedWords, ["badword1", "badword2"]);
});

test("does not mutate the current config object", () => {
  const current = defaultConfig();
  sanitizeConfigUpdate(current, { voice: VOICES.female });
  assert.equal(current.voice, VOICES.male);
});

test("applies a valid readMode and parses triggerPrefixes from text", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, {
    readMode: "prefix",
    triggerPrefixes: ".\n/, !",
  });
  assert.equal(next.readMode, "prefix");
  assert.deepEqual(next.triggerPrefixes, [".", "/", "!"]);
});

test("ignores an invalid readMode and keeps the current one", () => {
  const current = { ...defaultConfig(), readMode: "all" };
  const next = sanitizeConfigUpdate(current, { readMode: "not-a-real-mode" });
  assert.equal(next.readMode, "all");
});

test("applies valid rate/pitch/volume within -50 to 50", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, { rate: 30, pitch: -20, volume: 0 });
  assert.equal(next.rate, 30);
  assert.equal(next.pitch, -20);
  assert.equal(next.volume, 0);
});

test("ignores out-of-range or non-integer rate/pitch/volume", () => {
  const current = defaultConfig();
  const next = sanitizeConfigUpdate(current, { rate: 100, pitch: -100, volume: 1.5 });
  assert.equal(next.rate, current.rate);
  assert.equal(next.pitch, current.pitch);
  assert.equal(next.volume, current.volume);
});

test("applies a valid overlayEnabled boolean", () => {
  const current = { ...defaultConfig(), overlayEnabled: true };
  const next = sanitizeConfigUpdate(current, { overlayEnabled: false });
  assert.equal(next.overlayEnabled, false);
});

test("ignores a non-boolean overlayEnabled", () => {
  const current = { ...defaultConfig(), overlayEnabled: true };
  const next = sanitizeConfigUpdate(current, { overlayEnabled: "false" });
  assert.equal(next.overlayEnabled, true);
});
