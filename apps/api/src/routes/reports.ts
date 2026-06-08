import type { FastifyPluginAsync } from 'fastify'
import sql from '@recon-nexus/db'
import { generateReport } from '../services/reportGenerator.js'

export const reportRoutes: FastifyPluginAsync = async (app) => {
  app.get<{ Params: { id: string } }>('/:id/report', async (req, reply) => {
    const { id } = req.params

    const [scan] = await sql`SELECT * FROM scans WHERE id = ${id}`
    if (!scan) return reply.code(404).send({ error: 'scan not found' })

    const findings = await sql`SELECT * FROM findings WHERE scan_id = ${id} ORDER BY severity DESC`
    const tools = await sql`SELECT * FROM tool_results WHERE scan_id = ${id}`

    const pdf = await generateReport(scan as any, findings as any, tools as any)

    reply
      .header('Content-Type', 'application/pdf')
      .header('Content-Disposition', `attachment; filename="recon-${scan.target}-${Date.now()}.pdf"`)
      .send(pdf)
  })
}
