import { Queue, type ConnectionOptions } from "bullmq"
import IORedis from "ioredis"

const connection = new IORedis(process.env.REDIS_URL ?? "redis://localhost:6379", {
  maxRetriesPerRequest: null,
}) as unknown as ConnectionOptions

export const guestScanQueue = new Queue("guest-scan", { connection })

export interface GuestScanJobData {
  reportId: string
}
