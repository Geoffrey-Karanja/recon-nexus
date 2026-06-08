import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'

// Single admin user — change these before deploying
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'recon2024', 10)

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Login
  app.post<{ Body: { username: string; password: string } }>('/login', async (req, reply) => {
    const { username, password } = req.body

    if (username !== ADMIN_USERNAME) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
    if (!valid) {
      return reply.code(401).send({ error: 'Invalid credentials' })
    }

    const token = app.jwt.sign(
      { username, role: 'admin' },
      { expiresIn: '24h' }
    )

    reply.setCookie('token', token, {
      httpOnly: true,
      secure: false, // set to true in production with HTTPS
      sameSite: 'lax',
      maxAge: 86400,
      path: '/',
    })

    return { success: true, token }
  })

  // Logout
  app.post('/logout', async (req, reply) => {
    reply.clearCookie('token', { path: '/' })
    return { success: true }
  })

  // Me — verify token
  app.get('/me', async (req, reply) => {
    try {
      await req.jwtVerify()
      return { user: (req as any).user }
    } catch {
      return reply.code(401).send({ error: 'Unauthorized' })
    }
  })
}
