import { chromium } from 'playwright';
import axeSource from 'axe-core';
import mongoose from 'mongoose';
import AuditReport, { IAuditReport } from '../models/AuditReport';
import ProjectSitemap from '../models/ProjectSitemap';
import { generateAiSummary } from './ai-summary';
import type { AuditScanJobData } from '../lib/queue/scanQueue';

type IssueSeverity = IAuditReport['issues'][number]['severity'];
type AuditIssue = IAuditReport['issues'][number];

const SEVERITY_MAP: Record<string, IssueSeverity> = {
  critical: 'critical',
  serious: 'serious',
  moderate: 'moderate',
  minor: 'minor',
};

function calculateScore(issues: AuditIssue[]): number {
  const weights: Record<IssueSeverity, number> = {
    critical: 25,
    serious: 15,
    moderate: 5,
    minor: 1,
  };
  const penalty = issues.reduce((sum, issue) => sum + weights[issue.severity], 0);
  return Math.max(0, 100 - penalty);
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
    failureSummary?: string;
  }>;
}

export async function runAuditUrlScan(data: AuditScanJobData): Promise<void> {
  const { reportId, url, auditRequestId, sitemapUrlId } = data;
  const startTime = Date.now();
  let browser = null;

  console.log('[audit-scan-worker] mongoose readyState before wait:', mongoose.connection.readyState);
  await mongoose.connection.asPromise();
  console.log('[audit-scan-worker] mongoose readyState after wait:', mongoose.connection.readyState);

  try {
    await AuditReport.findByIdAndUpdate(reportId, { status: 'scanning' });

    browser = await chromium.launch({
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--disable-background-networking',
        '--disable-background-timer-throttling',
        '--disable-backgrounding-occluded-windows',
        '--disable-renderer-backgrounding',
        '--disable-extensions',
        '--disable-sync',
        '--mute-audio',
        '--no-first-run',
        '--js-flags=--max-old-space-size=512',
      ],
    });
    const context = await browser.newContext({
      userAgent:
        'Mozilla/5.0 (compatible; AttestHubBot/1.0; +https://attesthub.com/bot)',
    });

    await context.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font'].includes(type)) {
        return route.abort();
      }
      return route.continue();
    });

    const page = await context.newPage();
    await page.goto(url, { timeout: 30_000, waitUntil: 'domcontentloaded' });

    await page.addScriptTag({ content: axeSource.source });

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

    const issues: AuditIssue[] = violations.map((v, i) => {
      const wcagTag = v.tags?.find((t) => t.startsWith('wcag')) ?? '';
      return {
        id: `${v.id}-${i}`,
        severity: SEVERITY_MAP[v.impact ?? 'minor'] ?? 'moderate',
        wcagCriteria: wcagTag,
        wcagTitle: v.description || v.id,
        element: v.nodes?.[0]?.html ?? '',
        description: v.description ?? '',
        recommendation: v.nodes?.[0]?.failureSummary ?? '',
        pageUrl: url,
        impact: v.impact ?? 'moderate',
      };
    });

    const score = calculateScore(issues);
    const wcagLevel: IAuditReport['wcagLevel'] = score >= 90 ? 'AA' : 'A';
    const summary = {
      passed: 0,
      failed: issues.length,
      warnings: 0,
      total: issues.length,
    };

    let aiSummary;
    let aiSummaryError: string | undefined;
    try {
      aiSummary = await generateAiSummary(issues);
    } catch (aiErr) {
      aiSummaryError = aiErr instanceof Error ? aiErr.message : String(aiErr);
      console.error('[audit-scan-worker] AI summary failed:', aiSummaryError);
    }

    const scanDurationMs = Date.now() - startTime;

    await AuditReport.findByIdAndUpdate(reportId, {
      status: 'completed',
      score,
      wcagLevel,
      summary,
      issues,
      ...(aiSummary ? { aiSummary } : {}),
      ...(aiSummaryError ? { aiSummaryError } : {}),
      pagesScanned: 1,
      scanDurationMs,
      completedAt: new Date(),
    });

    await ProjectSitemap.updateOne(
      { auditRequestId, 'urls._id': sitemapUrlId },
      { $set: { 'urls.$.lastScanAt': new Date(), 'urls.$.auditReportId': reportId } }
    );

    console.log(
      `[audit-scan-worker] ${reportId} done — score=${score}, issues=${issues.length}, duration=${scanDurationMs}ms`
    );
  } catch (err) {
    if (browser) {
      try { await browser.close(); } catch { /* ignore */ }
    }

    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[audit-scan-worker] ${reportId} failed:`, errorMessage);

    await AuditReport.findByIdAndUpdate(reportId, {
      status: 'failed',
      errorMessage,
    }).catch(() => null);
  }
}
