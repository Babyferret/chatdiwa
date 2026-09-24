import { test } from "node:test";
import assert from "node:assert/strict";
import { formatPercent } from "../src/tts.js";

test("formats a positive value with an explicit plus sign", () => {
  assert.equal(formatPercent(10), "+10%");
});

test("formats a negative value with a minus sign", () => {
  assert.equal(formatPercent(-20), "-20%");
});

test("formats zero as +0%", () => {
  assert.equal(formatPercent(0), "+0%");
});
