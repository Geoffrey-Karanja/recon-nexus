import type { FastifyPluginAsync } from 'fastify'
import { randomUUID } from 'crypto'
import sql from '@recon-nexus/db'
import { executeScan } from '../services/runScan.js'
import { requireAuth } from '../lib/authMiddleware.js'

export const scanRoutes: FastifyPluginAsync = async (app) => {
  // Protect all scan routes
  app.addHook('preHandler', requireAuth)

  // Create new scan
  app.post<{ Body: { target: string; profile: 'passive' | 'full' | 'custom' } }>('/', async (req, reply) => {
    let { target, profile = 'full' } = req.body
    if (!target) return reply.code(400).send({ error: 'target is required' })

    // Sanitize target — strip protocol, trailing slashes, whitespace
    target = target.trim()
      .replace(/^https?:\/\//, '')
      .replace(/^www\./, '')
      .replace(/\/.*$/, '')
      .toLowerCase()

    if (!target) return reply.code(400).send({ error: 'invalid target' })
    if (!/^[a-zA-Z0-9][a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(target)) {
      return reply.code(400).send({ error: 'target must be a valid domain (e.g. tesla.com)' })
    }

    const id = randomUUID()
    const now = new Date().toISOString()

    await sql`
      INSERT INTO scans (id, target, profile, status, created_at, updated_at)
      VALUES (${id}, ${target}, ${profile}, 'queued', ${now}, ${now})
    `

    // Fire and forget — no queue needed
    setImmediate(() => executeScan(id, target, profile))

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

  // Delete a scan
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const { id } = req.params
    const [scan] = await sql`SELECT * FROM scans WHERE id = ${id}`
    if (!scan) return reply.code(404).send({ error: 'not found' })

    await sql`DELETE FROM findings WHERE scan_id = ${id}`
    await sql`DELETE FROM tool_results WHERE scan_id = ${id}`
    await sql`DELETE FROM scans WHERE id = ${id}`

    return { success: true }
  })
}

// This needs to be added inside scanRoutes - handled via index.ts instead
