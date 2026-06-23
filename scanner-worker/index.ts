import 'dotenv/config';
import { Worker, type ConnectionOptions } from 'bullmq';
import IORedis from 'ioredis';
import mongoose from 'mongoose';
import { runGuestScan } from './crawler';
import { runAuditUrlScan } from './audit-scan-worker';
import type { GuestScanJobData } from '../lib/queue/guestScanQueue';
import type { AuditScanJobData } from '../lib/queue/scanQueue';

// ── MongoDB ──────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? 'attesthub';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';

if (!MONGODB_URI) {
  console.error('[worker] MONGODB_URI is not set');
  process.exit(1);
}

async function main() {
  await mongoose.connect(MONGODB_URI!, { dbName: MONGODB_DB });
  console.log('[worker] MongoDB connected');

  // ── Redis ────────────────────────────────────────────────
  const connection = new IORedis(REDIS_URL, {
    maxRetriesPerRequest: null,
  }) as unknown as ConnectionOptions;

  // ── BullMQ Worker ────────────────────────────────────────
  // concurrency=1: Chromium กิน CPU สูง บน 2 vCPU รัน 2 ตัวพร้อมกันเกิน 100%
  const worker = new Worker<GuestScanJobData>(
    'guest-scan',
    async (job) => {
      const { reportId } = job.data;
      console.log(`[worker] processing job ${job.id} — reportId=${reportId}`);
      await runGuestScan(reportId);
    },
    {
      connection,
      lockDuration: 300_000,
      concurrency: 1,
    }
  );

  worker.on('completed', (job) => {
    console.log(`[worker] job ${job.id} completed`);
  });

  worker.on('failed', (job, err) => {
    console.error(`[worker] job ${job?.id} failed:`, err.message);
  });

  worker.on('error', (err) => {
    console.error('[worker] error:', err);
  });

  console.log('[worker] guest-scan worker started, waiting for jobs...');

  // ── audit-scan Worker (sitemap URL scans) ──────────────────
  const auditScanWorker = new Worker<AuditScanJobData>(
    'audit-scan',
    async (job) => {
      console.log(`[audit-scan] processing job ${job.id} — reportId=${job.data.reportId}`);
      await runAuditUrlScan(job.data);
    },
    {
      connection,
      lockDuration: 300_000,
      concurrency: 1,
    }
  );

  auditScanWorker.on('completed', (job) => {
    console.log(`[audit-scan] job ${job.id} completed`);
  });

  auditScanWorker.on('failed', (job, err) => {
    console.error(`[audit-scan] job ${job?.id} failed:`, err.message);
  });

  auditScanWorker.on('error', (err) => {
    console.error('[audit-scan] error:', err);
  });

  console.log('[worker] audit-scan worker started, waiting for jobs...');

  async function shutdown() {
    console.log('[worker] shutting down...');
    await worker.close();
    await auditScanWorker.close();
    await mongoose.disconnect();
    process.exit(0);
  }

  process.on('SIGTERM', shutdown);
  process.on('SIGINT', shutdown);
}

main().catch((err) => {
  console.error('[worker] startup failed:', err);
  process.exit(1);
});
