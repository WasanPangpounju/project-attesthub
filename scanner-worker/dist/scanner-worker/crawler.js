"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.runGuestScan = runGuestScan;
const playwright_1 = require("playwright");
const axe_core_1 = __importDefault(require("axe-core"));
const mongoose_1 = __importDefault(require("mongoose"));
const ai_summary_1 = require("./ai-summary");
// axe violation impact → issue severity mapping
const SEVERITY_MAP = {
    critical: 'critical',
    serious: 'serious',
    moderate: 'moderate',
    minor: 'minor',
};
function normalizeUrl(input) {
    if (/^https?:\/\//i.test(input))
        return input;
    return `https://${input}`;
}
function calcScore(issues) {
    const penalty = issues.reduce((sum, issue) => {
        const weights = {
            critical: 25,
            serious: 15,
            moderate: 5,
            minor: 1,
        };
        return sum + weights[issue.severity];
    }, 0);
    return Math.max(0, 100 - penalty);
}
function determineWcagLevel(issues) {
    const hasCritical = issues.some((i) => i.severity === 'critical');
    const hasSerious = issues.some((i) => i.severity === 'serious');
    const hasModerate = issues.some((i) => i.severity === 'moderate');
    if (hasCritical)
        return 'None';
    if (hasSerious)
        return 'A';
    if (hasModerate)
        return 'AA';
    return 'AAA';
}
async function runGuestScan(reportId) {
    const startTime = Date.now();
    let browser = null;
    // รอให้ mongoose connection พร้อมก่อนเรียก model ใดๆ
    console.log('[crawler] mongoose readyState before wait:', mongoose_1.default.connection.readyState);
    await mongoose_1.default.connection.asPromise();
    console.log('[crawler] mongoose readyState after wait:', mongoose_1.default.connection.readyState);
    const col = mongoose_1.default.connection.db.collection('guestscanreports');
    try {
        // 1. อัปเดต status → scanning
        const report = await col.findOne({ _id: new mongoose_1.default.Types.ObjectId(reportId) });
        if (!report)
            throw new Error(`Report ${reportId} not found`);
        await col.updateOne({ _id: new mongoose_1.default.Types.ObjectId(reportId) }, { $set: { status: 'scanning' } });
        // 2. Normalize URL
        const url = normalizeUrl(report.url);
        // 3. Launch Playwright (headless) — flags เพื่อลด CPU/RAM บน server 2vCPU
        browser = await playwright_1.chromium.launch({
            headless: true,
            args: [
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--disable-dev-shm-usage', // ป้องกัน crash บน Linux RAM น้อย
                '--disable-gpu',
                '--disable-background-networking',
                '--disable-background-timer-throttling',
                '--disable-backgrounding-occluded-windows',
                '--disable-renderer-backgrounding',
                '--disable-extensions',
                '--disable-sync',
                '--mute-audio',
                '--no-first-run',
                '--js-flags=--max-old-space-size=512', // จำกัด JS heap 512 MB
            ],
        });
        const context = await browser.newContext({
            userAgent: 'Mozilla/5.0 (compatible; AttestHubBot/1.0; +https://attesthub.com/bot)',
        });
        // block image/media/font — axe-core ไม่ต้องการ (CSS ยังโหลดเพื่อ contrast check)
        await context.route('**/*', (route) => {
            const type = route.request().resourceType();
            if (['image', 'media', 'font'].includes(type)) {
                return route.abort();
            }
            return route.continue();
        });
        const page = await context.newPage();
        await page.goto(url, { timeout: 30_000, waitUntil: 'domcontentloaded' });
        // 4. Inject axe-core
        await page.addScriptTag({ content: axe_core_1.default.source });
        // 5. Run axe
        const violations = await page.evaluate(() => {
            return new Promise((resolve, reject) => {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                window.axe.run(document, { reporter: 'v2' }, (err, results) => {
                    if (err)
                        reject(err);
                    else
                        resolve(results.violations);
                });
            });
        });
        await browser.close();
        browser = null;
        // 6. Map violations → issues[]
        const issues = violations.flatMap((v) => {
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
            aiSummary = await (0, ai_summary_1.generateAiSummary)(issues);
        }
        catch (aiErr) {
            console.warn('[crawler] AI summary failed, using default:', aiErr instanceof Error ? aiErr.message : aiErr);
            aiSummary = {
                overview: 'ไม่สามารถสร้างสรุปอัตโนมัติได้',
                topIssues: [],
                recommendations: [],
                urgency: 'ควรแก้ไข',
            };
        }
        // 9. อัปเดต GuestScanReport → completed
        const scanDurationMs = Date.now() - startTime;
        await col.updateOne({ _id: new mongoose_1.default.Types.ObjectId(reportId) }, { $set: {
                status: 'completed',
                score,
                wcagLevel,
                summary,
                issues,
                aiSummary,
                pagesScanned: 1,
                scanDurationMs,
            } });
        console.log(`[crawler] ${reportId} done — score=${score}, issues=${issues.length}, duration=${scanDurationMs}ms`);
    }
    catch (err) {
        if (browser) {
            try {
                await browser.close();
            }
            catch { /* ignore */ }
        }
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[crawler] ${reportId} failed:`, errorMessage);
        await col.updateOne({ _id: new mongoose_1.default.Types.ObjectId(reportId) }, { $set: {
                status: 'failed',
                errorMessage,
            } }).catch(() => null);
    }
}
