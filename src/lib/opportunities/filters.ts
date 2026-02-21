import { z } from 'zod'

import {
  OPPORTUNITIES_DEFAULT_LIMIT,
  OPPORTUNITIES_DEFAULT_PAGE,
  OPPORTUNITIES_MAX_LIMIT,
  OPPORTUNITIES_MIN_LIMIT,
  OPPORTUNITIES_MIN_PAGE,
} from '@/lib/opportunities/constants'

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

const opportunitiesParamsSchema = z.object({
  page: z.number().int().min(OPPORTUNITIES_MIN_PAGE),
  limit: z.number().int().min(OPPORTUNITIES_MIN_LIMIT).max(OPPORTUNITIES_MAX_LIMIT),
  sortBy: z.enum(['score', 'users', 'rating_gap', 'competition_count']),
  sortDir: z.enum(['asc', 'desc']),
})

export type OpportunitiesParams = z.infer<typeof opportunitiesParamsSchema>

export function parseOpportunitiesParams(searchParams: URLSearchParams): OpportunitiesParams {
  const pageRaw = parseNumber(searchParams.get('page'))
  const limitRaw = parseNumber(searchParams.get('limit')) ?? parseNumber(searchParams.get('pageSize'))

  const page = pageRaw !== null && pageRaw >= OPPORTUNITIES_MIN_PAGE ? Math.floor(pageRaw) : OPPORTUNITIES_DEFAULT_PAGE
  let limit = limitRaw !== null ? Math.floor(limitRaw) : OPPORTUNITIES_DEFAULT_LIMIT

  if (!Number.isFinite(limit) || limit < OPPORTUNITIES_MIN_LIMIT) {
    limit = OPPORTUNITIES_MIN_LIMIT
  }

  if (limit > OPPORTUNITIES_MAX_LIMIT) {
    limit = OPPORTUNITIES_MAX_LIMIT
  }

  const sortByRaw = (searchParams.get('sortBy') ?? '').trim()
  const sortDirRaw = (searchParams.get('sortDir') ?? '').trim().toLowerCase()

  const sortBy =
    sortByRaw === 'users' || sortByRaw === 'rating_gap' || sortByRaw === 'competition_count' || sortByRaw === 'score'
      ? sortByRaw
      : 'score'

  const sortDir = sortDirRaw === 'asc' || sortDirRaw === 'desc' ? sortDirRaw : 'desc'

  return opportunitiesParamsSchema.parse({
    page,
    limit,
    sortBy,
    sortDir,
  })
}
