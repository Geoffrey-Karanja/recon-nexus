import 'dotenv/config'
import { Worker, Job } from 'bullmq'
import { redisConnection } from '../lib/redis.js'
import { pubsub } from '../lib/pubsub.js'
import sql from '@recon-nexus/db'
import { logger } from '@recon-nexus/logger'
import { spawn } from 'child_process'
import { processRegistry } from '../lib/processRegistry.js'
import geoip from 'geoip-lite'
import { randomUUID } from 'crypto'

interface ScanJob {
  scanId: string
  target: string
  profile: 'passive' | 'full' | 'custom'
}

function runTool(
  tool: string,
  args: string[],
  scanId: string,
  toolName: string,
  onLine: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(tool, args, { shell: false })
    processRegistry.register(scanId, proc)

    proc.stdout.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      lines.forEach(onLine)
    })

    proc.stderr.on('data', (data: Buffer) => {
      const lines = data.toString().split('\n').filter(Boolean)
      lines.forEach(onLine)
    })

    proc.on('close', (code) => {
      if (code === 0 || code === 1) resolve()
      else reject(new Error(`${toolName} exited with code ${code}`))
    })

    proc.on('error', reject)
  })
}

async function updateToolStatus(
  scanId: string,
  tool: string,
  status: string,
  output: string[],
  error?: string
) {
  await sql`
    UPDATE tool_results SET
      status = ${status},
      output = ${sql.array(output)},
      error = ${error ?? null},
      finished_at = ${status === 'done' || status === 'error' ? new Date().toISOString() : null}
    WHERE scan_id = ${scanId} AND tool = ${tool}
  `
}

async function saveFinding(
  scanId: string,
  type: string,
  value: string,
  discoveredBy: string,
  severity = 'info',
  metadata: Record<string, unknown> = {}
) {
  const trimmed = value.trim()
  if (!trimmed) return

  await sql`
    INSERT INTO findings (id, scan_id, type, value, severity, metadata, discovered_by, discovered_at)
    VALUES (${randomUUID()}, ${scanId}, ${type}, ${trimmed}, ${severity}, ${JSON.stringify(metadata)}, ${discoveredBy}, now())
    ON CONFLICT DO NOTHING
  `

  pubsub.publish(scanId, {
    type: 'finding:new',
    scanId,
    payload: { type, value: trimmed, severity, discoveredBy },
  })
}

async function runPassive(scanId: string, target: string) {
  // --- WHOIS ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'whois', 'passive', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'whois' } })

  const whoisOutput: string[] = []
  try {
    await runTool('whois', [target], scanId, 'whois', (line) => {
      whoisOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'whois', line } })
    })
    await updateToolStatus(scanId, 'whois', 'done', whoisOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'whois' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'whois', 'error', whoisOutput, err.message)
  }

  // --- SUBFINDER ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'subfinder', 'passive', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'subfinder' } })

  const subfinderOutput: string[] = []
  try {
    await runTool('subfinder', ['-d', target, '-silent'], scanId, 'subfinder', async (line) => {
      subfinderOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'subfinder', line } })
      await saveFinding(scanId, 'subdomain', line, 'subfinder')
    })
    await updateToolStatus(scanId, 'subfinder', 'done', subfinderOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'subfinder' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'subfinder', 'error', subfinderOutput, err.message)
  }

  // --- THEHARVESTER ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'theHarvester', 'passive', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'theHarvester' } })

  const harvesterOutput: string[] = []
  try {
    await runTool('theHarvester', ['-d', target, '-b', 'google,bing,certspotter', '-l', '100'], scanId, 'theHarvester', async (line) => {
      harvesterOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'theHarvester', line } })

      if (line.includes('@')) await saveFinding(scanId, 'email', line, 'theHarvester')
      else if (line.match(/^[\w.-]+\.[a-z]{2,}$/)) await saveFinding(scanId, 'subdomain', line, 'theHarvester')
    })
    await updateToolStatus(scanId, 'theHarvester', 'done', harvesterOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'theHarvester' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'theHarvester', 'error', harvesterOutput, err.message)
  }
}

