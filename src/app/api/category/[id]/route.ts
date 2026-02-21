import { type NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { parseCategoryTableParams } from '@/lib/category/filters'
import { getCategoryExplorerData } from '@/lib/category/query'
import { parseGlobalFilters } from '@/lib/filters/global'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function parseCategoryId(rawId: string) {
  const parsed = Number(rawId)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    throw new Error('Invalid category id')
  }

  return parsed
}

type RouteContext = {
  params: Promise<{ id: string }>
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params
    const categoryId = parseCategoryId(id)
    const filters = parseGlobalFilters(request.nextUrl.searchParams)
    const tableParams = parseCategoryTableParams(request.nextUrl.searchParams)

    const payload = await getCategoryExplorerData({
      categoryId,
      filters,
      table: tableParams,
    })

    if (!payload) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Category not found',
        },
        { status: 404 },
      )
    }

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      filters_applied: filters,
      category: payload.category,
      scatter_points: payload.scatter_points,
      users_histogram: payload.users_histogram,
      rating_histogram: payload.rating_histogram,
      table: payload.table,
      table_applied: tableParams,
    })
  } catch (error) {
    if (error instanceof ZodError || (error instanceof Error && error.message === 'Invalid category id')) {
      return NextResponse.json(
        {
          ok: false,
          error: error instanceof Error ? error.message : 'Invalid request',
        },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown category API error'

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
