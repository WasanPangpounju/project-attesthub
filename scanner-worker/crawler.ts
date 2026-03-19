import { chromium } from 'playwright';
import axeSource from 'axe-core';
import mongoose from 'mongoose';
import { IGuestScanIssue, IGuestScanAiSummary } from '../models/GuestScanReport';
import { generateAiSummary } from './ai-summary';

// axe violation impact → issue severity mapping
const SEVERITY_MAP: Record<string, IGuestScanIssue['severity']> = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
};

function normalizeUrl(input: string): string {
  if (/^https?:\/\//i.test(input)) return input;
  return `https://${input}`;
}

function calcScore(issues: IGuestScanIssue[]): number {
  const penalty = issues.reduce((sum, issue) => {
    const weights: Record<IGuestScanIssue['severity'], number> = {
      critical: 25,
      serious: 15,
      moderate: 5,
      minor: 1,
    };
    return sum + weights[issue.severity];
  }, 0);
  return Math.max(0, 100 - penalty);
}

function determineWcagLevel(issues: IGuestScanIssue[]): 'A' | 'AA' | 'AAA' | 'None' {
  const hasCritical = issues.some((i) => i.severity === 'critical');
  const hasSerious = issues.some((i) => i.severity === 'serious');
  const hasModerate = issues.some((i) => i.severity === 'moderate');

  if (hasCritical) return 'None';
  if (hasSerious) return 'A';
  if (hasModerate) return 'AA';
  return 'AAA';
}

// axe violation result type (subset we need)
interface AxeViolation {
  id: string;
  impact: string | null;
  description: string;
  help: string;
  tags: string[];
  nodes: Array<{
    html: string;
    target: string[];
  }>;
}

export async function runGuestScan(reportId: string): Promise<void> {
  const startTime = Date.now();
  let browser = null;

  // รอให้ mongoose connection พร้อมก่อนเรียก model ใดๆ
  console.log('[crawler] mongoose readyState before wait:', mongoose.connection.readyState);
  await mongoose.connection.asPromise();
  console.log('[crawler] mongoose readyState after wait:', mongoose.connection.readyState);

  const col = mongoose.connection.db!.collection('guestscanreports');

  try {
    // 1. อัปเดต status → scanning
    const report = await col.findOne({ _id: new mongoose.Types.ObjectId(reportId) });
    if (!report) throw new Error(`Report ${reportId} not found`);

    await col.updateOne({ _id: new mongoose.Types.ObjectId(reportId) }, { $set: { status: 'scanning' } });

    // 2. Normalize URL
    const url = normalizeUrl(report.url);

    // 3. Launch Playwright (headless)
    browser = await chromium.launch({ headless: true });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; AttestHubBot/1.0; +https://attesthub.com/bot)',
    });
    const page = await context.newPage();

    await page.goto(url, { timeout: 30_000, waitUntil: 'domcontentloaded' });

    // 4. Inject axe-core
    await page.addScriptTag({ content: axeSource.source });

    // 5. Run axe
    const violations: AxeViolation[] = await page.evaluate(() => {
      return new Promise<AxeViolation[]>((resolve, reject) => {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (window as any).axe.run(document, { reporter: 'v2' }, (err: Error | null, results: { violations: AxeViolation[] }) => {
          if (err) reject(err);
          else resolve(results.violations);
        });
      });
    });

    await browser.close();
    browser = null;

    // 6. Map violations → issues[]
    const issues: IGuestScanIssue[] = violations.flatMap((v) => {
      const severity = SEVERITY_MAP[v.impact ?? 'minor'] ?? 'minor';

      // WCAG criteria จาก tags (e.g. "wcag143" → "1.4.3")
      const wcagTag = v.tags.find((t) => /^wcag\d+$/.test(t));
      let wcagCriteria = '';
      if (wcagTag) {
        const digits = wcagTag.replace('wcag', '');
        wcagCriteria = digits
          .split('')
          .join('.')
          .replace(/\.(\d)$/, '.$1'); // "143" → "1.4.3"
      }

      // สร้าง 1 issue ต่อ node (max 5 nodes per violation เพื่อไม่ให้ล้น)
      return v.nodes.slice(0, 5).map((node) => ({
        severity,
        wcagCriteria,
        element: node.html.slice(0, 200),
        description: v.help,
        recommendation: `แก้ไขปัญหา: ${v.description}`,
      }));
    });

    // 7. คำนวณ score และ WCAG level
    const score = calcScore(issues);
    const wcagLevel = determineWcagLevel(issues);
    const summary = {
      passed: 0, // axe-core basic run ไม่รายงาน passes
      failed: issues.length,
      warnings: 0,
      total: issues.length,
    };

    // 8. เรียก AI summary
    let aiSummary;
    try {
      aiSummary = await generateAiSummary(issues);
    } catch (aiErr) {
      console.warn('[crawler] AI summary failed, using default:', aiErr instanceof Error ? aiErr.message : aiErr);
      aiSummary = {
        overview: 'ไม่สามารถสร้างสรุปอัตโนมัติได้',
        topIssues: [],
        recommendations: [],
        urgency: 'ควรแก้ไข' as const,
      };
    }

    // 9. อัปเดต GuestScanReport → completed
    const scanDurationMs = Date.now() - startTime;
    await col.updateOne({ _id: new mongoose.Types.ObjectId(reportId) }, { $set: {
      status: 'completed',
      score,
      wcagLevel,
      summary,
      issues,
      aiSummary,
      pagesScanned: 1,
      scanDurationMs,
    } });

    console.log(
      `[crawler] ${reportId} done — score=${score}, issues=${issues.length}, duration=${scanDurationMs}ms`
    );
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[crawler] ${reportId} failed:`, errorMessage);

    await col.updateOne({ _id: new mongoose.Types.ObjectId(reportId) }, { $set: {
      status: 'failed',
      errorMessage,
    } }).catch(() => null);
  }
}
