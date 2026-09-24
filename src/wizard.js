import { createInterface } from "node:readline/promises";
import { defaultConfig, saveConfig } from "./config.js";

export async function runFirstTimeWizard() {
  console.log("=== ตั้งค่า ChatDiWa ครั้งแรก ===\n");

  const rl = createInterface({ input: process.stdin, output: process.stdout });
  let tiktokUsername = "";
  while (!tiktokUsername) {
    const answer = await rl.question("TikTok username ของคุณ (ไม่ต้องใส่ @): ");
    tiktokUsername = answer.trim().replace(/^@/, "");
  }
  rl.close();

  const config = { ...defaultConfig(), tiktokUsername };
  saveConfig(config);
  console.log(
    "\nบันทึกการตั้งค่าแล้ว (ปรับเสียง/รูปแบบข้อความ/ตัวกรองอื่นๆ ได้ภายหลังจากหน้าเว็บ)\n",
  );
  return config;
}
