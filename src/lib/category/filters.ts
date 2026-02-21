import { z } from 'zod'

import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'

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

const categoryTableParamsSchema = z.object({
  page: z.number().int().min(1),
  pageSize: z.number().int().min(10).max(200),
  sortBy: z.enum(['users', 'rating', 'rating_gap']),
  sortDir: z.enum(['asc', 'desc']),
})

export type CategoryTableParams = z.infer<typeof categoryTableParamsSchema>

export function parseCategoryTableParams(searchParams: URLSearchParams): CategoryTableParams {
  const pageRaw = parseNumber(searchParams.get('page'))
  const pageSizeRaw = parseNumber(searchParams.get('pageSize'))

  const page = pageRaw !== null && pageRaw >= 1 ? Math.floor(pageRaw) : 1

  let pageSize = pageSizeRaw !== null ? Math.floor(pageSizeRaw) : DEFAULT_TABLE_PAGE_SIZE

  if (!Number.isFinite(pageSize) || pageSize < 10) {
    pageSize = 10
  }

  if (pageSize > 200) {
    pageSize = 200
  }

  const sortByRaw = (searchParams.get('sortBy') ?? '').trim()
  const sortDirRaw = (searchParams.get('sortDir') ?? '').trim().toLowerCase()

  const sortBy = sortByRaw === 'rating' || sortByRaw === 'rating_gap' || sortByRaw === 'users' ? sortByRaw : 'users'

  const sortDir = sortDirRaw === 'asc' || sortDirRaw === 'desc' ? sortDirRaw : 'desc'

  return categoryTableParamsSchema.parse({
    page,
    pageSize,
    sortBy,
    sortDir,
  })
}
