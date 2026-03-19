import { auth } from '@clerk/nextjs/server';
import { clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { connectToDatabase } from '@/lib/mongodb';
import User from '@/models/User';
import GuestScanReport from '@/models/GuestScanReport';
import PageView from '@/models/PageView';
import { DeleteScanButton } from './delete-button';

export const runtime = 'nodejs';

type ScanRow = {
  _id: string;
  domain: string;
  url: string;
  visitorIp: string;
  score?: number;
  status: string;
  issuesCount: number;
  createdAt: Date;
};

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, string> = {
    completed: 'bg-green-100 text-green-800',
    failed: 'bg-red-100 text-red-800',
    scanning: 'bg-blue-100 text-blue-800',
    pending: 'bg-yellow-100 text-yellow-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colors[status] ?? 'bg-gray-100 text-gray-700'}`}>
      {status}
    </span>
  );
}

export default async function GuestScansAdminPage() {
  const { userId } = await auth();
  if (!userId) redirect('/sign-in');

  await connectToDatabase();

  const user = await User.findOne({ clerkUserId: userId }).lean<{ role?: string }>();
  if (!user || user.role !== 'admin') redirect('/');

  const [rawScans, pageviewCount, clerk] = await Promise.all([
    GuestScanReport.find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .lean<ScanRow[]>(),
    PageView.countDocuments(),
    clerkClient(),
  ]);

  const signupCount = await clerk.users.getCount();

  const scans = rawScans as unknown as Array<{
    _id: { toString(): string };
    domain: string;
    url: string;
    visitorIp?: string;
    score?: number;
    status: string;
    issues?: unknown[];
    createdAt: Date;
  }>;

  const totalScans = scans.length;
  const completedScans = scans.filter((s) => s.status === 'completed').length;
  const failedScans = scans.filter((s) => s.status === 'failed').length;

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Guest Scan Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">ภาพรวมการสแกน accessibility จาก guest users</p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
          <StatCard label="Total Scans" value={totalScans} color="blue" />
          <StatCard label="Completed" value={completedScans} color="green" />
          <StatCard label="Failed" value={failedScans} color="red" />
          <StatCard label="Pageviews" value={pageviewCount} color="purple" />
          <StatCard label="Signups" value={signupCount} color="orange" />
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-100">
            <h2 className="font-semibold text-gray-800">Scan History (last 100)</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase tracking-wide">
                <tr>
                  <th className="px-4 py-3 text-left">Domain</th>
                  <th className="px-4 py-3 text-left">URL</th>
                  <th className="px-4 py-3 text-left">Visitor IP</th>
                  <th className="px-4 py-3 text-left">Score</th>
                  <th className="px-4 py-3 text-left">Status</th>
                  <th className="px-4 py-3 text-left">Issues</th>
                  <th className="px-4 py-3 text-left">Created At</th>
                  <th className="px-4 py-3 text-left">ลบ</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {scans.length === 0 && (
                  <tr>
                    <td colSpan={8} className="px-4 py-8 text-center text-gray-400">
                      No scans yet
                    </td>
                  </tr>
                )}
                {scans.map((scan) => (
                  <tr key={scan._id.toString()} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-800 max-w-[140px] truncate">
                      {scan.domain}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      <a
                        href={scan.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hover:text-blue-600 hover:underline"
                      >
                        {scan.url}
                      </a>
                    </td>
                    <td className="px-4 py-3 text-gray-500 font-mono text-xs">
                      {scan.visitorIp || '—'}
                    </td>
                    <td className="px-4 py-3">
                      {scan.score != null ? (
                        <span
                          className={`font-semibold ${
                            scan.score >= 80
                              ? 'text-green-600'
                              : scan.score >= 50
                              ? 'text-yellow-600'
                              : 'text-red-600'
                          }`}
                        >
                          {scan.score}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={scan.status} />
                    </td>
                    <td className="px-4 py-3 text-gray-600">
                      {scan.issues?.length ?? 0}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs whitespace-nowrap">
                      {new Date(scan.createdAt).toLocaleString('th-TH', {
                        year: 'numeric',
                        month: '2-digit',
                        day: '2-digit',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    <td className="px-4 py-3">
                      <DeleteScanButton reportId={scan._id.toString()} domain={scan.domain} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: 'blue' | 'green' | 'red' | 'purple' | 'orange';
}) {
  const colorMap = {
    blue: 'bg-blue-50 text-blue-700',
    green: 'bg-green-50 text-green-700',
    red: 'bg-red-50 text-red-700',
    purple: 'bg-purple-50 text-purple-700',
    orange: 'bg-orange-50 text-orange-700',
  };
  return (
    <div className={`rounded-xl p-4 ${colorMap[color]}`}>
      <p className="text-xs font-medium opacity-70">{label}</p>
      <p className="text-3xl font-bold mt-1">{value.toLocaleString()}</p>
    </div>
  );
}
