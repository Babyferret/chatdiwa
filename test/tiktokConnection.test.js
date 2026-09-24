import { test } from "node:test";
import assert from "node:assert/strict";
import { mapChatEvent } from "../src/tiktokConnection.js";

test("maps the v3 proto shape (content / user.displayId / common.msgId+createTime)", () => {
  const data = {
    content: "hello",
    user: { displayId: "viewer1" },
    common: { msgId: "123", createTime: "1700000000000" },
  };
  assert.deepEqual(mapChatEvent(data), {
    user: "viewer1",
    text: "hello",
    msgId: "123",
    timestamp: 1700000000000,
  });
});

test("maps the README-documented shape (comment / user.uniqueId)", () => {
  const data = {
    comment: "hi there",
    user: { uniqueId: "viewer2" },
    common: { msgId: "456", createTime: "1700000001000" },
  };
  assert.deepEqual(mapChatEvent(data), {
    user: "viewer2",
    text: "hi there",
    msgId: "456",
    timestamp: 1700000001000,
  });
});

test("falls back to nickname when no uniqueId/displayId is present", () => {
  const data = { content: "hey", user: { nickname: "Viewer Three" } };
  const result = mapChatEvent(data);
  assert.equal(result.user, "Viewer Three");
  assert.equal(result.text, "hey");
});

test("prefers comment/uniqueId over content/displayId when both are present", () => {
  const data = {
    comment: "preferred",
    content: "fallback",
    user: { uniqueId: "preferredUser", displayId: "fallbackUser" },
  };
  const result = mapChatEvent(data);
  assert.equal(result.user, "preferredUser");
  assert.equal(result.text, "preferred");
});

test("msgId is null when common data is missing", () => {
  const data = { content: "hi", user: { displayId: "viewer1" } };
  assert.equal(mapChatEvent(data).msgId, null);
});

test("falls back to the current time when common.createTime is missing", () => {
  const before = Date.now();
  const data = { content: "hi", user: { displayId: "viewer1" } };
  const { timestamp } = mapChatEvent(data);
  const after = Date.now();
  assert.ok(timestamp >= before && timestamp <= after);
});
