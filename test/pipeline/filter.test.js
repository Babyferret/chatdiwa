import { test } from "node:test";
import assert from "node:assert/strict";
import { shouldKeep } from "../../src/pipeline/filter.js";

const emptyConfig = { blockedUsers: [], bannedWords: [] };

test("keeps a comment when nothing is blocked", () => {
  assert.equal(
    shouldKeep({ user: "viewer1", text: "hello there" }, emptyConfig),
    true,
  );
});

test("drops a comment from a blocked user", () => {
  const config = { blockedUsers: ["troll42"], bannedWords: [] };
  assert.equal(
    shouldKeep({ user: "troll42", text: "hello there" }, config),
    false,
  );
});

test("blocked-user match is case-insensitive", () => {
  const config = { blockedUsers: ["Troll42"], bannedWords: [] };
  assert.equal(
    shouldKeep({ user: "troll42", text: "hello there" }, config),
    false,
  );
});

test("drops a comment containing a banned word", () => {
  const config = { blockedUsers: [], bannedWords: ["badword"] };
  assert.equal(
    shouldKeep({ user: "viewer1", text: "you are a badword" }, config),
    false,
  );
});

test("banned-word match is case-insensitive and matches substrings", () => {
  const config = { blockedUsers: [], bannedWords: ["badword"] };
  assert.equal(
    shouldKeep({ user: "viewer1", text: "BadWord!" }, config),
    false,
  );
});
