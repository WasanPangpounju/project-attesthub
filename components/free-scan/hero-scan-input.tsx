'use client';

import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { useScan } from '@/components/free-scan/scan-context';

export function HeroScanInput() {
  const { url, setUrl, loading, error, submitScan } = useScan();

  return (
    <div className="mt-10 mx-auto max-w-xl">
      <form onSubmit={submitScan} className="flex flex-col sm:flex-row gap-3">
        <label htmlFor="hero-url-input" className="sr-only">
          URL ของเว็บไซต์
        </label>
        <Input
          id="hero-url-input"
          type="text"
          inputMode="url"
          placeholder="https://example.com"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={loading}
          autoComplete="url"
          className="h-12 text-base bg-white border-0 focus-visible:ring-2 focus-visible:ring-offset-0"
          style={{ color: '#1a2744' }}
        />
        <Button
          type="submit"
          disabled={loading}
          className="h-12 px-6 text-base font-semibold whitespace-nowrap"
          style={{ backgroundColor: '#FACC15', color: '#1a2744' }}
        >
          {loading ? (
            <span className="flex items-center gap-2">
              <svg className="animate-spin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              กำลังส่งคำขอ...
            </span>
          ) : (
            'ตรวจสอบฟรี'
          )}
        </Button>
      </form>

      {error && (
        <p className="mt-3 text-sm font-medium" style={{ color: '#FACC15' }}>
          {error}
        </p>
      )}

      {/* Trust badges */}
      <p className="mt-4 text-xs sm:text-sm" style={{ color: '#cdeae5' }}>
        WCAG 2.1 · ไม่ต้องสมัคร · ผลภายใน 60 วิ
      </p>
    </div>
  );
}
