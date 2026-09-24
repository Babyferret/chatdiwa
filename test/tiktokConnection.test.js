import { test } from "node:test";
import assert from "node:assert/strict";
import { mapChatEvent } from "../src/tiktokConnection.js";

test("maps the v3 proto shape (content / user.displayId)", () => {
  const data = { content: "hello", user: { displayId: "viewer1" } };
  assert.deepEqual(mapChatEvent(data), { user: "viewer1", text: "hello" });
});

test("maps the README-documented shape (comment / user.uniqueId)", () => {
  const data = { comment: "hi there", user: { uniqueId: "viewer2" } };
  assert.deepEqual(mapChatEvent(data), { user: "viewer2", text: "hi there" });
});

test("falls back to nickname when no uniqueId/displayId is present", () => {
  const data = { content: "hey", user: { nickname: "Viewer Three" } };
  assert.deepEqual(mapChatEvent(data), { user: "Viewer Three", text: "hey" });
});

test("prefers comment/uniqueId over content/displayId when both are present", () => {
  const data = {
    comment: "preferred",
    content: "fallback",
    user: { uniqueId: "preferredUser", displayId: "fallbackUser" },
  };
  assert.deepEqual(mapChatEvent(data), {
    user: "preferredUser",
    text: "preferred",
  });
});
