import puppeteer from 'puppeteer'
import { logger } from '@recon-nexus/logger'
import { mkdir } from 'fs/promises'
import { join } from 'path'

const SCREENSHOT_DIR = '/tmp/recon-nexus-screenshots'

export async function screenshotUrl(url: string, scanId: string): Promise<string | null> {
  try {
    await mkdir(`${SCREENSHOT_DIR}/${scanId}`, { recursive: true })

    const browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    })

    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.setDefaultNavigationTimeout(15000)

    await page.goto(url, { waitUntil: 'domcontentloaded' })

    const filename = url.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80) + '.png'
    const filepath = join(SCREENSHOT_DIR, scanId, filename)
    await page.screenshot({ path: filepath, fullPage: false })
    await browser.close()

    logger.info({ url, filepath }, 'Screenshot captured')
    return filepath
  } catch (err: any) {
    logger.warn({ url, err: err.message }, 'Screenshot failed')
    return null
  }
}
