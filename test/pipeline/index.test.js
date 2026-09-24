import { test } from "node:test";
import assert from "node:assert/strict";
import { processComment } from "../../src/pipeline/index.js";
import { defaultConfig } from "../../src/config.js";

test("formats a kept comment using the configured template", () => {
  const config = { ...defaultConfig(), template: "name-and-message" };
  assert.equal(
    processComment({ user: "viewer1", text: "hi" }, config),
    "viewer1 พูดว่า hi",
  );
});

test("returns null for a comment from a blocked user", () => {
  const config = { ...defaultConfig(), blockedUsers: ["troll42"] };
  assert.equal(processComment({ user: "troll42", text: "hi" }, config), null);
});

test("truncates before formatting", () => {
  const config = { ...defaultConfig(), template: "message-only", maxMessageLength: 5 };
  assert.equal(processComment({ user: "viewer1", text: "abcdefgh" }, config), "abcde");
});
