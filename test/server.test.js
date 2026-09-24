import { test } from "node:test";
import assert from "node:assert/strict";
import { startServer } from "../src/server.js";
import { defaultConfig } from "../src/config.js";

async function withServer(fn) {
  const config = { ...defaultConfig(), tiktokUsername: "test", port: 0 };
  const { server } = startServer(0, config);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await fn(`http://localhost:${port}`, config);
  } finally {
    server.close();
  }
}

test("GET / serves the control panel page", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/");
    assert.equal(res.status, 200);
    assert.match(res.headers.get("content-type"), /text\/html/);
  });
});

test("GET /?obs=1 also serves the page (query string must not break routing)", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/?obs=1");
    assert.equal(res.status, 200);
  });
});

test("GET /api/config returns the current config as JSON", async () => {
  await withServer(async (base, config) => {
    const res = await fetch(base + "/api/config");
    assert.equal(res.status, 200);
    const body = await res.json();
    assert.equal(body.tiktokUsername, config.tiktokUsername);
  });
});

test("POST /api/config with invalid JSON returns 400", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/api/config", {
      method: "POST",
      body: "not json",
    });
    assert.equal(res.status, 400);
  });
});

test("GET /audio/ with a path-traversal filename returns 400", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/audio/..%2f..%2fpackage.json");
    assert.equal(res.status, 400);
  });
});

test("GET on an unknown path returns 404", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/nope");
    assert.equal(res.status, 404);
  });
});
