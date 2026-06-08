import { logger } from '@recon-nexus/logger'

export interface DorkResult {
  dork: string
  url: string
  title: string
  snippet: string
}

const DORKS = [
  'filetype:pdf',
  'filetype:xls OR filetype:xlsx',
  'filetype:sql',
  'filetype:env',
  'filetype:log',
  'inurl:admin',
  'inurl:login',
  'inurl:config',
  'inurl:backup',
  'inurl:api',
  'inurl:.git',
  'inurl:wp-admin',
  'inurl:phpmyadmin',
  '"password" OR "passwd" OR "credentials"',
  '"api_key" OR "api_secret" OR "access_token"',
  '"internal use only" OR "confidential"',
]

const HEADERS = {
  'User-Agent': 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'en-US,en;q=0.5',
}

function parseGoogleResults(html: string, dork: string): DorkResult[] {
  const results: DorkResult[] = []

  // Match Google result divs
  const linkRegex = /<a href="(https?:\/\/[^"]+)"[^>]*>/g
  const titleRegex = /<h3[^>]*>([^<]+)<\/h3>/g
  const snippetRegex = /<div[^>]*class="[^"]*VwiC3b[^"]*"[^>]*>([\s\S]*?)<\/div>/g

  const links: string[] = []
  const titles: string[] = []
  const snippets: string[] = []

  let m
  while ((m = linkRegex.exec(html)) !== null) {
    const url = m[1]
    if (!url.includes('google.com') && !url.includes('googleadservices') && url.startsWith('http')) {
      links.push(url)
    }
  }

  while ((m = titleRegex.exec(html)) !== null) {
    titles.push(m[1].replace(/<[^>]+>/g, '').trim())
  }

  while ((m = snippetRegex.exec(html)) !== null) {
    snippets.push(m[1].replace(/<[^>]+>/g, '').trim().slice(0, 200))
  }

  for (let i = 0; i < Math.min(links.length, 5); i++) {
    results.push({
      dork,
      url: links[i],
      title: titles[i] ?? '',
      snippet: snippets[i] ?? '',
    })
  }

  return results
}

async function runDork(target: string, dork: string): Promise<DorkResult[]> {
  const query = `site:${target} ${dork}`
  const url = `https://www.google.com/search?q=${encodeURIComponent(query)}&num=5&hl=en`

  try {
    const res = await fetch(url, {
      headers: HEADERS,
      signal: AbortSignal.timeout(10000),
    })

    if (!res.ok) {
      logger.warn({ dork, status: res.status }, 'Google dork request failed')
      return []
    }

    const html = await res.text()

    // Check if blocked
    if (html.includes('unusual traffic') || html.includes('CAPTCHA')) {
      logger.warn({ dork }, 'Google blocked — rate limited')
      return []
    }

    return parseGoogleResults(html, dork)
  } catch (err: any) {
    logger.warn({ dork, err: err.message }, 'Dork failed')
    return []
  }
}

export async function runGoogleDorks(target: string, onResult: (r: DorkResult) => void): Promise<void> {
  logger.info({ target }, 'Starting Google dorking')

  for (const dork of DORKS) {
    const results = await runDork(target, dork)
    results.forEach(onResult)

    // Respectful delay between dorks — avoid rate limiting
    await new Promise(r => setTimeout(r, 3000))
  }

  logger.info({ target, dorks: DORKS.length }, 'Google dorking complete')
}
