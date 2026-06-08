import { logger } from '@recon-nexus/logger'

interface NvdVuln {
  cve: {
    id: string
    descriptions: { lang: string; value: string }[]
    metrics?: {
      cvssMetricV31?: { cvssData: { baseScore: number; baseSeverity: string } }[]
      cvssMetricV2?: { cvssData: { baseScore: number } }[]
    }
    references: { url: string }[]
  }
}

interface CveResult {
  id: string
  description: string
  score: number
  severity: string
  url: string
}

export async function lookupCves(service: string, version: string): Promise<CveResult[]> {
  if (!service || !version || version === 'unknown') return []

  const keyword = `${service} ${version}`.trim()

  try {
    const url = `https://services.nvd.nist.gov/rest/json/cves/2.0?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=5`
    const res = await fetch(url, {
      signal: AbortSignal.timeout(10000),
      headers: { 'Accept': 'application/json' }
    })

    if (!res.ok) return []

    const data = await res.json() as { vulnerabilities: NvdVuln[] }
    if (!data.vulnerabilities?.length) return []

    return data.vulnerabilities.map(v => {
      const cve = v.cve
      const desc = cve.descriptions.find(d => d.lang === 'en')?.value ?? 'No description'
      const v31 = cve.metrics?.cvssMetricV31?.[0]?.cvssData
      const v2 = cve.metrics?.cvssMetricV2?.[0]?.cvssData
      const score = v31?.baseScore ?? v2?.baseScore ?? 0
      const severity = v31?.baseSeverity ?? (score >= 7 ? 'HIGH' : score >= 4 ? 'MEDIUM' : 'LOW')
      const url = cve.references?.[0]?.url ?? `https://nvd.nist.gov/vuln/detail/${cve.id}`

      return { id: cve.id, description: desc.slice(0, 200), score, severity: severity.toLowerCase(), url }
    }).filter(c => c.score > 0)
  } catch (err: any) {
    logger.warn({ keyword, err: err.message }, 'CVE lookup failed')
    return []
  }
}

export function parseNmapService(line: string): { service: string; version: string } | null {
  // Match: "443/tcp   open  https   nginx 1.18.0"
  const match = line.match(/^\d+\/\w+\s+open\s+\S+\s+(\S+)\s+([\d.]+)/)
  if (!match) return null
  return { service: match[1], version: match[2] }
}
