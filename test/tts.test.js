import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPercent, isStale } from "../src/tts.js";

test("formats a positive value with an explicit plus sign", () => {
  assert.equal(formatPercent(10), "+10%");
});

test("formats a negative value with a minus sign", () => {
  assert.equal(formatPercent(-20), "-20%");
});

test("formats zero as +0%", () => {
  assert.equal(formatPercent(0), "+0%");
});

test("a file younger than maxAge is not stale", () => {
  const now = 1_000_000;
  assert.equal(isStale(now - 5000, now, 60000), false);
});

test("a file older than maxAge is stale", () => {
  const now = 1_000_000;
  assert.equal(isStale(now - 70000, now, 60000), true);
});

test("a file exactly at maxAge is not yet stale", () => {
  const now = 1_000_000;
  assert.equal(isStale(now - 60000, now, 60000), false);
});
