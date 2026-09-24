import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";
import { EventEmitter } from "node:events";

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

// tiktok-live-connector's own README examples use `data.comment` and
// `data.user.uniqueId`, but the installed version's WebcastChatMessage type
// (tiktok-live-proto v3) names these fields `content` and `user.displayId`.
// Accept either shape so a docs/runtime mismatch in either direction doesn't
// silently drop every comment. Verified against a real live room: `common`
// carries a unique `msgId` and the message's real send time (`createTime`,
// epoch milliseconds).
export function mapChatEvent(data) {
  return {
    user: data.user?.uniqueId ?? data.user?.displayId ?? data.user?.nickname ?? "",
    text: data.comment ?? data.content ?? "",
    msgId: data.common?.msgId ?? null,
    timestamp: data.common?.createTime ? Number(data.common.createTime) : Date.now(),
  };
}

// The library's `processInitialData: false` only gates the one-time batch
// decoded right after connecting; its WebSocket client separately listens
// for "protoMessageFetchResult" for the life of the connection and decodes
// through the same code path regardless of that option, so a resync at the
// protocol level can still re-emit comments already seen. De-duplicating on
// the message's own id closes that gap regardless of which path caused it.
export function createDuplicateFilter(maxSize = 500) {
  const seen = new Set();
  return function isDuplicate(msgId) {
    if (!msgId) return false;
    if (seen.has(msgId)) return true;
    seen.add(msgId);
    if (seen.size > maxSize) {
      seen.delete(seen.values().next().value);
    }
    return false;
  };
}

function errorMessage(err) {
  if (err instanceof Error) return err.message;
  return err?.info ?? "Unknown TikTok connection error";
}

// Manages at most one Room connection at a time. `connect`/`disconnect` can
// be called repeatedly to switch Rooms; a manual `disconnect` suppresses
// auto-reconnect until the next explicit `connect`, whereas an unexpected
// drop keeps retrying with backoff.
export function createTikTokManager() {
  const emitter = new EventEmitter();
  const isDuplicate = createDuplicateFilter();
  let connection = null;
  let reconnectTimer = null;
  let attempt = 0;
  let manuallyStopped = true;
  let username = null;
  let status = "idle";

  function setStatus(next, extra = {}) {
    status = next;
    emitter.emit("status", { status, username, ...extra });
  }

  function teardownConnection() {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    if (connection) {
      connection.removeAllListeners();
      connection.disconnect().catch(() => {});
      connection = null;
    }
  }

  function scheduleReconnect() {
    const delay = RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    reconnectTimer = setTimeout(attemptConnect, delay);
  }

  function attemptConnect() {
    // processInitialData defaults to true in the library: it decodes and
    // emits a batch of recent chat history from the initial sign response.
    // On a reconnect (which creates a brand new connection) that replays
    // messages already read out during the previous connection - the exact
    // "old chat repeated" bug this disables.
    connection = new TikTokLiveConnection(username, { processInitialData: false });

    connection.on(WebcastEvent.CHAT, (data) => {
      const chat = mapChatEvent(data);
      if (chat.text && !isDuplicate(chat.msgId)) emitter.emit("chat", chat);
    });

    // EventEmitter throws if "error" has no listener at all, which would
    // otherwise crash the process on any post-connect socket error.
    connection.on(ControlEvent.ERROR, (err) => {
      emitter.emit("error", new Error(errorMessage(err)));
    });

    connection.on(ControlEvent.DISCONNECTED, () => {
      if (manuallyStopped) return;
      setStatus("error", { error: "การเชื่อมต่อหลุด กำลังลองเชื่อมต่อใหม่" });
      scheduleReconnect();
    });

    setStatus("connecting");
    connection
      .connect()
      .then((state) => {
        attempt = 0;
        setStatus("connected");
        emitter.emit("connected", state);
      })
      .catch((err) => {
        setStatus("error", { error: errorMessage(err) });
        emitter.emit("error", new Error(errorMessage(err)));
        if (!manuallyStopped) scheduleReconnect();
      });
  }

  return {
    connect(nextUsername) {
      teardownConnection();
      manuallyStopped = false;
      attempt = 0;
      username = nextUsername;
      emitter.emit("roomChanged");
      attemptConnect();
    },

    disconnect() {
      manuallyStopped = true;
      teardownConnection();
      username = null;
      setStatus("idle");
      emitter.emit("roomChanged");
    },

    getStatus() {
      return { status, username };
    },

    on: (event, listener) => emitter.on(event, listener),
  };
}
