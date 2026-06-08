import puppeteer from 'puppeteer'
import type { Scan, Finding, ToolResult } from '@recon-nexus/types'

const severityColor: Record<string, string> = {
  info: '#6e7681',
  low: '#58d9f9',
  medium: '#e3b341',
  high: '#f0883e',
  critical: '#f85149',
}

const typeIcon: Record<string, string> = {
  subdomain: '⬡', ip: '◈', port: '⊞', email: '✉',
  technology: '⚙', waf: '⛨', cve: '⚠',
}

function buildHtml(scan: Scan, findings: Finding[], tools: ToolResult[]): string {
  const byType = findings.reduce<Record<string, Finding[]>>((acc, f) => {
    acc[f.type] = acc[f.type] ?? []
    acc[f.type].push(f)
    return acc
  }, {})

  const severityCounts = findings.reduce<Record<string, number>>((acc, f) => {
    acc[f.severity] = (acc[f.severity] ?? 0) + 1
    return acc
  }, {})

  const toolOrder = ['whois', 'subfinder', 'theHarvester', 'crtsh', 'google', 'github', 'amass', 'dnsx', 'nmap', 'httpx', 'wafw00f']
  const sortedTools = [...tools].sort((a, b) => {
    const ai = toolOrder.indexOf(a.tool)
    const bi = toolOrder.indexOf(b.tool)
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi)
  })
  const toolRows = sortedTools.map(t => `
    <tr>
      <td style="font-family:monospace;padding:8px 12px;border-bottom:1px solid #21262d;color:#c9d1d9">${t.tool}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;text-transform:uppercase;font-size:11px;color:${
        t.status === 'done' ? '#39d353' : t.status === 'error' ? '#f85149' : '#e3b341'
      }">${t.status}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;color:#6e7681;font-size:12px">${t.stage}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;color:#6e7681;font-size:12px">${t.output?.length ?? 0} lines</td>
    </tr>
  `).join('')

  const findingRows = findings.map(f => `
    <tr>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-size:16px;text-align:center">${typeIcon[f.type] ?? '·'}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d">
        <span style="font-size:10px;padding:2px 8px;border-radius:3px;border:1px solid ${severityColor[f.severity]};color:${severityColor[f.severity]}">${f.type.toUpperCase()}</span>
      </td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-family:monospace;font-size:12px;color:#f0f6fc">${f.value}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-size:11px;color:${severityColor[f.severity]};text-transform:uppercase">${f.severity}</td>
      <td style="padding:8px 12px;border-bottom:1px solid #21262d;font-size:11px;color:#6e7681;font-family:monospace">${f.discovered_by}</td>
    </tr>
  `).join('')

  const statCards = Object.entries(byType).map(([type, arr]) => `
    <div style="background:#161b22;border:1px solid #21262d;border-radius:8px;padding:16px 20px;min-width:120px">
      <div style="font-size:24px;font-weight:700;color:#f0f6fc">${arr.length}</div>
      <div style="font-size:11px;color:#6e7681;margin-top:4px;text-transform:uppercase;letter-spacing:1px">${type}s</div>
    </div>
  `).join('')

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<link href="https://fonts.googleapis.com/css2?family=Share+Tech+Mono&family=Rajdhani:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: #080c10; color: #c9d1d9; font-family: 'Rajdhani', sans-serif; padding: 48px; }
  h1, h2, h3 { font-family: 'Rajdhani', sans-serif; }
  table { width: 100%; border-collapse: collapse; }
  .section { margin-bottom: 40px; }
  .section-title { font-family: monospace; font-size: 11px; color: #6e7681; letter-spacing: 2px; margin-bottom: 16px; padding-bottom: 8px; border-bottom: 1px solid #21262d; }
</style>
</head>
<body>

<!-- Header -->
<div style="display:flex;align-items:flex-start;justify-content:space-between;margin-bottom:48px;padding-bottom:24px;border-bottom:1px solid #21262d">
  <div>
    <div style="font-family:monospace;font-size:11px;color:#39d353;letter-spacing:3px;margin-bottom:8px">RECON_NEXUS // INTELLIGENCE REPORT</div>
    <h1 style="font-size:36px;font-weight:700;color:#f0f6fc;letter-spacing:1px">${scan.target}</h1>
    <div style="font-size:13px;color:#6e7681;margin-top:6px;font-family:monospace">
      SCAN ID: ${scan.id}<br/>
      PROFILE: ${scan.profile.toUpperCase()} &nbsp;·&nbsp;
      STATUS: <span style="color:${scan.status === 'done' ? '#39d353' : '#e3b341'}">${scan.status.toUpperCase()}</span><br/>
      INITIATED: ${new Date(scan.created_at).toUTCString()}
    </div>
  </div>
  <div style="text-align:right">
    <div style="width:60px;height:60px;border:2px solid #39d353;border-radius:50%;display:flex;align-items:center;justify-content:center;margin-left:auto">
      <div style="width:16px;height:16px;background:#39d353;border-radius:50%"></div>
    </div>
    <div style="font-family:monospace;font-size:10px;color:#6e7681;margin-top:8px">${new Date().toLocaleDateString()}</div>
  </div>
</div>

<!-- Summary Stats -->
<div class="section">
  <div class="section-title">// EXECUTIVE SUMMARY</div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:20px">
    <div style="background:#161b22;border:1px solid #39d353;border-radius:8px;padding:16px 20px;min-width:120px">
      <div style="font-size:32px;font-weight:700;color:#39d353">${findings.length}</div>
      <div style="font-size:11px;color:#6e7681;margin-top:4px;text-transform:uppercase;letter-spacing:1px">Total Findings</div>
    </div>
    ${Object.entries(severityCounts).map(([sev, count]) => `
    <div style="background:#161b22;border:1px solid ${severityColor[sev]};border-radius:8px;padding:16px 20px;min-width:120px">
      <div style="font-size:32px;font-weight:700;color:${severityColor[sev]}">${count}</div>
      <div style="font-size:11px;color:#6e7681;margin-top:4px;text-transform:uppercase;letter-spacing:1px">${sev}</div>
    </div>`).join('')}
  </div>
  <div style="display:flex;gap:12px;flex-wrap:wrap">${statCards}</div>
</div>

<!-- Tool Pipeline -->
<div class="section">
  <div class="section-title">// TOOL PIPELINE STATUS</div>
  <table>
    <thead>
      <tr style="background:#0d1117">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">TOOL</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">STATUS</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">STAGE</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">OUTPUT</th>
      </tr>
    </thead>
    <tbody>${toolRows}</tbody>
  </table>
</div>

<!-- Findings -->
<div class="section">
  <div class="section-title">// FINDINGS [${findings.length}]</div>
  <table>
    <thead>
      <tr style="background:#0d1117">
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400;width:40px"></th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">TYPE</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">VALUE</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">SEVERITY</th>
        <th style="padding:10px 12px;text-align:left;font-size:11px;color:#6e7681;letter-spacing:1px;font-weight:400">SOURCE</th>
      </tr>
    </thead>
    <tbody>${findingRows}</tbody>
  </table>
</div>

<!-- Footer -->
<div style="margin-top:48px;padding-top:24px;border-top:1px solid #21262d;display:flex;justify-content:space-between;align-items:center">
  <div style="font-family:monospace;font-size:10px;color:#6e7681">GENERATED BY RECON_NEXUS // ${new Date().toUTCString()}</div>
  <div style="font-family:monospace;font-size:10px;color:#39d353">CONFIDENTIAL — AUTHORIZED USE ONLY</div>
</div>

</body>
</html>`
}

export async function generateReport(scan: Scan, findings: Finding[], tools: ToolResult[]): Promise<Buffer> {
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  })

  try {
    const page = await browser.newPage()
    await page.setContent(buildHtml(scan, findings, tools), { waitUntil: 'networkidle0' })
    const pdf = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: { top: '0', bottom: '0', left: '0', right: '0' },
    })
    return Buffer.from(pdf)
  } finally {
    await browser.close()
  }
}
