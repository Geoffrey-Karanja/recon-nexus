import 'dotenv/config'
import sql from '@recon-nexus/db'
import { logger } from '@recon-nexus/logger'

await sql`
  CREATE TABLE IF NOT EXISTS scans (
    id          UUID PRIMARY KEY,
    target      TEXT NOT NULL,
    profile     TEXT NOT NULL DEFAULT 'full',
    status      TEXT NOT NULL DEFAULT 'queued',
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS tool_results (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id     UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    tool        TEXT NOT NULL,
    stage       TEXT NOT NULL,
    status      TEXT NOT NULL DEFAULT 'queued',
    output      TEXT[] NOT NULL DEFAULT '{}',
    error       TEXT,
    started_at  TIMESTAMPTZ,
    finished_at TIMESTAMPTZ
  )
`

await sql`
  CREATE TABLE IF NOT EXISTS findings (
    id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scan_id       UUID NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
    type          TEXT NOT NULL,
    value         TEXT NOT NULL,
    severity      TEXT NOT NULL DEFAULT 'info',
    metadata      JSONB,
    discovered_by TEXT NOT NULL,
    discovered_at TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`

await sql`CREATE INDEX IF NOT EXISTS findings_scan_id_idx ON findings(scan_id)`
await sql`CREATE INDEX IF NOT EXISTS tool_results_scan_id_idx ON tool_results(scan_id)`

logger.info('Migrations complete')
await sql.end()

await sql`
  CREATE TABLE IF NOT EXISTS users (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username    TEXT NOT NULL UNIQUE,
    password    TEXT NOT NULL,
    role        TEXT NOT NULL DEFAULT 'user',
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
  )
`

logger.info('Users table ready')
