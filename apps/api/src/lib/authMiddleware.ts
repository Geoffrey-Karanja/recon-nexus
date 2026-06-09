import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    // Support both cookie and Bearer token
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7)
      await req.jwtVerify({ onlyCookie: false })
      // manually verify if jwtVerify doesn't pick up header
      try {
        ;(req as any).user = (req.server as any).jwt.verify(token)
      } catch {}
    } else {
      await req.jwtVerify()
    }
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}
