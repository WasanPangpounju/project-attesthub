'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function FreeScanPage() {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    const trimmed = url.trim();
    if (!trimmed) {
      setError('กรุณาระบุ URL ของเว็บไซต์');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch('/api/guest-scan/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (res.status === 429) {
        const minutes = Math.ceil((data.retryAfter ?? 3600) / 60);
        setError(`คุณส่งคำขอมากเกินไป กรุณารอ ${minutes} นาที แล้วลองใหม่`);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        return;
      }

      const dest = `/free-scan/result/${data.reportId}${data.cached ? '?cached=true' : ''}`;
      router.push(dest);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: '#f8fafc' }}>
      {/* Main */}
      <main className="flex-1 flex items-center justify-center px-6 py-16">
        <div className="w-full max-w-xl">
          {/* Icon */}
          <div className="flex justify-center mb-6">
            <div className="rounded-2xl p-4" >
              <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="#0f7c6e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.35-4.35" />
                <path d="M11 8v6M8 11h6" />
              </svg>
            </div>
          </div>

          <h1
            className="text-center font-semibold text-2xl md:text-3xl mb-2"
            style={{ color: '#1a2744' }}
          >
            ตรวจสอบ Accessibility ฟรี
          </h1>
          <p className="text-center text-sm mb-8" style={{ color: '#5a6478' }}>
            ตรวจสอบเฉพาะหน้าแรกของเว็บไซต์ ตามมาตรฐาน WCAG 2.1
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="url-input"
                className="block text-sm font-medium mb-1.5"
                style={{ color: '#1a2744' }}
              >
                URL ของเว็บไซต์
              </label>
              <Input
                id="url-input"
                type="text"
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                disabled={loading}
                className="h-12 text-base border border-[#e2e8f0] focus-visible:border-[#0f7c6e] focus-visible:ring-0"
                autoComplete="url"
                autoFocus
              />
              {error && (
                <p className="mt-1.5 text-sm" style={{ color: '#dc2626' }}>
                  {error}
                </p>
              )}
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 text-base font-semibold"
              style={{ backgroundColor: '#0f7c6e', color: '#fff' }}
            >
              {loading ? (
                <span className="flex items-center gap-2">
                  <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                  </svg>
                  กำลังส่งคำขอ...
                </span>
              ) : (
                'เริ่มตรวจสอบ'
              )}
            </Button>
          </form>

          {/* Note */}
          <p className="text-center text-xs mt-4" style={{ color: '#94a3b8' }}>
            ผลการตรวจสอบจะแสดงภายใน 30–60 วินาที • ไม่ต้องสมัครสมาชิก
          </p>

          {/* Divider */}
          <div className="flex items-center gap-3 my-8">
            <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
            <span className="text-xs" style={{ color: '#94a3b8' }}>หรือ</span>
            <div className="flex-1 h-px" style={{ backgroundColor: '#e2e8f0' }} />
          </div>

          <p className="text-center text-sm" style={{ color: '#5a6478' }}>
            ต้องการรายงานละเอียดจากผู้เชี่ยวชาญ?{' '}
            <Link href="/sign-up" className="font-semibold underline" style={{ color: '#0f7c6e' }}>
              สมัครใช้งาน
            </Link>
          </p>
        </div>
      </main>
    </div>
  );
}
