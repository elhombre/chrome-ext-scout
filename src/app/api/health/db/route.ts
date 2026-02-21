import { NextResponse } from 'next/server'

import { checkDbConnection } from '@/lib/db'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const details = await checkDbConnection()

    if (!details) {
      return NextResponse.json(
        {
          ok: false,
          status: 'disconnected',
          error: 'DB check query returned no rows',
        },
        { status: 500 },
      )
    }

    return NextResponse.json({
      ok: true,
      status: 'connected',
      db: details,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown database error'

    return NextResponse.json(
      {
        ok: false,
        status: 'disconnected',
        error: message,
      },
      { status: 500 },
    )
  }
}
