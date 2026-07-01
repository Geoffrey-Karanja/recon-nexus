import type { FastifyRequest, FastifyReply } from 'fastify'

export async function requireAuth(req: FastifyRequest, reply: FastifyReply) {
  try {
    const auth = req.headers.authorization
    if (auth?.startsWith('Bearer ')) {
      const token = auth.slice(7)
      ;(req as any).user = (req.server as any).jwt.verify(token)
    } else {
      await req.jwtVerify()
    }
  } catch {
    reply.code(401).send({ error: 'Unauthorized' })
  }
}
