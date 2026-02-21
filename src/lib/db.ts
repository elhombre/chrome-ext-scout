import 'server-only'

import { Kysely, PostgresDialect, sql } from 'kysely'
import { Pool } from 'pg'

import { env, useSsl } from '@/lib/env'

export type Database = Record<string, never>

let dbInstance: Kysely<Database> | undefined

function createPool() {
  return new Pool({
    host: env.PG_HOST,
    port: env.PG_PORT,
    user: env.PG_USER,
    password: env.PG_PASSWORD,
    database: env.PG_DATABASE,
    ssl: useSsl ? { rejectUnauthorized: false } : undefined,
    max: 10,
    idleTimeoutMillis: 30_000,
    connectionTimeoutMillis: 5_000,
  })
}

export function getDb() {
  if (!dbInstance) {
    dbInstance = new Kysely<Database>({
      dialect: new PostgresDialect({
        pool: createPool(),
      }),
    })
  }

  return dbInstance
}

export async function checkDbConnection() {
  const db = getDb()
  const result = await sql<{
    utc_now: string
    current_database: string
    current_user: string
  }>`
    select
      (now() at time zone 'utc')::text as utc_now,
      current_database() as current_database,
      current_user as current_user
  `.execute(db)

  return result.rows[0] ?? null
}
