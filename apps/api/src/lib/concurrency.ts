const MAX_CONCURRENT = 2
let running = 0

export async function withConcurrencyLimit<T>(fn: () => Promise<T>): Promise<T> {
  while (running >= MAX_CONCURRENT) {
    await new Promise(r => setTimeout(r, 1000))
  }
  running++
  try {
    return await fn()
  } finally {
    running--
  }
}

export function getRunningCount() {
  return running
}
