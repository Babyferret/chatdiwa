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
// silently drop every comment.
export function mapChatEvent(data) {
  return {
    user: data.user?.uniqueId ?? data.user?.displayId ?? data.user?.nickname ?? "",
    text: data.comment ?? data.content ?? "",
  };
}

export function connectToTikTok(username) {
  const emitter = new EventEmitter();
  const connection = new TikTokLiveConnection(username, {});
  let attempt = 0;

  connection.on(WebcastEvent.CHAT, (data) => {
    const chat = mapChatEvent(data);
    if (chat.text) {
      emitter.emit("chat", chat);
    }
  });

  // EventEmitter throws if "error" has no listener at all, which would
  // otherwise crash the process on any post-connect socket error.
  // The library emits a plain { info, exception } object here, not an Error.
  connection.on(ControlEvent.ERROR, (err) => {
    if (err instanceof Error) {
      emitter.emit("error", err);
    } else {
      emitter.emit("error", new Error(err?.info ?? "Unknown TikTok connection error"));
    }
  });

  function connect() {
    connection
      .connect()
      .then((state) => {
        attempt = 0;
        emitter.emit("connected", state);
      })
      .catch((err) => {
        emitter.emit("error", err);
        scheduleReconnect();
      });
  }

  connection.on(ControlEvent.DISCONNECTED, () => {
    emitter.emit("disconnected");
    scheduleReconnect();
  });

  function scheduleReconnect() {
    const delay =
      RECONNECT_DELAYS_MS[Math.min(attempt, RECONNECT_DELAYS_MS.length - 1)];
    attempt += 1;
    setTimeout(connect, delay);
  }

  connect();

  return emitter;
}
