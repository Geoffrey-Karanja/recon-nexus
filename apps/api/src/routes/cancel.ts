import type { FastifyPluginAsync } from 'fastify'
import sql from '@recon-nexus/db'
import { processRegistry } from '../lib/processRegistry.js'
import { pubsub } from '../lib/pubsub.js'
import { logger } from '@recon-nexus/logger'

export const cancelRoutes: FastifyPluginAsync = async (app) => {
  app.post<{ Params: { id: string } }>('/:id/cancel', async (req, reply) => {
    const { id } = req.params

    const [scan] = await sql`SELECT * FROM scans WHERE id = ${id}`
    if (!scan) return reply.code(404).send({ error: 'scan not found' })
    if (scan.status !== 'running' && scan.status !== 'queued') {
      return reply.code(400).send({ error: `scan is ${scan.status}, cannot cancel` })
    }

    processRegistry.kill(id)

    await sql`UPDATE scans SET status = 'cancelled', updated_at = now() WHERE id = ${id}`
    await sql`UPDATE tool_results SET status = 'cancelled' WHERE scan_id = ${id} AND status = 'running'`

    pubsub.publish(id, { type: 'scan:cancelled', scanId: id, payload: {} })
    logger.info({ scanId: id }, 'Scan cancelled')

    return { success: true, scanId: id }
  })
}
