import { test } from "node:test";
import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { startServer } from "../src/server.js";
import { defaultConfig } from "../src/config.js";

function createStubManager() {
  const emitter = new EventEmitter();
  const calls = { connect: [], disconnect: 0 };
  let status = { status: "idle", username: null };
  return {
    calls,
    connect(username) {
      calls.connect.push(username);
      status = { status: "connecting", username };
    },
    disconnect() {
      calls.disconnect += 1;
      status = { status: "idle", username: null };
    },
    getStatus: () => status,
    on: (event, listener) => emitter.on(event, listener),
  };
}

async function withServer(fn) {
  const config = { ...defaultConfig(), tiktokUsername: "test", port: 0 };
  const manager = createStubManager();
  const { server } = startServer(0, config, manager);
  await new Promise((resolve) => server.once("listening", resolve));
  const { port } = server.address();
  try {
    await fn(`http://localhost:${port}`, config, manager);
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

test("GET /api/status returns the manager's current status", async () => {
  await withServer(async (base) => {
    const res = await fetch(base + "/api/status");
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { status: "idle", username: null });
  });
});

test("POST /api/connect calls manager.connect, saves the username, and returns the new status", async () => {
  await withServer(async (base, config, manager) => {
    const res = await fetch(base + "/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "@someviewer" }),
    });
    assert.equal(res.status, 200);
    assert.deepEqual(manager.calls.connect, ["someviewer"]);
    assert.equal(config.tiktokUsername, "someviewer");
    assert.deepEqual(await res.json(), { status: "connecting", username: "someviewer" });
  });
});

test("POST /api/connect with an empty username returns 400", async () => {
  await withServer(async (base, config, manager) => {
    const res = await fetch(base + "/api/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username: "   " }),
    });
    assert.equal(res.status, 400);
    assert.deepEqual(manager.calls.connect, []);
  });
});

test("POST /api/disconnect calls manager.disconnect", async () => {
  await withServer(async (base, config, manager) => {
    const res = await fetch(base + "/api/disconnect", { method: "POST" });
    assert.equal(res.status, 200);
    assert.equal(manager.calls.disconnect, 1);
  });
});
