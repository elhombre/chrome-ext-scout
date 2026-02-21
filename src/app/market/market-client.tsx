'use client'

import { CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { MarketCharts } from '@/app/market/market-charts'
import { type ActiveFilterChip, ActiveFilterChips } from '@/components/active-filter-chips'
import { FilterPanelCard } from '@/components/filter-panel-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { useI18n } from '@/lib/i18n'
import type { MarketApiResponse } from '@/lib/market/types'
import { getMessages } from '@/lib/messages'

type MarketFormState = {
  minUsers: string
  maxUsers: string
  ratingMin: string
  ratingMax: string
  excludeTopPct: string
  lang: string
  extName: string
}

const defaultFormState: MarketFormState = {
  minUsers: '',
  maxUsers: '',
  ratingMin: '',
  ratingMax: '',
  excludeTopPct: '',
  lang: '',
  extName: '',
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'

function readFormState(searchParams: URLSearchParams): MarketFormState {
  return {
    minUsers: searchParams.get('minUsers') ?? '',
    maxUsers: searchParams.get('maxUsers') ?? '',
    ratingMin: searchParams.get('ratingMin') ?? '',
    ratingMax: searchParams.get('ratingMax') ?? '',
    excludeTopPct: searchParams.get('excludeTopPct') ?? '',
    lang: searchParams.get('lang') ?? '',
    extName: searchParams.get('extName') ?? '',
  }
}

function toSearchParams(state: MarketFormState) {
  const params = new URLSearchParams()

  if (state.minUsers.trim()) {
    params.set('minUsers', state.minUsers.trim())
  }

  if (state.maxUsers.trim()) {
    params.set('maxUsers', state.maxUsers.trim())
  }

  if (state.ratingMin.trim()) {
    params.set('ratingMin', state.ratingMin.trim())
  }

  if (state.ratingMax.trim()) {
    params.set('ratingMax', state.ratingMax.trim())
  }

  if (state.excludeTopPct.trim()) {
    params.set('excludeTopPct', state.excludeTopPct.trim())
  }

  if (state.lang.trim()) {
    params.set('lang', state.lang.trim())
  }

  if (state.extName.trim()) {
    params.set('extName', state.extName.trim())
  }

  return params
}

function formatInt(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(Math.round(value))
}

function formatDecimal(value: number, digits: number) {
  return value.toFixed(digits)
}

function InfoHint({ title, content }: { title: string; content: ReactNode }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button aria-label={title} size="icon-xs" type="button" variant="ghost">
          <CircleHelp aria-hidden="true" className="size-4" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-96 max-w-[min(90vw,24rem)] whitespace-normal break-words [overflow-wrap:anywhere] text-xs leading-5"
      >
        {content}
      </PopoverContent>
    </Popover>
  )
}

export function MarketClient() {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const { language } = useI18n()
  const t = getMessages(language).market.client
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'

  const [formState, setFormState] = useState<MarketFormState>(() => readFormState(new URLSearchParams(queryString)))
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<MarketApiResponse | null>(null)

  useEffect(() => {
    setFormState(readFormState(new URLSearchParams(queryString)))
  }, [queryString])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setState('loading')
      setError(null)

      try {
        const response = await fetch(`/api/market${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        const json = (await response.json()) as MarketApiResponse & { error?: string }

        if (!response.ok) {
          throw new Error(json.error ?? `Request failed: ${response.status}`)
        }

        setPayload(json)
        setState('success')
      } catch (loadError) {
        if (controller.signal.aborted) {
          return
        }

        const message = loadError instanceof Error ? loadError.message : t.errorPrefix
        setError(message)
        setState('error')
      }
    }

    void load()

    return () => controller.abort()
  }, [queryString, t.errorPrefix])

  const summary = useMemo(() => {
    if (!payload) {
      return null
    }

    return {
      categories: payload.categories.length,
      totalExtensions: payload.categories.reduce((acc, category) => acc + category.total_extensions, 0),
      totalUsers: payload.categories.reduce((acc, category) => acc + category.total_users, 0),
    }
  }, [payload])

  function onFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const nextParams = toSearchParams(formState)
    const nextQuery = nextParams.toString()
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  function onFilterReset() {
    setFormState(defaultFormState)
    router.push(pathname)
  }

  function onClearFilter(filterKey: keyof MarketFormState) {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete(filterKey)
    const nextQuery = nextParams.toString()
    setFormState(readFormState(nextParams))
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  const activeFilters = useMemo<ActiveFilterChip[]>(() => {
    const params = new URLSearchParams(queryString)

    const values: ActiveFilterChip[] = [
      {
        key: 'minUsers',
        label: t.minUsers,
        value: (params.get('minUsers') ?? '').trim(),
      },
      {
        key: 'maxUsers',
        label: t.maxUsers,
        value: (params.get('maxUsers') ?? '').trim(),
      },
      {
        key: 'ratingMin',
        label: t.ratingMin,
        value: (params.get('ratingMin') ?? '').trim(),
      },
      {
        key: 'ratingMax',
        label: t.ratingMax,
        value: (params.get('ratingMax') ?? '').trim(),
      },
      {
        key: 'excludeTopPct',
        label: t.excludeTop,
        value: (params.get('excludeTopPct') ?? '').trim(),
      },
      {
        key: 'lang',
        label: t.languageContains,
        value: (params.get('lang') ?? '').trim(),
      },
      {
        key: 'extName',
        label: t.extensionNameContains,
        value: (params.get('extName') ?? '').trim(),
      },
    ]

    return values.filter(item => item.value.length > 0)
  }, [queryString, t])

  function openCategory(categoryId: number) {
    const target = queryString ? `/category/${categoryId}?${queryString}` : `/category/${categoryId}`
    router.push(target)
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl tracking-tight">{t.pageTitle}</CardTitle>
              <CardDescription>{t.pageDescription}</CardDescription>
            </div>
            <Button asChild variant="outline">
              <Link href={queryString ? `/opportunities?${queryString}` : '/opportunities'}>{t.openOpportunities}</Link>
            </Button>
          </CardHeader>
        </Card>

        <FilterPanelCard pinLabel={t.pinPanel} unpinLabel={t.unpinPanel}>
          <form className="space-y-4" onSubmit={onFilterSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-6">
              <label className="flex flex-col gap-1 text-sm" htmlFor="market-min-users">
                <span className="text-muted-foreground">{t.minUsers}</span>
                <Input
                  id="market-min-users"
                  inputMode="numeric"
                  name="minUsers"
                  onChange={event => setFormState(prev => ({ ...prev, minUsers: event.target.value }))}
                  value={formState.minUsers}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="market-max-users">
                <span className="text-muted-foreground">{t.maxUsers}</span>
                <Input
                  id="market-max-users"
                  inputMode="numeric"
                  name="maxUsers"
                  onChange={event => setFormState(prev => ({ ...prev, maxUsers: event.target.value }))}
                  value={formState.maxUsers}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="market-rating-min">
                <span className="text-muted-foreground">{t.ratingMin}</span>
                <Input
                  id="market-rating-min"
                  inputMode="decimal"
                  name="ratingMin"
                  onChange={event => setFormState(prev => ({ ...prev, ratingMin: event.target.value }))}
                  value={formState.ratingMin}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="market-rating-max">
                <span className="text-muted-foreground">{t.ratingMax}</span>
                <Input
                  id="market-rating-max"
                  inputMode="decimal"
                  name="ratingMax"
                  onChange={event => setFormState(prev => ({ ...prev, ratingMax: event.target.value }))}
                  value={formState.ratingMax}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="market-exclude-top">
                <span className="text-muted-foreground">{t.excludeTop}</span>
                <Input
                  id="market-exclude-top"
                  inputMode="numeric"
                  name="excludeTopPct"
                  onChange={event => setFormState(prev => ({ ...prev, excludeTopPct: event.target.value }))}
                  value={formState.excludeTopPct}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="market-lang">
                <span className="text-muted-foreground">{t.languageContains}</span>
                <Input
                  id="market-lang"
                  name="lang"
                  onChange={event => setFormState(prev => ({ ...prev, lang: event.target.value }))}
                  value={formState.lang}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="flex w-full max-w-xl flex-col gap-1 text-sm" htmlFor="market-ext-name">
                <span className="text-muted-foreground">{t.extensionNameContains}</span>
                <Input
                  id="market-ext-name"
                  name="extName"
                  onChange={event => setFormState(prev => ({ ...prev, extName: event.target.value }))}
                  value={formState.extName}
                />
              </label>

              <div className="flex gap-3 lg:justify-end">
                <Button type="submit">{t.applyFilters}</Button>
                <Button onClick={onFilterReset} type="button" variant="outline">
                  {t.reset}
                </Button>
              </div>
            </div>

            <ActiveFilterChips
              clearAllLabel={t.reset}
              items={activeFilters}
              onClearAll={onFilterReset}
              onClearOne={key => onClearFilter(key as keyof MarketFormState)}
              title={t.activeFilters}
            />
          </form>
        </FilterPanelCard>

        {state === 'loading' && (
          <Card>
            <CardContent>
              <p className="text-sm text-muted-foreground">{t.loading}</p>
            </CardContent>
          </Card>
        )}

        {state === 'error' && (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent>
              <p className="text-sm text-rose-700">
                {t.errorPrefix}: {error}
              </p>
            </CardContent>
          </Card>
        )}

        {state === 'success' && payload && (
          <>
            {payload.categories.length > 0 && (
              <MarketCharts categories={payload.categories} onOpenCategory={openCategory} />
            )}

            <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <Card>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.categories}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatInt(summary?.categories ?? 0, locale)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.extensions}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatInt(summary?.totalExtensions ?? 0, locale)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.users}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatInt(summary?.totalUsers ?? 0, locale)}</p>
                </CardContent>
              </Card>
            </section>

            <Card>
              <CardHeader className="border-b">
                <div className="flex items-center gap-2">
                  <CardTitle className="text-base">{t.categories}</CardTitle>
                  <InfoHint
                    content={
                      <div className="space-y-1">
                        <p>
                          <strong>{t.hintExtensionsLabel}:</strong> {t.hintExtensionsText}
                        </p>
                        <p>
                          <strong>{t.hintUsersLabel}:</strong> {t.hintUsersText}
                        </p>
                        <p>
                          <strong>{t.hintAvgLabel}:</strong> {t.hintAvgText}
                        </p>
                        <p>
                          <strong>{t.hintUnderservedLabel}:</strong> {t.hintUnderservedText}
                        </p>
                      </div>
                    }
                    title={t.tableHintTitle}
                  />
                </div>
                <CardDescription>
                  {t.generatedAt}: <span className="font-medium">{payload.generated_at}</span>
                </CardDescription>
                <CardDescription>{t.tableHint}</CardDescription>
              </CardHeader>
              <CardContent>
                {payload.categories.length === 0 ? (
                  <p className="text-sm text-muted-foreground">{t.noData}</p>
                ) : (
                  <Table className="table-fixed">
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[36%] text-xs leading-tight sm:text-sm">{t.tableCategory}</TableHead>
                        <TableHead className="w-[12%] text-xs leading-tight sm:text-sm">{t.extensions}</TableHead>
                        <TableHead className="w-[16%] text-xs leading-tight sm:text-sm">{t.users}</TableHead>
                        <TableHead className="w-[14%] text-xs leading-tight sm:text-sm">{t.tableAvgRating}</TableHead>
                        <TableHead className="w-[14%] text-xs leading-tight sm:text-sm">{t.tableUnderserved}</TableHead>
                        <TableHead className="w-[8%] text-right text-xs leading-tight sm:text-sm">{t.open}</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payload.categories.map(category => (
                        <TableRow key={category.category_id}>
                          <TableCell className="max-w-0 font-medium">
                            <Link
                              className="block truncate hover:underline"
                              href={
                                queryString
                                  ? `/category/${category.category_id}?${queryString}`
                                  : `/category/${category.category_id}`
                              }
                              title={category.category_name}
                            >
                              {category.category_name}
                            </Link>
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatInt(category.total_extensions, locale)}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatInt(category.total_users, locale)}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatDecimal(category.avg_rating, 3)}
                          </TableCell>
                          <TableCell className="tabular-nums whitespace-nowrap">
                            {formatDecimal(category.underserved_index, 4)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="outline">
                              <Link
                                href={
                                  queryString
                                    ? `/category/${category.category_id}?${queryString}`
                                    : `/category/${category.category_id}`
                                }
                              >
                                {t.open}
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </>
        )}
      </main>
    </div>
  )
}
