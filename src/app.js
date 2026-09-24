import { loadConfig } from "./config.js";
import { runFirstTimeWizard } from "./wizard.js";
import { openSettingsMenu } from "./settingsMenu.js";
import { startServer } from "./server.js";
import { connectToTikTok } from "./tiktokConnection.js";
import { processComment } from "./pipeline/index.js";
import { createQueue } from "./pipeline/queue.js";
import { synthesizeToFile } from "./tts.js";

export async function run() {
  let config = loadConfig();
  if (!config) {
    config = await runFirstTimeWizard();
  }

  const { broadcastSpeech } = startServer(config.port);
  console.log(`\nเปิดใช้งานที่ http://localhost:${config.port}`);
  console.log(
    `เพิ่มเป็น Browser Source ใน OBS โดยใช้ URL นี้ เพื่อให้เสียงเข้าสตรีม\n`,
  );

  const queue = createQueue({ maxSize: config.maxQueueSize });
  let draining = false;

  async function drainQueue() {
    if (draining) return;
    draining = true;
    while (queue.size > 0) {
      const text = queue.dequeue();
      try {
        const { filename } = await synthesizeToFile(text, config.voice);
        broadcastSpeech(text, filename);
      } catch (err) {
        console.error("TTS error:", err.message);
      }
    }
    draining = false;
  }

  const tiktok = connectToTikTok(config.tiktokUsername);

  tiktok.on("connected", () => {
    console.log(`เชื่อมต่อ TikTok LIVE ของ @${config.tiktokUsername} แล้ว`);
  });

  tiktok.on("disconnected", () => {
    console.log("การเชื่อมต่อ TikTok หลุด กำลังลองเชื่อมต่อใหม่...");
  });

  tiktok.on("error", (err) => {
    console.error("เชื่อมต่อ TikTok ไม่สำเร็จ:", err.message);
  });

  tiktok.on("chat", ({ user, text }) => {
    const speech = processComment({ user, text }, config);
    if (speech) {
      console.log(`[${user}] ${text}`);
      queue.enqueue(speech);
      drainQueue();
    }
  });

  console.log('พิมพ์ "s" แล้ว Enter เพื่อเปิดเมนูตั้งค่า, "q" แล้ว Enter เพื่อออก\n');

  process.stdin.setEncoding("utf-8");
  process.stdin.on("data", async (input) => {
    const command = input.trim().toLowerCase();
    if (command === "s") {
      await openSettingsMenu(config);
    } else if (command === "q") {
      console.log("ปิดโปรแกรม...");
      process.exit(0);
    }
  });
}
