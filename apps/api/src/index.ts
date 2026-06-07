import 'dotenv/config'
import Fastify from 'fastify'
import cors from '@fastify/cors'
import websocket from '@fastify/websocket'
import { logger } from '@recon-nexus/logger'
import { scanRoutes } from './routes/scans.js'
import { wsRoutes } from './routes/ws.js'

const app = Fastify({ logger: false })

await app.register(cors, { origin: '*' })
await app.register(websocket)
await app.register(scanRoutes, { prefix: '/api/scans' })
await app.register(wsRoutes)

app.get('/health', async () => ({ status: 'ok' }))

const port = Number(process.env.PORT) || 3001

try {
  await app.listen({ port, host: '0.0.0.0' })
  logger.info(`API running on http://0.0.0.0:${port}`)
} catch (err) {
  logger.error(err)
  process.exit(1)
}
