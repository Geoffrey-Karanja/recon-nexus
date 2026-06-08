import { Queue } from 'bullmq'
import { redisConnection } from './redis.js'

export const scanQueue = new Queue('scans', {
  connection: redisConnection,
  defaultJobOptions: {
    removeOnComplete: { age: 3600, count: 50 },
    removeOnFail: { age: 86400, count: 100 },
  }
})
