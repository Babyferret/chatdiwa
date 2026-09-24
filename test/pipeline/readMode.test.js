import { test } from "node:test";
import assert from "node:assert/strict";
import { checkTrigger } from "../../src/pipeline/readMode.js";

test("readMode 'all' always matches and leaves text unchanged", () => {
  const config = { readMode: "all", triggerPrefixes: [] };
  assert.deepEqual(checkTrigger("hello", config), {
    matches: true,
    text: "hello",
  });
});

test("readMode 'prefix' matches and strips a configured prefix", () => {
  const config = { readMode: "prefix", triggerPrefixes: [".", "/"] };
  assert.deepEqual(checkTrigger(".hello", config), {
    matches: true,
    text: "hello",
  });
});

test("readMode 'prefix' matches a different configured prefix", () => {
  const config = { readMode: "prefix", triggerPrefixes: [".", "/"] };
  assert.deepEqual(checkTrigger("/hello", config), {
    matches: true,
    text: "hello",
  });
});

test("readMode 'prefix' does not match text without a configured prefix", () => {
  const config = { readMode: "prefix", triggerPrefixes: [".", "/"] };
  assert.deepEqual(checkTrigger("hello", config), {
    matches: false,
    text: "hello",
  });
});

test("readMode 'prefix' only strips the first matched prefix occurrence", () => {
  const config = { readMode: "prefix", triggerPrefixes: ["."] };
  assert.deepEqual(checkTrigger("..hello", config), {
    matches: true,
    text: ".hello",
  });
});

test("readMode 'prefix' with no configured prefixes never matches", () => {
  const config = { readMode: "prefix", triggerPrefixes: [] };
  assert.deepEqual(checkTrigger(".hello", config), {
    matches: false,
    text: ".hello",
  });
});
