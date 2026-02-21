import { type NextRequest, NextResponse } from 'next/server'
import { ZodError } from 'zod'

import { parseGlobalFilters } from '@/lib/filters/global'
import { parseOpportunitiesParams } from '@/lib/opportunities/filters'
import { getOpportunitiesData } from '@/lib/opportunities/query'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const filters = parseGlobalFilters(request.nextUrl.searchParams)
    const params = parseOpportunitiesParams(request.nextUrl.searchParams)
    const data = await getOpportunitiesData({ filters, params })

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      filters_applied: filters,
      bubble_points: data.bubble_points,
      table: data.table,
      table_applied: params,
    })
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        {
          ok: false,
          error: 'Invalid query params',
        },
        { status: 400 },
      )
    }

    const message = error instanceof Error ? error.message : 'Unknown opportunities API error'

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
