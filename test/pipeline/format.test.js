import { test } from "node:test";
import assert from "node:assert/strict";
import { formatSpeech } from "../../src/pipeline/format.js";

test("message-only mode returns just the text", () => {
  assert.equal(
    formatSpeech({ user: "viewer1", text: "hello" }, "message-only"),
    "hello",
  );
});

test("name-and-message mode prefixes with the Thai speaking phrase", () => {
  assert.equal(
    formatSpeech({ user: "viewer1", text: "hello" }, "name-and-message"),
    "viewer1 พูดว่า hello",
  );
});
