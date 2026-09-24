import enquirer from "enquirer";
const { prompt } = enquirer;
import { saveConfig, VOICES, VOICE_CHOICES, TEMPLATE_CHOICES } from "./config.js";

export async function openSettingsMenu(config) {
  const { field } = await prompt({
    type: "select",
    name: "field",
    message: "ตั้งค่า (Esc เพื่อออก)",
    choices: [
      { name: "voice", message: `เสียง (ตอนนี้: ${config.voice})` },
      { name: "template", message: `รูปแบบข้อความ (ตอนนี้: ${config.template})` },
      { name: "back", message: "กลับ" },
    ],
  });

  if (field === "voice") {
    const { voiceKey } = await prompt({
      type: "select",
      name: "voiceKey",
      message: "เลือกเสียง",
      choices: VOICE_CHOICES,
    });
    config.voice = VOICES[voiceKey];
    saveConfig(config);
    console.log(`เปลี่ยนเสียงเป็น ${config.voice} แล้ว`);
  }

  if (field === "template") {
    const { template } = await prompt({
      type: "select",
      name: "template",
      message: "เลือกรูปแบบข้อความ",
      choices: TEMPLATE_CHOICES,
    });
    config.template = template;
    saveConfig(config);
    console.log(`เปลี่ยนรูปแบบข้อความเป็น ${config.template} แล้ว`);
  }

  return config;
}
