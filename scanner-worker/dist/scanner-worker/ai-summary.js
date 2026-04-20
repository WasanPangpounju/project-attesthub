"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateAiSummary = generateAiSummary;
const sdk_1 = __importDefault(require("@anthropic-ai/sdk"));
const client = new sdk_1.default({ apiKey: process.env.ANTHROPIC_API_KEY });
async function generateAiSummary(issues) {
    const issueLines = issues
        .map((i) => `- [${i.severity}] ${i.description}${i.wcagCriteria ? ` (WCAG: ${i.wcagCriteria})` : ''}`)
        .join('\n');
    const criticalCount = issues.filter((i) => i.severity === 'critical').length;
    const seriousCount = issues.filter((i) => i.severity === 'serious').length;
    const prompt = `คุณคือผู้เชี่ยวชาญด้าน Web Accessibility และมาตรฐาน WCAG
กรุณาวิเคราะห์ผลการตรวจสอบ Accessibility ต่อไปนี้ และตอบเป็น JSON ภาษาไทยเท่านั้น

สรุปปัญหาที่พบ: critical=${criticalCount}, serious=${seriousCount}, รวม=${issues.length} ปัญหา

รายละเอียดปัญหา:
${issueLines || 'ไม่พบปัญหา Accessibility'}

ตอบเป็น JSON รูปแบบนี้เท่านั้น (ไม่ต้องมี markdown, ไม่ต้องมี code block):
{
  "overview": "สรุปภาพรวม 2-3 ประโยคภาษาไทย อธิบายสถานะ Accessibility โดยรวมของเว็บไซต์",
  "topIssues": ["ปัญหาสำคัญอันดับที่ 1", "ปัญหาสำคัญอันดับที่ 2", "ปัญหาสำคัญอันดับที่ 3"],
  "recommendations": ["คำแนะนำสำหรับแก้ไข 1", "คำแนะนำสำหรับแก้ไข 2", "คำแนะนำสำหรับแก้ไข 3"],
  "urgency": "ด่วนมาก"
}

หมายเหตุ: urgency ต้องเป็นหนึ่งใน "ด่วนมาก", "ด่วน", "ควรแก้ไข", "แนะนำ"
- ด่วนมาก: มี critical issue 3+ หรือ serious 5+
- ด่วน: มี critical issue 1-2 หรือ serious 3-4
- ควรแก้ไข: มี serious 1-2 หรือ moderate หลายข้อ
- แนะนำ: มีแค่ minor issues หรือไม่มีปัญหา`;
    const message = await client.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        messages: [{ role: 'user', content: prompt }],
    });
    const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
    const parsed = JSON.parse(raw);
    return parsed;
}
