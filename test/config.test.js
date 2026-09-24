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
