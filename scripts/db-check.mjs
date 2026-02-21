import { Client } from 'pg'

const requiredEnv = ['PG_HOST', 'PG_USER', 'PG_PASSWORD', 'PG_DATABASE']

const missing = requiredEnv.filter(key => {
  const value = process.env[key]
  return !value || value.trim().length === 0
})

if (missing.length > 0) {
  console.error(`Missing required env vars: ${missing.join(', ')}`)
  process.exit(1)
}

const port = Number(process.env.PG_PORT ?? '5432')

if (!Number.isInteger(port) || port <= 0) {
  console.error('PG_PORT must be a positive integer')
  process.exit(1)
}

const client = new Client({
  host: process.env.PG_HOST,
  port,
  user: process.env.PG_USER,
  password: process.env.PG_PASSWORD,
  database: process.env.PG_DATABASE,
  ssl: process.env.PG_SSL === 'true' ? { rejectUnauthorized: false } : undefined,
  connectionTimeoutMillis: 5000,
})

try {
  await client.connect()
  const result = await client.query(
    "select current_database() as database, current_user as db_user, (now() at time zone 'utc')::text as utc_now",
  )

  console.log('Database connection: OK')
  console.log(`database=${result.rows[0].database}`)
  console.log(`db_user=${result.rows[0].db_user}`)
  console.log(`utc_now=${result.rows[0].utc_now}`)
} catch (error) {
  const message = error instanceof Error ? error.message : String(error)
  console.error(`Database connection failed: ${message}`)
  process.exitCode = 1
} finally {
  await client.end().catch(() => {})
}
