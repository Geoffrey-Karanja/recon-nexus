import { logger } from '@recon-nexus/logger'

export interface GithubResult {
  repo: string
  file: string
  url: string
  snippet: string
  dork: string
}

const DORKS = [
  'password',
  'secret',
  'api_key',
  'api_secret',
  'access_token',
  'private_key',
  'credentials',
  'aws_access_key',
  'database_url',
  'smtp_password',
]

async function searchGithub(target: string, dork: string, token: string): Promise<GithubResult[]> {
  const query = `${dork} "${target}"`
  const url = `https://api.github.com/search/code?q=${encodeURIComponent(query)}&per_page=5`

  try {
    const res = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'X-GitHub-Api-Version': '2022-11-28',
      },
      signal: AbortSignal.timeout(10000),
    })

    if (res.status === 403) {
      logger.warn({ dork }, 'GitHub rate limited')
      return []
    }

    if (!res.ok) return []

    const data = await res.json() as {
      items: {
        name: string
        path: string
        html_url: string
        repository: { full_name: string }
        text_matches?: { fragment: string }[]
      }[]
    }

    return (data.items ?? []).map(item => ({
      repo: item.repository.full_name,
      file: item.path,
      url: item.html_url,
      snippet: item.text_matches?.[0]?.fragment ?? '',
      dork,
    }))
  } catch (err: any) {
    logger.warn({ dork, err: err.message }, 'GitHub dork failed')
    return []
  }
}

export async function runGithubDorks(
  target: string,
  token: string,
  onResult: (r: GithubResult) => void
): Promise<void> {
  if (!token) {
    logger.warn('No GitHub token — skipping GitHub dorking')
    return
  }

  logger.info({ target }, 'Starting GitHub dorking')

  for (const dork of DORKS) {
    const results = await searchGithub(target, dork, token)
    results.forEach(onResult)
    // GitHub rate limit — 10 requests/min for search
    await new Promise(r => setTimeout(r, 6000))
  }

  logger.info({ target }, 'GitHub dorking complete')
}
