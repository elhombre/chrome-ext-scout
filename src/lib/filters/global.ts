import { z } from 'zod'

function parseNumber(value: string | null) {
  if (value === null) {
    return null
  }

  const trimmed = value.trim()

  if (trimmed.length === 0) {
    return null
  }

  const parsed = Number(trimmed)

  return Number.isFinite(parsed) ? parsed : null
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

const globalFiltersSchema = z.object({
  minUsers: z.number().int().min(0),
  maxUsers: z.number().int().min(0).nullable(),
  ratingMin: z.number().min(0).max(5),
  ratingMax: z.number().min(0).max(5),
  excludeTopPct: z.number().int().min(0).max(50),
  lang: z.string(),
  extName: z.string(),
})

export type GlobalFilters = z.infer<typeof globalFiltersSchema>

export function parseGlobalFilters(searchParams: URLSearchParams): GlobalFilters {
  const minUsersRaw = parseNumber(searchParams.get('minUsers'))
  const maxUsersRaw = parseNumber(searchParams.get('maxUsers'))
  const ratingMinRaw = parseNumber(searchParams.get('ratingMin'))
  const ratingMaxRaw = parseNumber(searchParams.get('ratingMax'))
  const excludeTopPctRaw = parseNumber(searchParams.get('excludeTopPct'))

  const minUsers = minUsersRaw !== null && minUsersRaw >= 0 ? Math.floor(minUsersRaw) : 0

  let maxUsers = maxUsersRaw !== null && maxUsersRaw >= 0 ? Math.floor(maxUsersRaw) : null

  let ratingMin = ratingMinRaw !== null ? clamp(ratingMinRaw, 0, 5) : 0
  let ratingMax = ratingMaxRaw !== null ? clamp(ratingMaxRaw, 0, 5) : 5

  if (ratingMin > ratingMax) {
    ratingMin = 0
    ratingMax = 5
  }

  if (maxUsers !== null && maxUsers < minUsers) {
    maxUsers = null
  }

  const excludeTopPct =
    excludeTopPctRaw !== null && Number.isInteger(excludeTopPctRaw) ? clamp(excludeTopPctRaw, 0, 50) : 0

  const lang = (searchParams.get('lang') ?? '').trim()
  const extName = (searchParams.get('extName') ?? '').trim()

  return globalFiltersSchema.parse({
    minUsers,
    maxUsers,
    ratingMin,
    ratingMax,
    excludeTopPct,
    lang,
    extName,
  })
}
