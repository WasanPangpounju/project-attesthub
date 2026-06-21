import Anthropic from '@anthropic-ai/sdk';
import type { IGuestScanIssue, IGuestScanAiSummary } from '../models/GuestScanReport';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function generateAiSummary(
  issues: IGuestScanIssue[]
): Promise<IGuestScanAiSummary> {
  const issueLines = issues
    .map(
      (i) =>
        `- [${i.severity}] ${i.description}${i.wcagCriteria ? ` (WCAG: ${i.wcagCriteria})` : ''}`
    )
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
    max_tokens: 2000,
    messages: [{ role: 'user', content: prompt }],
  });

  if (message.stop_reason === 'max_tokens') {
    console.error('[ai-summary] response was truncated due to max_tokens limit');
  }

  const raw = message.content[0].type === 'text' ? message.content[0].text.trim() : '{}';
  const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();

  try {
    return JSON.parse(cleaned) as IGuestScanAiSummary;
  } catch (parseErr) {
    const parseErrMessage = parseErr instanceof Error ? parseErr.message : String(parseErr);
    const truncatedRaw = raw.length > 2000 ? `${raw.slice(0, 2000)}...(truncated)` : raw;
    console.error('[ai-summary] JSON parse failed:', parseErrMessage, '\nraw response:', truncatedRaw);
    throw new Error(`AI summary JSON parse failed: ${parseErrMessage} | raw response: ${truncatedRaw}`);
  }
}
