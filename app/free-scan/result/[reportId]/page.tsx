'use client';

import { useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import {
  ScanStatus,
  StatusResponse,
  ReportData,
  LoadingView,
  FailedView,
  ResultView,
} from '@/components/free-scan/scan-result-views';

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

      {/* Sticky CTA bar — แสดงหลังจากผลสแกนพร้อมแล้ว */}
      {status === 'completed' && report && (
        <div
          className="sticky bottom-0 z-20 border-t"
          style={{
            background: 'linear-gradient(135deg, #1a2744 0%, #0f4c40 100%)',
            borderColor: 'rgba(255,255,255,0.1)',
          }}
        >
          <div className="container mx-auto px-6 py-4 flex flex-col sm:flex-row items-center justify-between gap-3">
            <p className="text-sm sm:text-base font-semibold text-white text-center sm:text-left">
              ต้องการแก้ไขปัญหาทั้งหมด? ผู้เชี่ยวชาญของเราช่วยได้
            </p>
            <div className="flex gap-3 shrink-0">
              <Link href="/sign-up">
                <Button className="font-semibold px-6" style={{ backgroundColor: '#FACC15', color: '#1a2744' }}>
                  สมัครใช้งานฟรี
                </Button>
              </Link>
              <Link href="/#services">
                <Button variant="outline" className="font-semibold px-6 border-white/30 text-white hover:bg-white/10">
                  ดูแพ็กเกจ
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
