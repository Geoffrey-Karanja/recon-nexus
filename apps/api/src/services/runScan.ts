import sql from '@recon-nexus/db'
import { pubsub } from '../lib/pubsub.js'
import { logger } from '@recon-nexus/logger'
import { processRegistry } from '../lib/processRegistry.js'
import { spawn } from 'child_process'
import { randomUUID } from 'crypto'
import geoip from 'geoip-lite'
import { withConcurrencyLimit } from '../lib/concurrency.js'
import { runGoogleDorks } from './googleDorker.js'
import { runGithubDorks } from './githubDorker.js'
import { enrichWithShodan } from './shodanEnricher.js'
import { lookupCves, parseNmapService } from './cveCorrelator.js'
import { screenshotUrl } from './screenshotter.js'

const TOOL_TIMEOUT_MS = 2 * 60 * 1000

function spawnTool(
  tool: string,
  args: string[],
  scanId: string,
  onLine: (line: string) => void
): Promise<void> {
  return new Promise((resolve, reject) => {
    const proc = spawn(tool, args, { shell: false })
    processRegistry.register(scanId, proc)

    const timer = setTimeout(() => {
      logger.warn({ tool, scanId }, 'Tool timed out — killing')
      try { proc.kill('SIGKILL') } catch {}
      resolve()
    }, TOOL_TIMEOUT_MS)

    proc.stdout.on('data', (d: Buffer) => d.toString().split('\n').filter(Boolean).forEach(onLine))
    proc.stderr.on('data', (d: Buffer) => d.toString().split('\n').filter(Boolean).forEach(onLine))
    proc.on('close', () => { clearTimeout(timer); resolve() })
    proc.on('error', (e) => { clearTimeout(timer); reject(e) })
  })
}

async function saveFinding(
  scanId: string, type: string, value: string,
  discoveredBy: string, severity = 'info',
  metadata: Record<string, unknown> = {}
) {
  const trimmed = value.trim()
  if (!trimmed) return
  await sql`
    INSERT INTO findings (id, scan_id, type, value, severity, metadata, discovered_by, discovered_at)
    VALUES (${randomUUID()}, ${scanId}, ${type}, ${trimmed}, ${severity}, ${JSON.stringify(metadata)}, ${discoveredBy}, now())
    ON CONFLICT DO NOTHING
  `
  pubsub.publish(scanId, { type: 'finding:new', scanId, payload: { type, value: trimmed, severity, discoveredBy } })
}

