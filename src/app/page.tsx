'use client'

import { BarChart3, Compass, type LucideIcon, Radar, Route, Sigma } from 'lucide-react'
import Link from 'next/link'
import { useCallback, useEffect, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'

const moduleIcons: Record<string, LucideIcon> = {
  market: Compass,
  opportunities: Radar,
  scoringModel: Sigma,
}

const dbLastUpdatedAtRaw = process.env.NEXT_PUBLIC_DB_LAST_UPDATED_AT?.trim() ?? ''

function parseDateFromEnv(rawValue: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return null
  }

  const [year, month, day] = rawValue.split('-').map(Number)
  const parsedDate = new Date(year, month - 1, day)

  if (parsedDate.getFullYear() !== year || parsedDate.getMonth() !== month - 1 || parsedDate.getDate() !== day) {
    return null
  }

  return parsedDate
}

export default function Home() {
  const { language } = useI18n()
  const t = getMessages(language).home
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const [dbStatus, setDbStatus] = useState<'checking' | 'connected' | 'disconnected'>('checking')
  const [isDbStatusLoading, setIsDbStatusLoading] = useState(true)
  const dbLastUpdatedDate = parseDateFromEnv(dbLastUpdatedAtRaw)
  const formattedDbLastUpdated = dbLastUpdatedDate
    ? new Intl.DateTimeFormat(locale, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
      }).format(dbLastUpdatedDate)
    : null

  const checkDbStatus = useCallback(async (signal?: AbortSignal) => {
    setIsDbStatusLoading(true)

    try {
      const response = await fetch('/api/health/db', { cache: 'no-store', signal })
      const payload = (await response.json()) as { ok?: boolean; status?: string }
      const isConnected = response.ok && payload.ok === true && payload.status === 'connected'

      setDbStatus(isConnected ? 'connected' : 'disconnected')
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return
      }

      setDbStatus('disconnected')
    } finally {
      if (!signal?.aborted) {
        setIsDbStatusLoading(false)
      }
    }
  }, [])

  useEffect(() => {
    const controller = new AbortController()
    void checkDbStatus(controller.signal)

    return () => {
      controller.abort()
    }
  }, [checkDbStatus])

  const dbStatusLabel = isDbStatusLoading
    ? t.dbStatusChecking
    : dbStatus === 'connected'
      ? t.dbStatusConnected
      : dbStatus === 'disconnected'
        ? t.dbStatusDisconnected
        : t.dbStatusChecking

  const dbStatusClasses =
    dbStatus === 'connected'
      ? 'border-emerald-200 bg-emerald-100 text-emerald-700 dark:border-emerald-900/50 dark:bg-emerald-900/30 dark:text-emerald-300'
      : dbStatus === 'disconnected'
        ? 'border-rose-200 bg-rose-100 text-rose-700 dark:border-rose-900/50 dark:bg-rose-900/30 dark:text-rose-300'
        : 'border-amber-200 bg-amber-100 text-amber-700 dark:border-amber-900/50 dark:bg-amber-900/30 dark:text-amber-300'

  return (
    <div className="bg-[radial-gradient(circle_at_top,#dbeafe,transparent_55%),radial-gradient(circle_at_80%_20%,#bae6fd,transparent_40%),#f1f5f9] px-6 py-10 text-foreground dark:bg-[radial-gradient(circle_at_top,#1e293b,transparent_55%),radial-gradient(circle_at_80%_20%,#164e63,transparent_40%),#020617]">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card className="border-border/80 bg-card/80 backdrop-blur-sm">
          <CardHeader className="gap-4">
            <p className="inline-flex w-fit items-center rounded-full border border-sky-300 bg-sky-50 px-3 py-1 text-xs font-medium text-sky-700">
              {t.badge}
            </p>
            <CardTitle className="text-3xl leading-tight tracking-tight sm:text-4xl">{t.title}</CardTitle>
            <CardDescription className="text-muted-foreground max-w-3xl text-base leading-6">
              {t.subtitle}
            </CardDescription>
            <div className="flex flex-wrap gap-3">
              <Button asChild>
                <Link href="/market">{t.startMarket}</Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/opportunities">{t.goOpportunities}</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {t.modules.map(module => {
            const Icon = moduleIcons[module.id] ?? Compass

            return (
              <Card className="border-border/80 bg-card/85 backdrop-blur-sm" key={module.id}>
                <CardHeader className="space-y-3">
                  <div className="inline-flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                    <Icon className="size-4" />
                  </div>
                  <CardTitle className="text-lg">{module.title}</CardTitle>
                  <CardDescription className="text-muted-foreground min-h-12">{module.description}</CardDescription>
                </CardHeader>
                <CardContent>
                  <Button asChild className="w-full" variant={module.id === 'market' ? 'default' : 'outline'}>
                    <Link href={module.href}>{module.cta}</Link>
                  </Button>
                </CardContent>
              </Card>
            )
          })}
        </section>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-5">
          <Card className="border-border/80 bg-card/85 backdrop-blur-sm lg:col-span-3">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <Route className="size-4" />
              </div>
              <div>
                <CardTitle className="text-lg">{t.workflowTitle}</CardTitle>
                <CardDescription>{t.workflowDescription}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-3 text-sm">
              {t.workflow.map((step, index) => (
                <p key={step}>
                  <span className="text-foreground mr-2 font-semibold">{index + 1}.</span>
                  {step}
                </p>
              ))}
            </CardContent>
          </Card>

          <Card className="border-border/80 bg-card/85 backdrop-blur-sm lg:col-span-2">
            <CardHeader className="flex flex-row items-start gap-3">
              <div className="mt-0.5 inline-flex size-9 items-center justify-center rounded-lg bg-slate-900 text-white">
                <BarChart3 className="size-4" />
              </div>
              <div>
                <CardTitle className="text-lg">{t.notesTitle}</CardTitle>
                <CardDescription>{t.notesDescription}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="text-muted-foreground space-y-2 text-sm">
              <p className="flex flex-wrap items-center gap-2">
                {t.dbStatusLabel}:{' '}
                <span
                  className={`inline-flex items-center rounded-md border px-2 py-0.5 font-medium ${dbStatusClasses}`}
                >
                  {dbStatusLabel}
                </span>
                <Button
                  disabled={isDbStatusLoading}
                  onClick={() => {
                    void checkDbStatus()
                  }}
                  size="sm"
                  type="button"
                  variant="ghost"
                >
                  {t.dbStatusRecheck}
                </Button>
              </p>
              {formattedDbLastUpdated ? (
                <p>
                  {t.dbLastUpdatedLabel}: <span className="font-medium text-foreground">{formattedDbLastUpdated}</span>
                </p>
              ) : null}
              <p>{t.notesFooter}</p>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  )
}
