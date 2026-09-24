import { test } from "node:test";
import assert from "node:assert/strict";
import { processComment } from "../../src/pipeline/index.js";
import { defaultConfig } from "../../src/config.js";

test("a kept, readable comment returns display text and speech", () => {
  const config = { ...defaultConfig(), template: "name-and-message" };
  assert.deepEqual(processComment({ user: "viewer1", text: "hi" }, config), {
    user: "viewer1",
    displayText: "hi",
    speech: "viewer1 พูดว่า hi",
  });
});

test("returns null for a comment from a blocked user", () => {
  const config = { ...defaultConfig(), blockedUsers: ["troll42"] };
  assert.equal(processComment({ user: "troll42", text: "hi" }, config), null);
});

test("truncates before formatting", () => {
  const config = { ...defaultConfig(), template: "message-only", maxMessageLength: 5 };
  assert.deepEqual(
    processComment({ user: "viewer1", text: "abcdefgh" }, config),
    { user: "viewer1", displayText: "abcde", speech: "abcde" },
  );
});

test("in prefix readMode, a non-matching comment is kept for display with no speech", () => {
  const config = {
    ...defaultConfig(),
    readMode: "prefix",
    triggerPrefixes: ["."],
  };
  assert.deepEqual(
    processComment({ user: "viewer1", text: "hello" }, config),
    { user: "viewer1", displayText: "hello", speech: null },
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
    processComment({ user: "viewer1", text: ".hello" }, config),
    { user: "viewer1", displayText: ".hello", speech: "hello" },
  );
});