async function runTool(scanId: string, tool: string, stage: string, args: string[], onLine: (line: string) => Promise<void>) {
  await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, ${tool}, ${stage}, 'running', now())`
  pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool } })

  const output: string[] = []
  try {
    await spawnTool(tool, args, scanId, async (line) => {
      output.push(line)
      pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool, line } })
      await onLine(line)
    })
    await sql`UPDATE tool_results SET status = 'done', output = ${sql.array(output)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = ${tool}`
    pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool } })
  } catch (err: any) {
    await sql`UPDATE tool_results SET status = 'error', output = ${sql.array(output)}, error = ${err.message}, finished_at = now() WHERE scan_id = ${scanId} AND tool = ${tool}`
    pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool, error: err.message } })
  }
}

export async function executeScan(scanId: string, target: string, profile: string) {
  logger.info({ scanId, target, profile }, 'Scan started')
  await withConcurrencyLimit(async () => {
  await sql`UPDATE scans SET status = 'running', updated_at = now() WHERE id = ${scanId}`

  try {
    // PASSIVE STAGE
    await runTool(scanId, 'whois', 'passive', [target], async () => {})

    await runTool(scanId, 'subfinder', 'passive', ['-d', target, '-silent'], async (line) => {
      await saveFinding(scanId, 'subdomain', line, 'subfinder')
    })

    await runTool(scanId, 'theHarvester', 'passive', ['-d', target, '-b', 'google,bing,certspotter', '-l', '100'], async (line) => {
      if (line.includes('@')) await saveFinding(scanId, 'email', line, 'theHarvester')
      else if (line.match(/^[\w.-]+\.[a-z]{2,}(\.[a-z]{2,})?$/) && !line.includes(' ') && !line.startsWith('[')) await saveFinding(scanId, 'subdomain', line, 'theHarvester')
    })

    // crt.sh
    await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'crtsh', 'passive', 'running', now())`
    pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'crtsh' } })
    const crtOutput: string[] = []
    try {
      const res = await fetch(`https://crt.sh/?q=%25.${target}&output=json`, { signal: AbortSignal.timeout(15000) })
      if (res.ok) {
        const text = await res.text()
        const data: { name_value: string }[] = JSON.parse(text)
        const seen = new Set<string>()
        for (const entry of data) {
          for (const name of entry.name_value.split('\n')) {
            const clean = name.trim().replace(/^\*\./, '')
            if (!seen.has(clean) && (clean.endsWith('.' + target) || clean.endsWith(target)) && clean !== target) {
              seen.add(clean)
              crtOutput.push(clean)
              pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'crtsh', line: clean } })
              await saveFinding(scanId, 'subdomain', clean, 'crtsh')
            }
          }
        }
      }
      await sql`UPDATE tool_results SET status = 'done', output = ${sql.array(crtOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'crtsh'`
      pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'crtsh' } })
    } catch {
      await sql`UPDATE tool_results SET status = 'error', output = ${sql.array(crtOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'crtsh'`
      pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool: 'crtsh' } })
    }

    // Google Dorking
    await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'google', 'passive', 'running', now())`
    pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'google' } })
    const dorkOutput: string[] = []
    try {
      await runGoogleDorks(target, async (result) => {
        const line = `[${result.dork}] ${result.url}`
        dorkOutput.push(line)
        pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'google', line } })
        await saveFinding(scanId, 'technology', result.url, 'google-dork', 'medium', {
          dork: result.dork,
          title: result.title,
          snippet: result.snippet,
        })
      })
      await sql`UPDATE tool_results SET status = 'done', output = ${sql.array(dorkOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'google'`
      pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'google' } })
    } catch (err: any) {
      await sql`UPDATE tool_results SET status = 'error', output = ${sql.array(dorkOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'google'`
      pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool: 'google' } })
    }

    // GitHub Dorking
    const githubToken = process.env.GITHUB_TOKEN ?? ''
    await sql`INSERT INTO tool_results (scan_id, tool, stage, status, started_at) VALUES (${scanId}, 'github', 'passive', 'running', now())`
    pubsub.publish(scanId, { type: 'tool:start', scanId, payload: { tool: 'github' } })
    const githubOutput: string[] = []
    try {
      await runGithubDorks(target, githubToken, async (result) => {
        const line = `[${result.dork}] ${result.repo}/${result.file}`
        githubOutput.push(line)
        pubsub.publish(scanId, { type: 'tool:output', scanId, payload: { tool: 'github', line } })
        await saveFinding(scanId, 'technology', result.url, 'github-dork', 'high', {
          dork: result.dork,
          repo: result.repo,
          file: result.file,
          snippet: result.snippet,
        })
      })
      await sql`UPDATE tool_results SET status = 'done', output = ${sql.array(githubOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'github'`
      pubsub.publish(scanId, { type: 'tool:done', scanId, payload: { tool: 'github' } })
    } catch (err: any) {
      await sql`UPDATE tool_results SET status = 'error', output = ${sql.array(githubOutput)}, finished_at = now() WHERE scan_id = ${scanId} AND tool = 'github'`
      pubsub.publish(scanId, { type: 'tool:error', scanId, payload: { tool: 'github' } })
    }

    if (profile === 'full') {
      // ACTIVE STAGE
      await runTool(scanId, 'dnsx', 'active', ['-d', target, '-silent', '-a', '-resp'], async (line) => {
        const ipMatch = line.match(/\[(\d+\.\d+\.\d+\.\d+)\]/)
        if (ipMatch) {
          const ip = ipMatch[1]
          const geo = geoip.lookup(ip)
          const metadata: Record<string, unknown> = {}
          if (geo) { metadata.country = geo.country; metadata.city = geo.city; metadata.org = geo.org }
          await saveFinding(scanId, 'ip', ip, 'dnsx', 'info', metadata)
        }
      })

      // Shodan enrichment on discovered IPs
      const shodanKey = process.env.SHODAN_API_KEY ?? ''
      const ipFindings = await sql`SELECT value FROM findings WHERE scan_id = ${scanId} AND type = 'ip'`
      for (const ipRow of ipFindings) {
        const shodan = await enrichWithShodan(ipRow.value, shodanKey)
        if (shodan) {
          // Save Shodan ports as findings
          for (const port of shodan.ports) {
            await saveFinding(scanId, 'port', `${port}/tcp`, 'shodan', 'medium', { source: 'shodan' })
          }
          // Save Shodan vulns as CVE findings
          for (const vuln of shodan.vulns) {
            await saveFinding(scanId, 'cve', vuln, 'shodan', 'high', {
              ip: shodan.ip,
              org: shodan.org,
              source: 'shodan'
            })
          }
          // Save hostnames
          for (const hostname of shodan.hostnames) {
            await saveFinding(scanId, 'subdomain', hostname, 'shodan', 'info', {})
          }
          // Update IP finding with Shodan metadata
          await sql`
            UPDATE findings SET metadata = ${JSON.stringify({
              org: shodan.org,
              isp: shodan.isp,
              country: shodan.country,
              city: shodan.city,
              os: shodan.os,
              tags: shodan.tags,
              ports: shodan.ports,
              banners: shodan.banners,
              source: 'shodan'
            })} WHERE scan_id = ${scanId} AND type = 'ip' AND value = ${ipRow.value}
          `
          pubsub.publish(scanId, {
            type: 'finding:new', scanId,
            payload: { type: 'ip', value: ipRow.value, severity: 'info', discoveredBy: 'shodan', metadata: shodan }
          })
        }
        // Shodan rate limit — 1 req/sec on free tier
        await new Promise(r => setTimeout(r, 1100))
      }

      await runTool(scanId, 'nmap', 'active', ['-sV', '--top-ports', '1000', '-T4', '-oN', '-', target], async (line) => {
        const portMatch = line.match(/^(\d+)\/(tcp|udp)\s+open\s+(\S+)/)
        if (portMatch) await saveFinding(scanId, 'port', `${portMatch[1]}/${portMatch[2]}`, 'nmap', 'medium', { service: portMatch[3] })
      })

      // CVE correlation on nmap findings
      const nmapResults = await sql`SELECT output FROM tool_results WHERE scan_id = ${scanId} AND tool = 'nmap'`
      if (nmapResults[0]?.output?.length) {
        for (const line of nmapResults[0].output) {
          const parsed = parseNmapService(line)
          if (parsed) {
            const cves = await lookupCves(parsed.service, parsed.version)
            for (const cve of cves) {
              const severity = cve.score >= 9 ? 'critical' : cve.score >= 7 ? 'high' : cve.score >= 4 ? 'medium' : 'low'
              await saveFinding(scanId, 'cve', cve.id, 'nvd', severity, {
                description: cve.description,
                score: cve.score,
                service: parsed.service,
                version: parsed.version,
                url: cve.url
              })
            }
          }
        }
      }

      await runTool(scanId, 'httpx', 'active', ['-u', target, '-silent', '-title', '-status-code', '-tech-detect'], async (line) => {
        await saveFinding(scanId, 'technology', line, 'httpx')
      })

      // Screenshot live HTTP services
      const httpxResults = await sql`SELECT output FROM tool_results WHERE scan_id = ${scanId} AND tool = 'httpx'`
      if (httpxResults[0]?.output?.length) {
        for (const line of httpxResults[0].output.slice(0, 5)) {
          const urlMatch = line.match(/https?:\/\/[^\s]+/)
          if (urlMatch) {
            const filepath = await screenshotUrl(urlMatch[0], scanId)
            if (filepath) {
              await saveFinding(scanId, 'technology', urlMatch[0], 'screenshot', 'info', { screenshot: filepath })
            }
          }
        }
      }

      await runTool(scanId, 'wafw00f', 'active', [target], async (line) => {
        if (line.toLowerCase().includes('is behind')) await saveFinding(scanId, 'waf', line.replace(/\x1b\[[0-9;]*m/g, ''), 'wafw00f', 'medium')
      })
    }

    await sql`UPDATE scans SET status = 'done', updated_at = now() WHERE id = ${scanId}`
    pubsub.publish(scanId, { type: 'scan:done', scanId, payload: {} })
    processRegistry.cleanup(scanId)
    logger.info({ scanId }, 'Scan complete')
  } catch (err: any) {
    logger.error({ scanId, err: err.message }, 'Scan failed')
    await sql`UPDATE scans SET status = 'error', updated_at = now() WHERE id = ${scanId}`
  }
  }) // end withConcurrencyLimit
}
