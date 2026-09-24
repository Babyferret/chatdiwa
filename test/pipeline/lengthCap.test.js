import { test } from "node:test";
import assert from "node:assert/strict";
import { capLength } from "../../src/pipeline/lengthCap.js";

test("returns text unchanged when under the limit", () => {
  assert.equal(capLength("hello", 200), "hello");
});

test("truncates text longer than the limit", () => {
  const text = "a".repeat(250);
  assert.equal(capLength(text, 200), "a".repeat(200));
});

test("returns text unchanged when exactly at the limit", () => {
  const text = "a".repeat(200);
  assert.equal(capLength(text, 200), text);
});
