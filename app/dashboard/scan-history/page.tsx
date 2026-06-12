'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { RoleGuard } from '@/components/role-guard';
import { DashboardSidebar } from '@/components/dashboard-sidebar';
import { DashboardHeader } from '@/components/dashboard-header';
import { Button } from '@/components/ui/button';
import { ScoreCircle } from '@/components/free-scan/scan-result-views';
import { Search } from 'lucide-react';

interface ScanHistoryItem {
  reportId: string;
  url: string;
  domain: string;
  score: number | null;
  wcagLevel: string | null;
  status: 'pending' | 'scanning' | 'completed' | 'failed';
  createdAt: string;
  urgency: string | null;
}

const URGENCY_COLOR: Record<string, string> = {
  'ด่วนมาก': '#dc2626',
  'ด่วน': '#ea580c',
  'ควรแก้ไข': '#d97706',
  'แนะนำ': '#16a34a',
};

const STATUS_LABEL: Record<string, string> = {
  pending: 'รอเริ่ม',
  scanning: 'กำลังตรวจสอบ',
  completed: 'เสร็จสิ้น',
  failed: 'ล้มเหลว',
};

export default function ScanHistoryPage() {
  const [items, setItems] = useState<ScanHistoryItem[] | null>(null);

  useEffect(() => {
    fetch('/api/scan-history')
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then((json) => setItems(json.data ?? []))
      .catch(() => setItems([]));
  }, []);

  return (
    <RoleGuard allowedRoles={['customer']}>
      <div className="flex min-h-screen bg-background">
        <DashboardSidebar />
        <div className="flex-1 flex flex-col">
          <DashboardHeader />
          <main className="flex-1 p-6 lg:p-8">
            <div className="mb-6">
              <h1 className="text-3xl font-bold">ประวัติการตรวจสอบฟรี</h1>
              <p className="text-muted-foreground">
                รายการเว็บไซต์ที่คุณเคยตรวจสอบด้วยฟีเจอร์ตรวจสอบฟรี (Free Scan)
              </p>
            </div>

            {items === null && (
              <div className="text-center py-20 text-muted-foreground">กำลังโหลด...</div>
            )}

            {items !== null && items.length === 0 && (
              <div className="flex flex-col items-center text-center py-20 px-6 bg-card border rounded-2xl">
                <div className="w-16 h-16 rounded-full flex items-center justify-center mb-6 bg-muted">
                  <Search className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">ยังไม่มีประวัติการตรวจสอบ</h2>
                <p className="text-sm text-muted-foreground mb-6 max-w-md">
                  ลองตรวจสอบเว็บไซต์ของคุณฟรีเพื่อดูคะแนนการเข้าถึงและคำแนะนำจาก AI
                </p>
                <Link href="/free-scan">
                  <Button style={{ backgroundColor: '#0f7c6e', color: '#fff' }}>
                    ตรวจสอบเว็บไซต์ฟรี
                  </Button>
                </Link>
              </div>
            )}

            {items !== null && items.length > 0 && (
              <div className="space-y-3">
                {items.map((item) => {
                  const date = new Date(item.createdAt).toLocaleDateString('th-TH', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit',
                  });

                  const content = (
                    <div className="flex items-center gap-4 bg-card border rounded-2xl p-4 hover:border-primary/50 transition-colors">
                      <div className="flex-shrink-0">
                        {item.score != null ? (
                          <ScoreCircle score={item.score} size={56} showLabel={false} />
                        ) : (
                          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center text-xs text-muted-foreground">
                            {STATUS_LABEL[item.status]}
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate" style={{ color: '#1a2744' }}>
                          {item.domain}
                        </p>
                        <p className="text-xs text-muted-foreground mb-2">{date}</p>
                        <div className="flex flex-wrap items-center gap-2">
                          {item.wcagLevel && (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{ backgroundColor: '#e8f5f3', color: '#0f7c6e' }}
                            >
                              WCAG {item.wcagLevel}
                            </span>
                          )}
                          {item.urgency && (
                            <span
                              className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold"
                              style={{
                                backgroundColor: `${URGENCY_COLOR[item.urgency] ?? '#94a3b8'}15`,
                                color: URGENCY_COLOR[item.urgency] ?? '#94a3b8',
                              }}
                            >
                              {item.urgency}
                            </span>
                          )}
                          {item.status !== 'completed' && (
                            <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold bg-muted text-muted-foreground">
                              {STATUS_LABEL[item.status]}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  );

                  return (
                    <Link key={item.reportId} href={`/free-scan/result/${item.reportId}`}>
                      {content}
                    </Link>
                  );
                })}
              </div>
            )}
          </main>
        </div>
      </div>
    </RoleGuard>
  );
}
