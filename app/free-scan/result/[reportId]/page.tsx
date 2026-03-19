'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

// ── Types ─────────────────────────────────────────────────────────────────────

type ScanStatus = 'pending' | 'scanning' | 'completed' | 'failed';

interface StatusResponse {
  status: ScanStatus;
  progress: number | null;
  score: number | null;
  wcagLevel: string | null;
  summary: { passed: number; failed: number; warnings: number; total: number } | null;
  createdAt: string;
}

interface ScanIssue {
  severity: 'critical' | 'serious' | 'moderate' | 'minor';
  wcagCriteria: string;
  element: string;
  description: string;
  recommendation: string;
}

interface ReportData {
  _id: string;
  domain: string;
  url: string;
  status: ScanStatus;
  score: number;
  wcagLevel: string;
  summary: { passed: number; failed: number; warnings: number; total: number };
  issues: ScanIssue[];
  aiSummary: {
    overview: string;
    topIssues: string[];
    recommendations: string[];
    urgency: string;
  };
  pagesScanned: number;
  scanDurationMs: number;
  createdAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

function scoreColor(score: number) {
  if (score >= 80) return '#16a34a';
  if (score >= 60) return '#d97706';
  return '#dc2626';
}

function severityLabel(s: ScanIssue['severity']) {
  const map = { critical: 'วิกฤต', serious: 'ร้ายแรง', moderate: 'ปานกลาง', minor: 'เล็กน้อย' };
  return map[s];
}

function severityColor(s: ScanIssue['severity']) {
  const map = {
    critical: { bg: '#fef2f2', text: '#dc2626', border: '#fecaca' },
    serious:  { bg: '#fff7ed', text: '#ea580c', border: '#fed7aa' },
    moderate: { bg: '#fefce8', text: '#ca8a04', border: '#fef08a' },
    minor:    { bg: '#f0fdf4', text: '#16a34a', border: '#bbf7d0' },
  };
  return map[s];
}

const SEVERITY_ORDER: ScanIssue['severity'][] = ['critical', 'serious', 'moderate', 'minor'];

function groupIssues(issues: ScanIssue[]) {
  const groups: Record<string, ScanIssue[]> = {};
  for (const s of SEVERITY_ORDER) groups[s] = [];
  for (const issue of issues) groups[issue.severity].push(issue);
  return groups;
}

// ── Score Circle SVG ──────────────────────────────────────────────────────────

function ScoreCircle({ score }: { score: number }) {
  const color = scoreColor(score);
  const dashoffset = CIRCUMFERENCE * (1 - score / 100);
  return (
    <div className="flex flex-col items-center">
      <svg width="140" height="140" viewBox="0 0 140 140">
        {/* track */}
        <circle cx="70" cy="70" r={RADIUS} fill="none" stroke="#e2e8f0" strokeWidth="10" />
        {/* progress */}
        <circle
          cx="70" cy="70" r={RADIUS}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={CIRCUMFERENCE}
          strokeDashoffset={dashoffset}
          transform="rotate(-90 70 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="70" y="65" textAnchor="middle" dominantBaseline="middle" fontSize="28" fontWeight="700" fill={color}>
          {score}
        </text>
        <text x="70" y="86" textAnchor="middle" fontSize="12" fill="#94a3b8">
          / 100
        </text>
      </svg>
      <p className="text-sm font-medium mt-1" style={{ color }}>
        {score >= 80 ? 'ผ่านเกณฑ์' : score >= 60 ? 'ควรปรับปรุง' : 'ต้องแก้ไขด่วน'}
      </p>
    </div>
  );
}

// ── Loading View ──────────────────────────────────────────────────────────────

function LoadingView({ status, progress }: { status: ScanStatus; progress: number | null }) {
  const steps = [
    { key: 'pending', label: 'รอเริ่มการตรวจสอบ' },
    { key: 'scanning', label: 'กำลังสแกนเว็บไซต์ด้วย axe-core' },
  ];
  const pct = progress ?? (status === 'scanning' ? 40 : 10);

  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      {/* Spinner */}
      <div className="mb-8 relative">
        <svg className="animate-spin" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="#0f7c6e" strokeWidth="2">
          <path d="M21 12a9 9 0 1 1-6.219-8.56" />
        </svg>
      </div>

      <h2 className="text-xl font-semibold mb-2" style={{ color: '#1a2744' }}>
        กำลังตรวจสอบเว็บไซต์...
      </h2>
      <p className="text-sm mb-8" style={{ color: '#5a6478' }}>
        ใช้เวลาประมาณ 30–60 วินาที กรุณารอสักครู่
      </p>

      {/* Progress bar */}
      <div className="w-full max-w-sm">
        <div className="flex justify-between text-xs mb-1" style={{ color: '#94a3b8' }}>
          <span>ความคืบหน้า</span>
          <span>{pct}%</span>
        </div>
        <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: '#e2e8f0' }}>
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${pct}%`, backgroundColor: '#0f7c6e' }}
          />
        </div>
      </div>

      {/* Steps */}
      <div className="mt-8 space-y-2 text-left w-full max-w-sm">
        {steps.map((step, i) => {
          const isActive = step.key === status;
          const isDone = steps.findIndex((s) => s.key === status) > i;
          return (
            <div key={step.key} className="flex items-center gap-3">
              <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold ${isDone ? 'text-white' : isActive ? 'text-white' : 'text-gray-400'}`}
                style={{ backgroundColor: isDone ? '#0f7c6e' : isActive ? '#0f7c6e' : '#e2e8f0' }}
              >
                {isDone ? '✓' : i + 1}
              </div>
              <span className="text-sm" style={{ color: isActive || isDone ? '#1a2744' : '#94a3b8' }}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Failed View ───────────────────────────────────────────────────────────────

