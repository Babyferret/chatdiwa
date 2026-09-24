import { test } from "node:test";
import assert from "node:assert/strict";
import { createDuplicateFilter } from "../src/tiktokConnection.js";

test("the first time an id is seen it is not a duplicate", () => {
  const isDuplicate = createDuplicateFilter();
  assert.equal(isDuplicate("a"), false);
});

test("seeing the same id again is a duplicate", () => {
  const isDuplicate = createDuplicateFilter();
  isDuplicate("a");
  assert.equal(isDuplicate("a"), true);
});

test("different ids are independent", () => {
  const isDuplicate = createDuplicateFilter();
  assert.equal(isDuplicate("a"), false);
  assert.equal(isDuplicate("b"), false);
  assert.equal(isDuplicate("a"), true);
});

test("a falsy id (no msgId available) is never treated as a duplicate", () => {
  const isDuplicate = createDuplicateFilter();
  assert.equal(isDuplicate(null), false);
  assert.equal(isDuplicate(null), false);
});

test("evicts the oldest id once maxSize is exceeded", () => {
  const isDuplicate = createDuplicateFilter(2);
  isDuplicate("a");
  isDuplicate("b");
  isDuplicate("c"); // evicts "a"
  assert.equal(isDuplicate("a"), false);
});
