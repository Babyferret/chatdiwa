import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTunnelUrl } from "../src/tunnel.js";

test("extracts the trycloudflare.com URL from a real cloudflared log line", () => {
  const line =
    "2026-09-24T17:24:51Z INF |  https://breakfast-produce-olive-travis.trycloudflare.com                                  |";
  assert.equal(
    parseTunnelUrl(line),
    "https://breakfast-produce-olive-travis.trycloudflare.com",
  );
});

test("returns null for a line with no tunnel URL", () => {
  const line = "2026-09-24T17:24:51Z INF Requesting new quick Tunnel on trycloudflare.com...";
  assert.equal(parseTunnelUrl(line), null);
});

test("returns null for an unrelated line", () => {
  assert.equal(parseTunnelUrl("some random log output"), null);
});
