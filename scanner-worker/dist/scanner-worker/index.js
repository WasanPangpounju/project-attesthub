"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("dotenv/config");
const bullmq_1 = require("bullmq");
const ioredis_1 = __importDefault(require("ioredis"));
const mongoose_1 = __importDefault(require("mongoose"));
const crawler_1 = require("./crawler");
// ── MongoDB ──────────────────────────────────────────────
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB = process.env.MONGODB_DB ?? 'attesthub';
const REDIS_URL = process.env.REDIS_URL ?? 'redis://localhost:6379';
if (!MONGODB_URI) {
    console.error('[worker] MONGODB_URI is not set');
    process.exit(1);
}
async function main() {
    await mongoose_1.default.connect(MONGODB_URI, { dbName: MONGODB_DB });
    console.log('[worker] MongoDB connected');
    // ── Redis ────────────────────────────────────────────────
    const connection = new ioredis_1.default(REDIS_URL, {
        maxRetriesPerRequest: null,
    });
    // ── BullMQ Worker ────────────────────────────────────────
    // concurrency=1: Chromium กิน CPU สูง บน 2 vCPU รัน 2 ตัวพร้อมกันเกิน 100%
    const worker = new bullmq_1.Worker('guest-scan', async (job) => {
        const { reportId } = job.data;
        console.log(`[worker] processing job ${job.id} — reportId=${reportId}`);
        await (0, crawler_1.runGuestScan)(reportId);
    }, {
        connection,
        lockDuration: 300_000,
        concurrency: 1,
    });
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
    async function shutdown() {
        console.log('[worker] shutting down...');
        await worker.close();
        await mongoose_1.default.disconnect();
        process.exit(0);
    }
    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
}
main().catch((err) => {
    console.error('[worker] startup failed:', err);
    process.exit(1);
});
