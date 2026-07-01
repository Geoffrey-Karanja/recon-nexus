import type { FastifyPluginAsync } from 'fastify'
import bcrypt from 'bcryptjs'
import sql from '@recon-nexus/db'

// Single admin user — change these before deploying
const ADMIN_USERNAME = process.env.ADMIN_USERNAME || 'admin'
const ADMIN_PASSWORD_HASH = process.env.ADMIN_PASSWORD_HASH || bcrypt.hashSync(process.env.ADMIN_PASSWORD || 'recon2024', 10)

export const authRoutes: FastifyPluginAsync = async (app) => {
  // Public register
  app.post<{ Body: { username: string; password: string } }>('/register', async (req, reply) => {
    const { username, password } = req.body
    if (!username || !password) return reply.code(400).send({ error: 'username and password required' })
    if (password.length < 6) return reply.code(400).send({ error: 'password must be at least 6 characters' })

    const hash = await bcrypt.hash(password, 10)
    try {
      const [user] = await sql`
        INSERT INTO users (username, password, role)
        VALUES (${username}, ${hash}, 'user')
        RETURNING id, username, role
      `
      const token = app.jwt.sign({ username: user.username, role: user.role }, { expiresIn: '24h' })
      return { success: true, token, user: { username: user.username, role: user.role } }
    } catch {
      return reply.code(409).send({ error: 'Username already taken' })
    }
  })

  // Login
  app.post<{ Body: { username: string; password: string } }>('/login', async (req, reply) => {
    const { username, password } = req.body

    // Check DB users first
    const [dbUser] = await sql`SELECT * FROM users WHERE username = ${username}`

    let role = 'user'
    if (dbUser) {
      const valid = await bcrypt.compare(password, dbUser.password)
      if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })
      role = dbUser.role
    } else {
      // Fall back to env admin
      if (username !== ADMIN_USERNAME) return reply.code(401).send({ error: 'Invalid credentials' })
      const valid = await bcrypt.compare(password, ADMIN_PASSWORD_HASH)
      if (!valid) return reply.code(401).send({ error: 'Invalid credentials' })
      role = 'admin'
    }

    const token = app.jwt.sign(
      { username, role },
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
