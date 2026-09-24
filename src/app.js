import { loadConfig } from "./config.js";
import { runFirstTimeWizard } from "./wizard.js";
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

  const { broadcastSpeech } = startServer(config.port, config);
  console.log(`\nเปิดใช้งานที่ http://localhost:${config.port}`);
  console.log(`- เปิดลิงก์นี้ในเบราว์เซอร์ปกติเพื่อดูแชท/ตั้งค่า`);
  console.log(
    `- เพิ่ม http://localhost:${config.port}/?obs=1 เป็น Browser Source ใน OBS เพื่อให้เสียงเข้าสตรีม (ซ่อน source นี้ได้ เสียงยังออกปกติ)\n`,
  );

  const queue = createQueue({ maxSize: config.maxQueueSize });
  let draining = false;

  async function drainQueue() {
    if (draining) return;
    draining = true;
    while (queue.size > 0) {
      const item = queue.dequeue();
      try {
        const { filename } = await synthesizeToFile(item.speech, config.voice);
        broadcastSpeech(filename, { user: item.user, message: item.text });
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
      queue.enqueue({ user, text, speech });
      drainQueue();
    }
  });

  console.log("กด Ctrl+C เพื่อปิดโปรแกรม\n");
}
