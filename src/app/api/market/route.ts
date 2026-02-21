import { type NextRequest, NextResponse } from 'next/server'

import { parseMarketFilters } from '@/lib/market/filters'
import { getMarketCategories } from '@/lib/market/query'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: NextRequest) {
  try {
    const filters = parseMarketFilters(request.nextUrl.searchParams)
    const categories = await getMarketCategories(filters)

    return NextResponse.json({
      generated_at: new Date().toISOString(),
      filters_applied: filters,
      categories,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown market API error'

    return NextResponse.json(
      {
        ok: false,
        error: message,
      },
      { status: 500 },
    )
  }
}
