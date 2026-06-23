import { Queue, type ConnectionOptions } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions

export const scanQueue = new Queue("audit-scan", { connection })

export interface ScanJobData {
  auditRequestId: string
  reportId: string // AuditReport _id ที่สร้างไว้แล้ว
}

export type AuditScanJobData = {
  type: "sitemap_url"
  auditRequestId: string
  sitemapUrlId: string
  url: string
  reportId: string
}
