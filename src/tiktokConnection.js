import {
  TikTokLiveConnection,
  WebcastEvent,
  ControlEvent,
} from "tiktok-live-connector";
import { EventEmitter } from "node:events";

const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000];

export function connectToTikTok(username) {
  const emitter = new EventEmitter();
  const connection = new TikTokLiveConnection(username);
  let attempt = 0;

  connection.on(WebcastEvent.CHAT, (data) => {
    emitter.emit("chat", { user: data.user.uniqueId, text: data.comment });
  });

  // EventEmitter throws if "error" has no listener at all, which would
  // otherwise crash the process on any post-connect socket error.
  connection.on(ControlEvent.ERROR, (err) => {
    emitter.emit("error", err instanceof Error ? err : new Error(String(err)));
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
