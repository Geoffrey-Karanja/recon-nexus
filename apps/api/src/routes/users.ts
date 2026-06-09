import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import sql from '@recon-nexus/db'
import { requireAuth } from '../lib/authMiddleware.js'

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.addHook('preHandler', requireAuth)

  // List all users (admin only)
  app.get('/', async (req, reply) => {
    const user = (req as any).user
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })
    return sql`SELECT id, username, role, created_at FROM users ORDER BY created_at DESC`
  })

  // Create user (admin only)
  app.post<{ Body: { username: string; password: string; role: string } }>('/', async (req, reply) => {
    const user = (req as any).user
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })

    const { username, password, role = 'user' } = req.body
    if (!username || !password) return reply.code(400).send({ error: 'username and password required' })

    const hash = await bcrypt.hash(password, 10)
    try {
      const [created] = await sql`
        INSERT INTO users (username, password, role)
        VALUES (${username}, ${hash}, ${role})
        RETURNING id, username, role, created_at
      `
      return created
    } catch {
      return reply.code(409).send({ error: 'Username already exists' })
    }
  })

  // Delete user (admin only)
  app.delete<{ Params: { id: string } }>('/:id', async (req, reply) => {
    const user = (req as any).user
    if (user.role !== 'admin') return reply.code(403).send({ error: 'Forbidden' })
    await sql`DELETE FROM users WHERE id = ${req.params.id}`
    return { success: true }
  })

  // Change own password
  app.post<{ Body: { currentPassword: string; newPassword: string } }>('/change-password', async (req, reply) => {
    const user = (req as any).user
    const { currentPassword, newPassword } = req.body

    const [dbUser] = await sql`SELECT * FROM users WHERE username = ${user.username}`
    if (!dbUser) return reply.code(404).send({ error: 'User not found' })

    const valid = await bcrypt.compare(currentPassword, dbUser.password)
    if (!valid) return reply.code(401).send({ error: 'Current password incorrect' })

    const hash = await bcrypt.hash(newPassword, 10)
    await sql`UPDATE users SET password = ${hash} WHERE username = ${user.username}`
    return { success: true }
  })
}
