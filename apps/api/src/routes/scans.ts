import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'
import { scanQueue } from '../lib/queue.js'
import sql from '@recon-nexus/db'

export const scanRoutes: FastifyPluginAsync = async (app) => {
  // Create new scan
  app.post<{ Body: { target: string; profile: 'passive' | 'full' | 'custom' } }>('/', async (req, reply) => {
    const { target, profile = 'full' } = req.body
    if (!target) return reply.code(400).send({ error: 'target is required' })

    const id = randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO scans (id, target, profile, status, created_at, updated_at)
      VALUES (${id}, ${target}, ${profile}, 'queued', ${now}, ${now})
    `

    await scanQueue.add('run-scan', { scanId: id, target, profile })

    return { scanId: id, status: 'queued' }
  })

  // Get scan by id
  app.get<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const [scan] = await sql`SELECT * FROM scans WHERE id = ${req.params.id}`
    if (!scan) return reply.code(404).send({ error: 'not found' })

    const findings = await sql`SELECT * FROM findings WHERE scan_id = ${req.params.id} ORDER BY discovered_at DESC`
    const tools = await sql`SELECT * FROM tool_results WHERE scan_id = ${req.params.id}`

    return { ...scan, findings, tools }
  })

  // List all scans
  app.get('/', async () => {
    return sql`SELECT * FROM scans ORDER BY created_at DESC LIMIT 50`
  })
}
