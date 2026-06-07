import type { FastifyPluginAsync } from 'fastify'
import { pubsub } from '../lib/pubsub.js'

export const wsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ws/:scanId', { websocket: true }, (socket, req: any) => {
    const { scanId } = req.params as { scanId: string }

    const handler = (message: string) => {
      if (socket.readyState === 1) socket.send(message)
    }

    pubsub.subscribe(scanId, handler)

    socket.on('close', () => {
      pubsub.unsubscribe(scanId, handler)
    })
  })
}
