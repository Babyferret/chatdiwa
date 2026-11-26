import { loadConfig, defaultConfig, saveConfig } from "./config.js";
import { startServer } from "./server.js";
import { createTikTokManager } from "./tiktokConnection.js";
import { createTunnelManager } from "./tunnel.js";
import { processComment } from "./pipeline/index.js";
import { createQueue } from "./pipeline/queue.js";
import { synthesizeToFile } from "./tts.js";
import { openControlPanelWindow } from "./appWindow.js";

export async function run() {
  let config = loadConfig();
  if (!config) {
    config = defaultConfig();
    saveConfig(config);
  }

  const manager = createTikTokManager();
  const tunnelManager = createTunnelManager();
  const { broadcastComment } = startServer(config.port, config, manager, tunnelManager);

  tunnelManager.on("status", ({ status, url, error }) => {
    if (status === "downloading") console.log("Downloading the public tunnel helper...");
    if (status === "ready") console.log(`Link for TikTok LIVE Studio: ${url}/?obs=1`);
    if (status === "error") console.error(`Tunnel error: ${error}`);
  });

  if (config.tunnelEnabled) {
    tunnelManager.start(config.port);
  }

  const controlPanelUrl = `http://localhost:${config.port}`;
  console.log(`\nOpen ${controlPanelUrl}`);
  console.log(`- Open this link in a normal browser to see the chat, change settings and connect to TikTok`);
  console.log(
    `- Add ${controlPanelUrl}/?obs=1 as a Browser Source in OBS to put the sound into your stream (you can hide the source, the sound keeps playing)\n`,
  );

  if (!openControlPanelWindow(controlPanelUrl)) {
    console.log("(Could not open the app window automatically. Open the first link in your browser.)\n");
  }

  let queue = createQueue({ maxSize: config.maxQueueSize });
  let draining = false;

  async function drainQueue() {
    if (draining) return;
    draining = true;
    while (queue.size > 0) {
      const item = queue.dequeue();
      try {
        const voiceConfig = {
          voice: config.voice,
          rate: config.rate,
          pitch: config.pitch,
          volume: config.volume,
        };
        const { filename } = await synthesizeToFile(item.speech, voiceConfig);
        broadcastComment({
          user: item.user,
          message: item.displayText,
          url: `/audio/${filename}`,
          timestamp: item.timestamp,
        });
      } catch (err) {
        console.error("TTS error:", err.message);
      }
    }
    draining = false;
  }

  manager.on("roomChanged", () => {
    queue = createQueue({ maxSize: config.maxQueueSize });
  });

  manager.on("status", ({ status, username, error }) => {
    if (status === "connecting") console.log(`Connecting to @${username}...`);
    if (status === "connected") console.log(`Connected to @${username}'s TikTok LIVE`);
    if (status === "error") console.error(`TikTok: ${error}`);
    if (status === "idle") console.log("Disconnected from TikTok");
  });

  manager.on("error", () => {
    // Surfaced via the "status" event above; this listener only exists so
    // Node's EventEmitter doesn't throw on an unhandled "error" event.
  });

  manager.on("chat", ({ user, text, timestamp }) => {
    const result = processComment({ user, text, timestamp }, config);
    if (!result) return;

    if (!result.speech) {
      broadcastComment({
        user: result.user,
        message: result.displayText,
        timestamp: result.timestamp,
      });
      return;
    }

    console.log(`[${result.user}] ${result.displayText}`);
    queue.enqueue(result);
    drainQueue();
  });

  if (config.tiktokUsername) {
    manager.connect(config.tiktokUsername);
  }

  console.log("Press Ctrl+C to quit\n");
}
