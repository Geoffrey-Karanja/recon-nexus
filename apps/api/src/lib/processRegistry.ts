import { ChildProcess } from 'child_process'

const registry = new Map<string, ChildProcess[]>()

export const processRegistry = {
  register(scanId: string, proc: ChildProcess) {
    if (!registry.has(scanId)) registry.set(scanId, [])
    registry.get(scanId)!.push(proc)
  },

  kill(scanId: string) {
    const procs = registry.get(scanId) ?? []
    procs.forEach(p => {
      try { p.kill('SIGTERM') } catch {}
    })
    registry.delete(scanId)
  },

  cleanup(scanId: string) {
    registry.delete(scanId)
  }
}
