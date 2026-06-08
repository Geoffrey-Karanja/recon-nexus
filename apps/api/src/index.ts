import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import rateLimit from '@fastify/rate-limit'
import jwt from '@fastify/jwt'
import cookie from '@fastify/cookie'
import staticFiles from '@fastify/static'
import { join } from 'path'
import websocket from '@fastify/websocket'
import { logger } from '@recon-nexus/logger'
import { scanRoutes } from './routes/scans.js'
import { authRoutes } from './routes/auth.js'
import { wsRoutes } from './routes/ws.js'
import { cancelRoutes } from './routes/cancel.js'
import { reportRoutes } from './routes/reports.js'

const app = Fastify({ logger: false })

await app.register(cors, { origin: 'http://localhost:5173', credentials: true })
await app.register(rateLimit, {
  max: 100,
  timeWindow: '1 minute',
  errorResponseBuilder: () => ({ error: 'Too many requests — slow down' })
})
await app.register(cookie)
await app.register(jwt, {
  secret: process.env.JWT_SECRET || 'recon-nexus-secret-change-in-production',
  cookie: { cookieName: 'token', signed: false }
})
await app.register(staticFiles, { root: '/tmp/recon-nexus-screenshots', prefix: '/api/screenshots/', decorateReply: false })
await app.register(websocket)
await app.register(authRoutes, { prefix: '/api/auth' })
await app.register(scanRoutes, { prefix: '/api/scans' })
 await app.register(cancelRoutes, { prefix: '/api/scans' })
 await app.register(reportRoutes, { prefix: '/api/scans' })
await app.register(wsRoutes)

app.get('/health', async (req, reply) => {
  const checks: Record<string, string> = {}

  // Check DB
  try {
    const sql = (await import('@recon-nexus/db')).default
    await sql`SELECT 1`
    checks.db = 'ok'
  } catch {
    checks.db = 'error'
  }

  // Check Redis
  try {
    const { redisConnection } = await import('./lib/redis.js')
    await redisConnection.ping()
    checks.redis = 'ok'
  } catch {
    checks.redis = 'error'
  }

  const allOk = Object.values(checks).every(v => v === 'ok')
  return reply.code(allOk ? 200 : 503).send({
    status: allOk ? 'ok' : 'degraded',
    checks,
    uptime: process.uptime(),
    timestamp: new Date().toISOString()
  })
})

const port = Number(process.env.PORT) || 3001

try {
  await app.listen({ port, host: '0.0.0.0' })
  logger.info(`API running on http://0.0.0.0:${port}`)
} catch (err) {
  logger.error(err)
  process.exit(1)
}

