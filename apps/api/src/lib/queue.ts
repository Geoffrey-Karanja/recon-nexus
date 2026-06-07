import { Queue } from 'bullmq'
import { redisConnection } from './redis.js'

export const scanQueue = new Queue('scans', { connection: redisConnection })
