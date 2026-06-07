type Handler = (message: string) => void

const subscribers = new Map<string, Set<Handler>>()

export const pubsub = {
  subscribe(channel: string, handler: Handler) {
    if (!subscribers.has(channel)) subscribers.set(channel, new Set())
    subscribers.get(channel)!.add(handler)
  },

  unsubscribe(channel: string, handler: Handler) {
    subscribers.get(channel)?.delete(handler)
  },

  publish(channel: string, message: unknown) {
    const payload = JSON.stringify(message)
    subscribers.get(channel)?.forEach((h) => h(payload))
  },
}
