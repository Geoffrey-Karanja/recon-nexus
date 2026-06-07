import postgres from 'postgres'

const connectionString = process.env.DATABASE_URL || 'postgres://postgres:postgres@localhost:5432/recon_nexus'

export const sql = postgres(connectionString, {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  transform: {
    bigint: String,
  },
})

export default sql