async function runActive(scanId: string, target: string) {
  // --- DNSX ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'dnsx', 'active', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'dnsx' } })

  const dnsxOutput: string[] = []
  try {
    await runTool('dnsx', ['-d', target, '-silent', '-a', '-resp'], scanId, 'dnsx', async (line) => {
      dnsxOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'dnsx', line } })
      const ipMatch = line.match(/\[(\d+\.\d+\.\d+\.\d+)\]/)
      if (ipMatch) {
        const ip = ipMatch[1]
        const geo = geoip.lookup(ip)
        const metadata: Record<string, unknown> = {}
        if (geo) {
          metadata.country = geo.country
          metadata.city = geo.city
          metadata.org = geo.org
          metadata.ll = geo.ll
        }
        await saveFinding(scanId, 'ip', ip, 'dnsx', 'info', metadata)
      }
    })
    await updateToolStatus(scanId, 'dnsx', 'done', dnsxOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'dnsx' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'dnsx', 'error', dnsxOutput, err.message)
  }

  // --- NMAP ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'nmap', 'active', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'nmap' } })

  const nmapOutput: string[] = []
  try {
    await runTool('nmap', ['-sV', '--top-ports', '1000', '-T4', '-oN', '-', target], scanId, 'nmap', async (line) => {
      nmapOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'nmap', line } })
      const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(\S+)/)
      if (portMatch) {
        await saveFinding(scanId, 'port', `${portMatch[1]}/${portMatch[2]}`, 'nmap', 'medium', { service: portMatch[3] })
      }
    })
    await updateToolStatus(scanId, 'nmap', 'done', nmapOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'nmap' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'nmap', 'error', nmapOutput, err.message)
  }

  // --- HTTPX ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'httpx', 'active', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'httpx' } })

  const httpxOutput: string[] = []
  try {
    await runTool('httpx', ['-u', target, '-silent', '-title', '-status-code', '-tech-detect'], scanId, 'httpx', async (line) => {
      httpxOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'httpx', line } })
      await saveFinding(scanId, 'technology', line, 'httpx')
    })
    await updateToolStatus(scanId, 'httpx', 'done', httpxOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'httpx' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'httpx', 'error', httpxOutput, err.message)
  }

  // --- WAFW00F ---
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'wafw00f', 'active', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'wafw00f' } })

  const wafOutput: string[] = []
  try {
    await runTool('wafw00f', [target], scanId, 'wafw00f', async (line) => {
      wafOutput.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'wafw00f', line } })
      if (line.toLowerCase().includes('is behind')) await saveFinding(scanId, 'waf', line, 'wafw00f', 'medium')
    })
    await updateToolStatus(scanId, 'wafw00f', 'done', wafOutput)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'wafw00f' } })
  } catch (err: any) {
    await updateToolStatus(scanId, 'wafw00f', 'error', wafOutput, err.message)
  }
}

const worker = new Worker<ScanJob>(
  'scans',
  async (job: Job<ScanJob>) => {
    const { scanId, target, profile } = job.data
    logger.info({ scanId, target, profile }, 'Starting scan')

    await sql`UPDATE scans SET status = 'running', updated_at = now() WHERE id = ${scanId}`
    pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { stage: 'passive' } })

    try {
      await runPassive(scanId, target)
    await fetchCrtSh(target, scanId)
    // await runAmass(target, scanId) -- disabled: too slow, use subfinder+crtsh
      if (profile === 'full') await runActive(scanId, target)

      await sql`UPDATE scans SET status = 'done', updated_at = now() WHERE id = ${scanId}`
      processRegistry.cleanup(scanId)
      processRegistry.cleanup(scanId)
      pubsub.publish(scanId, { type: 'scan:done', scanId, payload: {} })
      logger.info({ scanId }, 'Scan complete')
    } catch (err: any) {
      logger.error({ scanId, err: err.message }, 'Scan failed')
      await sql`UPDATE scans SET status = 'error', updated_at = now() WHERE id = ${scanId}`
    }
  },
  { connection: redisConnection, concurrency: 2 }
)

worker.on('failed', (job, err) => {
  logger.error({ jobId: job?.id, err: err.message }, 'Job failed')
})

logger.info('Scan worker started')

async function fetchCrtSh(target: string, scanId: string) {
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'crtsh', 'passive', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'crtsh' } })

  const output: string[] = []
  try {
    const res = await fetch(`https://crt.sh/?q=%25.${target}&output=json`, { signal: AbortSignal.timeout(15000) })
    if (!res.ok) throw new Error(`crt.sh returned ${res.status}`)
    const text = await res.text()
    let data: { name_value: string }[] = []
    try { data = JSON.parse(text) } catch { throw new Error('crt.sh returned invalid JSON') }
    const seen = new Set<string>()

    for (const entry of data) {
      const names = entry.name_value.split('\n')
      for (const name of names) {
        const clean = name.trim().replace(/^\*\./, '')
        if (!seen.has(clean) && clean.endsWith(target) && clean !== target) {
          seen.add(clean)
          output.push(clean)
          pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'crtsh', line: clean } })
          await saveFinding(scanId, 'subdomain', clean, 'crtsh')
        }
      }
    }

    await updateToolStatus(scanId, 'crtsh', 'done', output)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'crtsh' } })
    logger.info({ scanId, count: seen.size }, 'crt.sh done')
  } catch (err: any) {
    await updateToolStatus(scanId, 'crtsh', 'error', output, err.message)
    pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool: 'crtsh', error: err.message } })
  }
}

async function runAmass(target: string, scanId: string) {
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'amass', 'passive', 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'amass' } })

  const output: string[] = []
  try {
    await runTool('amass', ['enum', '-passive', '-d', target, '-timeout', '2'], scanId, 'amass', async (line) => {
      output.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'amass', line } })
      const subMatch = line.match(/[\w.-]+\.[a-z]{2,}/)
      if (subMatch && subMatch[0].endsWith(target) && subMatch[0] !== target) {
        await saveFinding(scanId, 'subdomain', subMatch[0], 'amass')
      }
    })
    await updateToolStatus(scanId, 'amass', 'done', output)
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'amass' } })
    logger.info({ scanId }, 'amass done')
  } catch (err: any) {
    await updateToolStatus(scanId, 'amass', 'error', output, err.message)
    pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool: 'amass', error: err.message } })
  }
}
