import { prompt } from "enquirer";
import {
  defaultConfig,
  saveConfig,
  VOICES,
  VOICE_CHOICES,
  TEMPLATE_CHOICES,
} from "./config.js";

export async function runFirstTimeWizard() {
  console.log("=== ตั้งค่า ChatDiWa ครั้งแรก ===\n");

  const answers = await prompt([
    {
      type: "input",
      name: "tiktokUsername",
      message: "TikTok username ของคุณ (ไม่ต้องใส่ @)",
      validate: (value) => (value.trim().length > 0 ? true : "กรุณาใส่ username"),
    },
    {
      type: "select",
      name: "voiceKey",
      message: "เลือกเสียงเริ่มต้น",
      choices: VOICE_CHOICES,
    },
    {
      type: "select",
      name: "template",
      message: "รูปแบบข้อความที่อ่าน",
      choices: TEMPLATE_CHOICES,
    },
  ]);

  const config = {
    ...defaultConfig(),
    tiktokUsername: answers.tiktokUsername.trim().replace(/^@/, ""),
    voice: VOICES[answers.voiceKey],
    template: answers.template,
  };

  saveConfig(config);
  console.log("\nบันทึกการตั้งค่าแล้ว\n");
  return config;
}