function FailedView() {
  return (
    <div className="flex flex-col items-center text-center py-20 px-6">
      <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6" style={{ backgroundColor: '#fef2f2' }}>
        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#dc2626" strokeWidth="2" strokeLinecap="round">
          <circle cx="12" cy="12" r="10" /><path d="M15 9l-6 6M9 9l6 6" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold mb-2" style={{ color: '#1a2744' }}>ตรวจสอบไม่สำเร็จ</h2>
      <p className="text-sm mb-6" style={{ color: '#5a6478' }}>
        ไม่สามารถตรวจสอบเว็บไซต์ได้ อาจเกิดจากเว็บไซต์ไม่ตอบสนองหรือไม่อนุญาตให้เข้าถึง
      </p>
      <Link href="/free-scan">
        <Button style={{ backgroundColor: '#0f7c6e', color: '#fff' }}>ลองอีกครั้ง</Button>
      </Link>
    </div>
  );
}

// ── Result View ───────────────────────────────────────────────────────────────

function ResultView({ report, cached }: { report: ReportData; cached: boolean }) {
  const groups = groupIssues(report.issues);
  const createdDate = new Date(report.createdAt).toLocaleDateString('th-TH', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const urgencyColor: Record<string, string> = {
    'ด่วนมาก': '#dc2626', 'ด่วน': '#ea580c', 'ควรแก้ไข': '#d97706', 'แนะนำ': '#16a34a',
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 space-y-8">
      {/* Cached banner */}
      {cached && (
        <div className="rounded-xl px-4 py-3 text-sm flex items-center gap-2"
          style={{ backgroundColor: '#fffbeb', border: '1px solid #fde68a', color: '#92400e' }}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" />
          </svg>
          ผลจากการตรวจสอบเมื่อ {createdDate} (ดึงจาก cache)
        </div>
      )}

      {/* Header card */}
      <div className="bg-white rounded-2xl border p-6 flex flex-col sm:flex-row gap-6 items-center" style={{ borderColor: '#e2e8f0' }}>
        <ScoreCircle score={report.score} />

        <div className="flex-1 text-center sm:text-left">
          <p className="text-xs font-medium mb-1" style={{ color: '#94a3b8' }}>ผลการตรวจสอบ</p>
          <h1 className="text-xl font-bold break-all mb-3" style={{ color: '#1a2744' }}>
            {report.domain}
          </h1>

          {/* WCAG badge */}
          <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold mr-2"
            style={{ backgroundColor: '#e8f5f3', color: '#0f7c6e' }}
          >
            WCAG {report.wcagLevel}
          </span>

          {/* Urgency badge */}
          {report.aiSummary?.urgency && (
            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold"
              style={{ backgroundColor: `${urgencyColor[report.aiSummary.urgency]}15`, color: urgencyColor[report.aiSummary.urgency] }}
            >
              {report.aiSummary.urgency}
            </span>
          )}

          {/* Summary stats */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {[
              { label: 'ปัญหาทั้งหมด', value: report.summary.total, color: '#dc2626' },
              { label: 'หน้าที่ตรวจ', value: report.pagesScanned ?? 1, color: '#0f7c6e' },
              { label: 'เวลา (วินาที)', value: Math.round((report.scanDurationMs ?? 0) / 1000), color: '#5a6478' },
            ].map((s) => (
              <div key={s.label} className="rounded-xl p-3 text-center" style={{ backgroundColor: '#f8fafc' }}>
                <p className="text-xl font-bold" style={{ color: s.color }}>{s.value}</p>
                <p className="text-xs" style={{ color: '#94a3b8' }}>{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* AI Summary */}
      {report.aiSummary && (
        <div className="bg-white rounded-2xl border p-6 space-y-5" style={{ borderColor: '#e2e8f0' }}>
          <h2 className="font-semibold text-base flex items-center gap-2" style={{ color: '#1a2744' }}>
            <span className="rounded-lg p-1.5" style={{ backgroundColor: '#e8f5f3' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0f7c6e" strokeWidth="2" strokeLinecap="round">
                <path d="M12 2a10 10 0 1 0 0 20A10 10 0 0 0 12 2z" /><path d="M12 6v6l4 2" />
              </svg>
            </span>
            AI วิเคราะห์ผล
          </h2>

          <p className="text-sm leading-relaxed" style={{ color: '#374151' }}>
            {report.aiSummary.overview}
          </p>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Top issues */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#fef2f2' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#dc2626' }}>ปัญหาหลักที่พบ</p>
              <ul className="space-y-1.5">
                {report.aiSummary.topIssues.map((issue, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                    <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold text-white" style={{ backgroundColor: '#dc2626' }}>{i + 1}</span>
                    {issue}
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="rounded-xl p-4" style={{ backgroundColor: '#f0fdf4' }}>
              <p className="text-xs font-semibold mb-3" style={{ color: '#16a34a' }}>คำแนะนำเบื้องต้น</p>
              <ul className="space-y-1.5">
                {report.aiSummary.recommendations.map((rec, i) => (
                  <li key={i} className="flex items-start gap-2 text-sm" style={{ color: '#374151' }}>
                    <span className="flex-shrink-0 mt-0.5" style={{ color: '#16a34a' }}>✓</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Issues table */}
      {report.issues.length > 0 && (
        <div className="bg-white rounded-2xl border overflow-hidden" style={{ borderColor: '#e2e8f0' }}>
          <div className="px-6 py-4 border-b" style={{ borderColor: '#e2e8f0' }}>
            <h2 className="font-semibold text-base" style={{ color: '#1a2744' }}>
              รายละเอียดปัญหา ({report.issues.length} รายการ)
            </h2>
          </div>

          {SEVERITY_ORDER.map((sev) => {
            const items = groups[sev];
            if (!items.length) return null;
            const col = severityColor(sev);
            return (
              <div key={sev}>
                {/* Severity header */}
                <div className="px-6 py-2.5 flex items-center gap-2" style={{ backgroundColor: col.bg, borderBottom: `1px solid ${col.border}` }}>
                  <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full" style={{ backgroundColor: col.border, color: col.text }}>
                    {severityLabel(sev)}
                  </span>
                  <span className="text-xs" style={{ color: col.text }}>{items.length} รายการ</span>
                </div>

                {/* Issue rows */}
                {items.map((issue, idx) => (
                  <div
                    key={idx}
                    className="px-6 py-4 text-sm"
                    style={{
                      borderBottom: idx < items.length - 1 ? `1px solid #f1f5f9` : undefined,
                      color: '#374151',
                    }}
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <p className="font-medium mb-1" style={{ color: '#1a2744' }}>
                          {issue.description}
                        </p>
                        {issue.recommendation && (
                          <p className="text-xs mb-2" style={{ color: '#5a6478' }}>
                            {issue.recommendation}
                          </p>
                        )}
                        {issue.element && (
                          <code className="text-xs block truncate rounded px-2 py-1 font-mono"
                            style={{ backgroundColor: '#f1f5f9', color: '#475569' }}
                          >
                            {issue.element}
                          </code>
                        )}
                      </div>
                      {issue.wcagCriteria && (
                        <span className="flex-shrink-0 text-xs px-2 py-0.5 rounded font-mono"
                          style={{ backgroundColor: '#e8f5f3', color: '#0f7c6e' }}
                        >
                          {issue.wcagCriteria}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {/* CTA */}
      <div className="rounded-2xl p-8 text-center" style={{ background: 'linear-gradient(135deg, #1a2744 0%, #0f4c40 100%)' }}>
        <h3 className="text-white font-semibold text-xl mb-2">
          ต้องการรายงานละเอียดและการแก้ไขจากผู้เชี่ยวชาญ?
        </h3>
        <p className="text-sm mb-6" style={{ color: '#94d3cb' }}>
          รับรายงาน WCAG เชิงลึก พร้อมทีมผู้ตรวจสอบมืออาชีพ
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/sign-up">
            <Button className="font-semibold px-8" style={{ backgroundColor: '#0f7c6e', color: '#fff' }}>
              สมัครใช้งาน
            </Button>
          </Link>
          <Link href="/free-scan">
            <Button variant="outline" className="font-semibold px-8 border-white/30 text-white hover:bg-white/10">
              ตรวจสอบเว็บไซต์อื่น
            </Button>
          </Link>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function FreeScanResultPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const reportId = params.reportId as string;
  const isCached = searchParams.get('cached') === 'true';

  const [status, setStatus] = useState<ScanStatus>('pending');
  const [progress, setProgress] = useState<number | null>(null);
  const [report, setReport] = useState<ReportData | null>(null);
  const [createdAt, setCreatedAt] = useState<string>('');
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  function stopPolling() {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }

  async function pollStatus() {
    try {
      const res = await fetch(`/api/guest-scan/${reportId}/status`);
      if (!res.ok) return;
      const data: StatusResponse = await res.json();

      setStatus(data.status);
      setProgress(data.progress);
      if (data.createdAt) setCreatedAt(data.createdAt);

      if (data.status === 'completed') {
        stopPolling();
        // ดึง report เต็ม
        const rRes = await fetch(`/api/guest-scan/${reportId}`);
        if (rRes.ok) {
          const rData = await rRes.json();
          setReport(rData.data);
        }
      } else if (data.status === 'failed') {
        stopPolling();
      }
    } catch {
      // network error — polling ต่อไป
    }
  }

  useEffect(() => {
    // Poll ทันทีครั้งแรก แล้วทุก 3 วินาที
    pollStatus();
    intervalRef.current = setInterval(pollStatus, 3000);
    return () => stopPolling();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [reportId]);

  return (
    <div className="min-h-screen" style={{ backgroundColor: '#f8fafc' }}>
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="font-semibold text-lg" style={{ color: '#1a2744' }}>
            AttestHub
          </Link>
          <Link href="/sign-up">
            <Button size="sm" style={{ backgroundColor: '#0f7c6e', color: '#fff' }}>
              สมัครใช้งาน
            </Button>
          </Link>
        </div>
      </header>

      {/* Content */}
      {status === 'failed' ? (
        <FailedView />
      ) : status === 'completed' && report ? (
        <ResultView report={report} cached={isCached} />
      ) : (
        <LoadingView status={status} progress={progress} />
      )}
    </div>
  );
}
