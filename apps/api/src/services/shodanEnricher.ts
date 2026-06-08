import { logger } from '@recon-nexus/logger'

export interface ShodanResult {
  ip: string
  org: string
  isp: string
  country: string
  city: string
  ports: number[]
  vulns: string[]
  hostnames: string[]
  os: string | null
  tags: string[]
  banners: { port: number; transport: string; product: string; version: string }[]
}

export async function enrichWithShodan(ip: string, apiKey: string): Promise<ShodanResult | null> {
  if (!apiKey) {
    logger.warn('No Shodan API key — skipping enrichment')
    return null
  }

  try {
    const res = await fetch(`https://api.shodan.io/shodan/host/${ip}?key=${apiKey}`, {
      signal: AbortSignal.timeout(10000),
    })

    if (res.status === 404) return null
    if (res.status === 401) {
      logger.warn('Shodan API key invalid')
      return null
    }
    if (!res.ok) return null

    const data = await res.json() as any

    const banners = (data.data ?? []).map((d: any) => ({
      port: d.port,
      transport: d.transport ?? 'tcp',
      product: d.product ?? '',
      version: d.version ?? '',
    })).slice(0, 10)

    return {
      ip,
      org: data.org ?? '',
      isp: data.isp ?? '',
      country: data.country_name ?? '',
      city: data.city ?? '',
      ports: data.ports ?? [],
      vulns: Object.keys(data.vulns ?? {}),
      hostnames: data.hostnames ?? [],
      os: data.os ?? null,
      tags: data.tags ?? [],
      banners,
    }
  } catch (err: any) {
    logger.warn({ ip, err: err.message }, 'Shodan enrichment failed')
    return null
  }
}
