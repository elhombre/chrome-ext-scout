import 'server-only'

import { z } from 'zod'

const envSchema = z.object({
  PG_HOST: z.string().min(1, 'PG_HOST is required'),
  PG_PORT: z.coerce.number().int().positive().default(5432),
  PG_USER: z.string().min(1, 'PG_USER is required'),
  PG_PASSWORD: z.string().min(1, 'PG_PASSWORD is required'),
  PG_DATABASE: z.string().min(1, 'PG_DATABASE is required'),
  PG_SSL: z.enum(['true', 'false']).optional(),
})

const parsedEnv = envSchema.safeParse({
  PG_HOST: process.env.PG_HOST,
  PG_PORT: process.env.PG_PORT ?? '5432',
  PG_USER: process.env.PG_USER,
  PG_PASSWORD: process.env.PG_PASSWORD,
  PG_DATABASE: process.env.PG_DATABASE,
  PG_SSL: process.env.PG_SSL,
})

if (!parsedEnv.success) {
  const details = parsedEnv.error.issues.map(issue => `${issue.path.join('.')}: ${issue.message}`).join('; ')

  throw new Error(`Invalid database environment configuration: ${details}`)
}

export const env = parsedEnv.data

export const useSsl = env.PG_SSL === 'true'
