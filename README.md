# RECON NEXUS

> Self-hosted OSINT & reconnaissance orchestration platform for security professionals.

## 🌐 Live Demo
**[https://railcar-junction-dreamlike.ngrok-free.dev](https://railcar-junction-dreamlike.ngrok-free.dev)**

> Login with demo credentials: `admin` / `recon2024`

![License](https://img.shields.io/badge/license-MIT-green) ![Node](https://img.shields.io/badge/node-v24-blue) ![Platform](https://img.shields.io/badge/platform-Kali%20Linux-red)

---

## What It Does

RECON NEXUS takes a target domain and runs a structured intelligence pipeline — passive recon first, then active — streaming results live into a terminal-aesthetic dashboard with a force-directed attack surface graph.

### Pipeline

| Stage | Tools |
|---|---|
| Passive | whois, subfinder, theHarvester, crt.sh |
| Active | dnsx, nmap, httpx, wafw00f |
| Enrichment | GeoIP, CVE correlation (NIST NVD) |
| Capture | Puppeteer screenshots of live HTTP services |

### Features

- **Live WebSocket streaming** — findings and tool output appear in real time
- **D3.js force graph** — visual attack surface map (domain → subdomains → IPs → ports)
- **Findings feed** — typed, severity-badged, live-updating
- **PDF report export** — branded, client-ready intelligence report
- **Scan cancellation** — kill running scans mid-pipeline
- **CVE correlation** — auto-match discovered services to NIST NVD vulnerabilities
- **GeoIP enrichment** — country/city/org on every discovered IP
- **Screenshot capture** — visual recon of live HTTP services
- **Auth/login wall** — JWT-based authentication
- **Rate limiting** — prevent scan abuse
- **Concurrency control** — max 2 parallel scans

---

## Stack

| Layer | Tech |
|---|---|
| Frontend | React 18 + Vite 5 + D3.js + xterm.js |
| Backend | Fastify 4 (Node.js) |
| Database | PostgreSQL 17 |
| Cache | Redis 8 |
| PDF | Puppeteer |
| Monorepo | pnpm workspaces |

---

## Requirements

- Kali Linux (or any Debian-based distro)
- Node.js v20+
- PostgreSQL
- Redis
- Kali tools: `nmap`, `subfinder`, `dnsx`, `httpx`, `theHarvester`, `wafw00f`, `whois`

---

## Installation

```bash
# Clone
git clone https://github.com/Geoffrey-Karanja/recon-nexus.git
cd recon-nexus

# Install dependencies
pnpm install

# Configure environment
cp apps/api/.env.example apps/api/.env
# Edit .env with your DB credentials and JWT secret

# Setup database
cd apps/api
node --import tsx/esm src/lib/migrate.ts
cd ../..

# Start
cd apps/api && pnpm dev      # Terminal 1 - API
cd apps/web && pnpm dev      # Terminal 2 - Frontend
```

Open `http://localhost:5173` and login with your configured credentials.

---

## Environment Variables

```env
PORT=3001
DATABASE_URL=postgres://user:pass@localhost:5432/recon_nexus
REDIS_HOST=127.0.0.1
REDIS_PORT=6379
JWT_SECRET=your-secret-here
ADMIN_USERNAME=admin
ADMIN_PASSWORD=yourpassword
NODE_ENV=development
```

---

## Legal

This tool is intended for **authorized security testing only**. Only scan targets you have explicit permission to test. The author is not responsible for misuse.

---

## Author

**Geoffrey Karanja** — [@Geoffrey-Karanja](https://github.com/Geoffrey-Karanja)
