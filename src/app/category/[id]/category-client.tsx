'use client'

import { CircleHelp } from 'lucide-react'
import Link from 'next/link'
import { usePathname, useRouter, useSearchParams } from 'next/navigation'
import { type ReactNode, useEffect, useMemo, useState } from 'react'

import { CategoryCharts } from '@/app/category/[id]/category-charts'
import { type ActiveFilterChip, ActiveFilterChips } from '@/components/active-filter-chips'
import { FilterPanelCard } from '@/components/filter-panel-card'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { CategoryApiResponse } from '@/lib/category/types'
import { useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'

type CategoryFormState = {
  minUsers: string
  maxUsers: string
  ratingMin: string
  ratingMax: string
  excludeTopPct: string
  lang: string
  extName: string
  pageSize: string
}

const defaultFormState: CategoryFormState = {
  minUsers: '',
  maxUsers: '',
  ratingMin: '',
  ratingMax: '',
  excludeTopPct: '',
  lang: '',
  extName: '',
  pageSize: String(DEFAULT_TABLE_PAGE_SIZE),
}

type LoadState = 'idle' | 'loading' | 'success' | 'error'
type SortBy = 'users' | 'rating' | 'rating_gap'
type SortDir = 'asc' | 'desc'

function readFormState(searchParams: URLSearchParams): CategoryFormState {
  return {
    minUsers: searchParams.get('minUsers') ?? '',
    maxUsers: searchParams.get('maxUsers') ?? '',
    ratingMin: searchParams.get('ratingMin') ?? '',
    ratingMax: searchParams.get('ratingMax') ?? '',
    excludeTopPct: searchParams.get('excludeTopPct') ?? '',
    lang: searchParams.get('lang') ?? '',
    extName: searchParams.get('extName') ?? '',
    pageSize: searchParams.get('pageSize') ?? String(DEFAULT_TABLE_PAGE_SIZE),
  }
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

type CategoryClientProps = {
  categoryId: string
}

export function CategoryClient({ categoryId }: CategoryClientProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const queryString = searchParams.toString()
  const { language } = useI18n()
  const t = getMessages(language).category.client
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'

  const [formState, setFormState] = useState<CategoryFormState>(() => readFormState(new URLSearchParams(queryString)))
  const [state, setState] = useState<LoadState>('idle')
  const [error, setError] = useState<string | null>(null)
  const [payload, setPayload] = useState<CategoryApiResponse | null>(null)

  useEffect(() => {
    setFormState(readFormState(new URLSearchParams(queryString)))
  }, [queryString])

  useEffect(() => {
    const controller = new AbortController()

    async function load() {
      setState('loading')
      setError(null)

      try {
        const response = await fetch(`/api/category/${categoryId}${queryString ? `?${queryString}` : ''}`, {
          signal: controller.signal,
          cache: 'no-store',
        })

        const json = (await response.json()) as CategoryApiResponse & { error?: string }

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
  }, [categoryId, queryString, t.errorPrefix])

  const tableState = useMemo(() => {
    const sortByRaw = searchParams.get('sortBy')
    const sortDirRaw = searchParams.get('sortDir')
    const pageRaw = searchParams.get('page')

    const sortBy: SortBy =
      sortByRaw === 'rating' || sortByRaw === 'rating_gap' || sortByRaw === 'users' ? sortByRaw : 'users'
    const sortDir: SortDir = sortDirRaw === 'asc' || sortDirRaw === 'desc' ? sortDirRaw : 'desc'
    const page = pageRaw ? Number(pageRaw) : 1

    return {
      sortBy,
      sortDir,
      page: Number.isFinite(page) && page >= 1 ? Math.floor(page) : 1,
    }
  }, [searchParams])

  function onFilterSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault()

    const nextParams = new URLSearchParams()

    if (formState.minUsers.trim()) {
      nextParams.set('minUsers', formState.minUsers.trim())
    }

    if (formState.maxUsers.trim()) {
      nextParams.set('maxUsers', formState.maxUsers.trim())
    }

    if (formState.ratingMin.trim()) {
      nextParams.set('ratingMin', formState.ratingMin.trim())
    }

    if (formState.ratingMax.trim()) {
      nextParams.set('ratingMax', formState.ratingMax.trim())
    }

    if (formState.excludeTopPct.trim()) {
      nextParams.set('excludeTopPct', formState.excludeTopPct.trim())
    }

    if (formState.lang.trim()) {
      nextParams.set('lang', formState.lang.trim())
    }

    if (formState.extName.trim()) {
      nextParams.set('extName', formState.extName.trim())
    }

    if (formState.pageSize.trim()) {
      nextParams.set('pageSize', formState.pageSize.trim())
    }

    nextParams.set('sortBy', tableState.sortBy)
    nextParams.set('sortDir', tableState.sortDir)

    const nextQuery = nextParams.toString()
    router.push(nextQuery ? `${pathname}?${nextQuery}` : pathname)
  }

  function onFilterReset() {
    setFormState(defaultFormState)
    router.push(pathname)
  }

  function onClearFilter(filterKey: keyof CategoryFormState) {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.delete(filterKey)
    nextParams.set('page', '1')

    setFormState(readFormState(nextParams))
    router.push(`${pathname}?${nextParams.toString()}`)
  }

  function onSort(sortBy: SortBy) {
    const nextParams = new URLSearchParams(searchParams.toString())
    const nextSortDir: SortDir =
      sortBy === tableState.sortBy ? (tableState.sortDir === 'desc' ? 'asc' : 'desc') : 'desc'

    nextParams.set('sortBy', sortBy)
    nextParams.set('sortDir', nextSortDir)
    nextParams.set('page', '1')

    router.push(`${pathname}?${nextParams.toString()}`)
  }

  function onPageChange(nextPage: number) {
    const nextParams = new URLSearchParams(searchParams.toString())
    nextParams.set('page', String(nextPage))

    router.push(`${pathname}?${nextParams.toString()}`)
  }

  const canGoPrev = tableState.page > 1
  const canGoNext = payload ? payload.table.page * payload.table.pageSize < payload.table.total : false
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
      {
        key: 'pageSize',
        label: t.pageSize,
        value: (params.get('pageSize') ?? '').trim(),
      },
    ]

    return values.filter(item => item.value.length > 0)
  }, [queryString, t])

  return (
    <div className="min-h-screen bg-background px-6 py-10 text-foreground">
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-6">
        <Card>
          <CardHeader className="flex flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-2xl tracking-tight">{t.pageTitle}</CardTitle>
              <CardDescription>{t.pageDescription}</CardDescription>
            </div>
            <div className="flex gap-2">
              <Button asChild variant="outline">
                <Link href={queryString ? `/opportunities?${queryString}` : '/opportunities'}>
                  {t.openOpportunities}
                </Link>
              </Button>
              <Button asChild variant="outline">
                <Link href="/market">{t.backToMarket}</Link>
              </Button>
            </div>
          </CardHeader>
        </Card>

        <FilterPanelCard pinLabel={t.pinPanel} unpinLabel={t.unpinPanel}>
          <form className="space-y-4" onSubmit={onFilterSubmit}>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-4 lg:grid-cols-7">
              <label className="flex flex-col gap-1 text-sm" htmlFor="category-min-users">
                <span className="text-muted-foreground">{t.minUsers}</span>
                <Input
                  id="category-min-users"
                  inputMode="numeric"
                  name="minUsers"
                  onChange={event => setFormState(prev => ({ ...prev, minUsers: event.target.value }))}
                  value={formState.minUsers}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-max-users">
                <span className="text-muted-foreground">{t.maxUsers}</span>
                <Input
                  id="category-max-users"
                  inputMode="numeric"
                  name="maxUsers"
                  onChange={event => setFormState(prev => ({ ...prev, maxUsers: event.target.value }))}
                  value={formState.maxUsers}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-rating-min">
                <span className="text-muted-foreground">{t.ratingMin}</span>
                <Input
                  id="category-rating-min"
                  inputMode="decimal"
                  name="ratingMin"
                  onChange={event => setFormState(prev => ({ ...prev, ratingMin: event.target.value }))}
                  value={formState.ratingMin}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-rating-max">
                <span className="text-muted-foreground">{t.ratingMax}</span>
                <Input
                  id="category-rating-max"
                  inputMode="decimal"
                  name="ratingMax"
                  onChange={event => setFormState(prev => ({ ...prev, ratingMax: event.target.value }))}
                  value={formState.ratingMax}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-exclude-top">
                <span className="text-muted-foreground">{t.excludeTop}</span>
                <Input
                  id="category-exclude-top"
                  inputMode="numeric"
                  name="excludeTopPct"
                  onChange={event => setFormState(prev => ({ ...prev, excludeTopPct: event.target.value }))}
                  value={formState.excludeTopPct}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-lang">
                <span className="text-muted-foreground">{t.languageContains}</span>
                <Input
                  id="category-lang"
                  name="lang"
                  onChange={event => setFormState(prev => ({ ...prev, lang: event.target.value }))}
                  value={formState.lang}
                />
              </label>

              <label className="flex flex-col gap-1 text-sm" htmlFor="category-page-size">
                <span className="text-muted-foreground">{t.pageSize}</span>
                <Input
                  id="category-page-size"
                  inputMode="numeric"
                  name="pageSize"
                  onChange={event => setFormState(prev => ({ ...prev, pageSize: event.target.value }))}
                  value={formState.pageSize}
                />
              </label>
            </div>

            <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
              <label className="flex w-full max-w-xl flex-col gap-1 text-sm" htmlFor="category-ext-name">
                <span className="text-muted-foreground">{t.extensionNameContains}</span>
                <Input
                  id="category-ext-name"
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
              onClearOne={key => onClearFilter(key as keyof CategoryFormState)}
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
            <section className="grid grid-cols-1 gap-4 md:grid-cols-4">
              <Card className="md:col-span-2">
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.category}</p>
                  <p className="mt-2 text-2xl font-semibold">{payload.category.name}</p>
                  <p className="mt-1 text-xs text-slate-500">ID: {payload.category.id}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.extensions}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatInt(payload.category.extension_count, locale)}</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent>
                  <p className="text-xs uppercase tracking-wide text-slate-500">{t.categoryAvgRating}</p>
                  <p className="mt-2 text-2xl font-semibold">{formatDecimal(payload.category.avg_rating, 3)}</p>
                </CardContent>
              </Card>
            </section>

            {payload.table.total === 0 ? (
              <Card>
                <CardContent>
                  <p className="text-sm text-muted-foreground">{t.noData}</p>
                </CardContent>
              </Card>
            ) : (
              <>
                <CategoryCharts
                  ratingHistogram={payload.rating_histogram}
                  scatterPoints={payload.scatter_points}
                  usersHistogram={payload.users_histogram}
                />

                <Card>
                  <CardHeader className="border-b">
                    <div className="flex items-center gap-2">
                      <CardTitle className="text-base">{t.tableTitle}</CardTitle>
                      <InfoHint
                        content={
                          <div className="space-y-1">
                            <p>
                              <strong>{t.hintUsersLabel}:</strong> {t.hintUsersText}
                            </p>
                            <p>
                              <strong>{t.hintRatingLabel}:</strong> {t.hintRatingText}
                            </p>
                            <p>
                              <strong>{t.hintVotesLabel}:</strong> {t.hintVotesText}
                            </p>
                            <p>
                              <strong>{t.hintGapLabel}:</strong> {t.hintGapText}
                            </p>
                            <p>
                              <strong>{t.hintUpdatedLabel}:</strong> {t.hintUpdatedText}
                            </p>
                          </div>
                        }
                        title={t.tableHintTitle}
                      />
                    </div>
                    <CardDescription>
                      {t.generatedAt}: <span className="font-medium">{payload.generated_at}</span>
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {(['users', 'rating', 'rating_gap'] as const).map(sortBy => {
                        const active = tableState.sortBy === sortBy
                        const marker = active ? (tableState.sortDir === 'asc' ? '↑' : '↓') : ''

                        return (
                          <Button
                            key={sortBy}
                            onClick={() => onSort(sortBy)}
                            type="button"
                            variant={active ? 'default' : 'outline'}
                          >
                            {sortBy === 'rating_gap' ? t.sortGap : sortBy === 'rating' ? t.sortRating : t.sortUsers}{' '}
                            {marker}
                          </Button>
                        )
                      })}
                    </div>

                    <Table className="table-fixed">
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-[38%] text-xs leading-tight sm:text-sm">{t.tableName}</TableHead>
                          <TableHead className="w-[14%] text-xs leading-tight sm:text-sm">{t.sortUsers}</TableHead>
                          <TableHead className="w-[12%] text-xs leading-tight sm:text-sm">{t.sortRating}</TableHead>
                          <TableHead className="w-[14%] text-xs leading-tight sm:text-sm">{t.tableVotes}</TableHead>
                          <TableHead className="w-[10%] text-xs leading-tight sm:text-sm">{t.sortGap}</TableHead>
                          <TableHead className="w-[12%] text-xs leading-tight sm:text-sm">{t.tableUpdated}</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {payload.table.rows.map(row => (
                          <TableRow key={row.extension_id}>
                            <TableCell className="max-w-0 font-medium">
                              {row.extension_url ? (
                                <a
                                  className="block truncate hover:underline"
                                  href={row.extension_url}
                                  rel="noreferrer"
                                  target="_blank"
                                  title={row.extension_name}
                                >
                                  {row.extension_name}
                                </a>
                              ) : (
                                <span className="block truncate" title={row.extension_name}>
                                  {row.extension_name}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="tabular-nums whitespace-nowrap">
                              {formatInt(row.users, locale)}
                            </TableCell>
                            <TableCell className="tabular-nums whitespace-nowrap">
                              {row.rating === null ? t.notAvailable : formatDecimal(row.rating, 3)}
                            </TableCell>
                            <TableCell className="tabular-nums whitespace-nowrap">
                              {formatInt(row.rating_votes, locale)}
                            </TableCell>
                            <TableCell className="tabular-nums whitespace-nowrap">
                              {row.rating_gap === null ? t.notAvailable : formatDecimal(row.rating_gap, 3)}
                            </TableCell>
                            <TableCell className="whitespace-nowrap">{row.updated_at ?? t.notAvailable}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>

                    <div className="flex items-center justify-between">
                      <p className="text-sm text-muted-foreground">
                        {t.page} {payload.table.page} {t.of}{' '}
                        {Math.max(1, Math.ceil(payload.table.total / payload.table.pageSize))} (
                        {formatInt(payload.table.total, locale)} {t.rows})
                      </p>

                      <div className="flex gap-2">
                        <Button
                          disabled={!canGoPrev}
                          onClick={() => onPageChange(payload.table.page - 1)}
                          type="button"
                          variant="outline"
                        >
                          {t.prev}
                        </Button>
                        <Button
                          disabled={!canGoNext}
                          onClick={() => onPageChange(payload.table.page + 1)}
                          type="button"
                          variant="outline"
                        >
                          {t.next}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
