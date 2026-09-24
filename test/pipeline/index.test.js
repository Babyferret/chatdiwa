import { test } from "node:test";
import assert from "node:assert/strict";
import { processComment } from "../../src/pipeline/index.js";
import { defaultConfig } from "../../src/config.js";

test("a kept, readable comment returns display text, speech, and the original timestamp", () => {
  const config = { ...defaultConfig(), template: "name-and-message" };
  assert.deepEqual(
    processComment({ user: "viewer1", text: "hi", timestamp: 1700000000000 }, config),
    {
      user: "viewer1",
      displayText: "hi",
      speech: "viewer1 พูดว่า hi",
      timestamp: 1700000000000,
    },
  );
});

test("returns null for a comment from a blocked user", () => {
  const config = { ...defaultConfig(), blockedUsers: ["troll42"] };
  assert.equal(
    processComment({ user: "troll42", text: "hi", timestamp: 1700000000000 }, config),
    null,
  );
});

test("truncates before formatting", () => {
  const config = { ...defaultConfig(), template: "message-only", maxMessageLength: 5 };
  assert.deepEqual(
    processComment({ user: "viewer1", text: "abcdefgh", timestamp: 1700000000000 }, config),
    { user: "viewer1", displayText: "abcde", speech: "abcde", timestamp: 1700000000000 },
  );
});

test("in prefix readMode, a non-matching comment is kept for display with no speech", () => {
  const config = {
    ...defaultConfig(),
    readMode: "prefix",
    triggerPrefixes: ["."],
  };
  assert.deepEqual(
    processComment({ user: "viewer1", text: "hello", timestamp: 1700000000000 }, config),
    { user: "viewer1", displayText: "hello", speech: null, timestamp: 1700000000000 },
  );
});

test("in prefix readMode, a matching comment strips the prefix before speech but keeps it in displayText", () => {
  const config = {
    ...defaultConfig(),
    readMode: "prefix",
    triggerPrefixes: ["."],
    template: "message-only",
  };
  assert.deepEqual(
    processComment({ user: "viewer1", text: ".hello", timestamp: 1700000000000 }, config),
    { user: "viewer1", displayText: ".hello", speech: "hello", timestamp: 1700000000000 },
  );
});
