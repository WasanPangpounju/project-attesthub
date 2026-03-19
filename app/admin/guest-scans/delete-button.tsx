'use client';

import { useRouter } from 'next/navigation';

export function DeleteScanButton({ reportId, domain }: { reportId: string; domain: string }) {
  const router = useRouter();

  async function handleDelete() {
    if (!confirm(`ต้องการลบ scan ของ ${domain} ใช่หรือไม่?`)) return;
    const res = await fetch(`/api/admin/guest-scans/${reportId}`, { method: 'DELETE' });
    if (res.ok) router.refresh();
    else alert('ลบไม่สำเร็จ');
  }

  return (
    <button
      onClick={handleDelete}
      className="px-2 py-1 text-xs text-red-600 hover:text-red-800 hover:bg-red-50 rounded transition-colors"
    >
      ลบ
    </button>
  );
}
