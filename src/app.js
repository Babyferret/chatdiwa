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
    if (status === "downloading") console.log("กำลังดาวน์โหลดตัวเปิด tunnel สาธารณะ...");
    if (status === "ready") console.log(`ลิงก์สำหรับ TikTok LIVE Studio: ${url}/?obs=1`);
    if (status === "error") console.error(`Tunnel error: ${error}`);
  });

  if (config.tunnelEnabled) {
    tunnelManager.start(config.port);
  }

  const controlPanelUrl = `http://localhost:${config.port}`;
  console.log(`\nเปิดใช้งานที่ ${controlPanelUrl}`);
  console.log(`- เปิดลิงก์นี้ในเบราว์เซอร์ปกติเพื่อดูแชท/ตั้งค่า/เชื่อมต่อ TikTok`);
  console.log(
    `- เพิ่ม ${controlPanelUrl}/?obs=1 เป็น Browser Source ใน OBS เพื่อให้เสียงเข้าสตรีม (ซ่อน source นี้ได้ เสียงยังออกปกติ)\n`,
  );

  if (!openControlPanelWindow(controlPanelUrl)) {
    console.log("(เปิดหน้าต่างแอปอัตโนมัติไม่สำเร็จ เปิดลิงก์ด้านบนเองในเบราว์เซอร์ได้เลย)\n");
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
    if (status === "connecting") console.log(`กำลังเชื่อมต่อ @${username}...`);
    if (status === "connected") console.log(`เชื่อมต่อ TikTok LIVE ของ @${username} แล้ว`);
    if (status === "error") console.error(`TikTok: ${error}`);
    if (status === "idle") console.log("ตัดการเชื่อมต่อ TikTok แล้ว");
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

  console.log("กด Ctrl+C เพื่อปิดโปรแกรม\n");
}
