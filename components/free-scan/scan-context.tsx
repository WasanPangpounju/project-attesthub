'use client';

import { createContext, useContext, useState } from 'react';
import { useRouter } from 'next/navigation';

interface ScanContextValue {
  url: string;
  setUrl: (url: string) => void;
  loading: boolean;
  error: string;
  submitScan: (e: React.FormEvent) => Promise<void>;
}

const ScanContext = createContext<ScanContextValue | null>(null);

export function ScanProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function submitScan(e: React.FormEvent) {
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
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error ?? 'เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
        setLoading(false);
        return;
      }

      router.push(`/free-scan/result/${data.reportId}?cached=${!!data.cached}`);
    } catch {
      setError('ไม่สามารถเชื่อมต่อเซิร์ฟเวอร์ได้ กรุณาลองใหม่อีกครั้ง');
      setLoading(false);
    }
  }

  return (
    <ScanContext.Provider value={{ url, setUrl, loading, error, submitScan }}>
      {children}
    </ScanContext.Provider>
  );
}

export function useScan() {
  const ctx = useContext(ScanContext);
  if (!ctx) throw new Error('useScan must be used within a ScanProvider');
  return ctx;
}
