'use client'

import type { EChartsOption } from 'echarts'
import { BarChart, TreemapChart } from 'echarts/charts'
import {
  GridComponent,
  type GridComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CircleHelp } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import type { MarketCategory } from '@/lib/market/types'
import { getMessages } from '@/lib/messages'

echarts.use([GridComponent, TooltipComponent, TreemapChart, BarChart, CanvasRenderer])

type ChartSeries = 'demand' | 'density'

type MarketChartsProps = {
  categories: MarketCategory[]
  onOpenCategory?: (categoryId: number) => void
}

type ECOption = EChartsOption & {
  tooltip?: TooltipComponentOption
  grid?: GridComponentOption
}

const echartsTooltipCss = 'max-width:min(420px,86vw);white-space:normal;word-break:break-word;overflow-wrap:anywhere;'

const echartsTooltipBase: TooltipComponentOption = {
  confine: true,
  extraCssText: echartsTooltipCss,
}

function InfoHint({ title, text }: { title: string; text: string }) {
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
        {text}
      </PopoverContent>
    </Popover>
  )
}

function formatInt(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(Math.round(value))
}

function formatScore(value: number) {
  return value.toFixed(4)
}

function blendChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function interpolateHex(from: [number, number, number], to: [number, number, number], t: number) {
  const r = blendChannel(from[0], to[0], t)
  const g = blendChannel(from[1], to[1], t)
  const b = blendChannel(from[2], to[2], t)
  return `rgb(${r}, ${g}, ${b})`
}

function colorForScore(value: number, min: number, max: number) {
  if (max <= min) {
    return 'rgb(148, 163, 184)'
  }

  const normalized = (value - min) / (max - min)
  const clamped = Math.min(Math.max(normalized, 0), 1)

  if (clamped < 0.5) {
    return interpolateHex([220, 252, 231], [254, 240, 138], clamped * 2)
  }

  return interpolateHex([254, 240, 138], [249, 115, 22], (clamped - 0.5) * 2)
}

function colorForUnderservedBar(value: number, min: number, max: number) {
  if (max <= min) {
    return 'rgb(56, 189, 248)'
  }

  const normalized = (value - min) / (max - min)
  const clamped = Math.min(Math.max(normalized, 0), 1)

  return interpolateHex([125, 211, 252], [59, 130, 246], clamped)
}

function colorForDemandBar(value: number, max: number) {
  if (max <= 0) {
    return 'rgb(56, 189, 248)'
  }

  const clamped = Math.min(Math.max(value / max, 0), 1)
  return interpolateHex([186, 230, 253], [14, 165, 233], clamped)
}

function colorForDensityBar(value: number, max: number) {
  if (max <= 0) {
    return 'rgb(52, 211, 153)'
  }

  const clamped = Math.min(Math.max(value / max, 0), 1)
  return interpolateHex([187, 247, 208], [16, 185, 129], clamped)
}

function ChartBox({
  option,
  height,
  onClick,
}: {
  option: ECOption
  height: number
  onClick?: (rawParams: unknown) => void
}) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)

  useEffect(() => {
    if (!elementRef.current) {
      return
    }

    const instance = echarts.init(elementRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = instance
    const handleClick = (rawParams: unknown) => {
      onClick?.(rawParams)
    }

    const onResize = () => {
      chartRef.current?.resize()
    }

    instance.on('click', handleClick)
    window.addEventListener('resize', onResize)

    return () => {
      instance.off('click', handleClick)
      window.removeEventListener('resize', onResize)
      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [onClick])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option])

  return <div className="w-full" ref={elementRef} style={{ height }} />
}

function extractCategoryId(rawParams: unknown): number | null {
  const candidate = rawParams as {
    data?: {
      category_id?: number | string
      raw?: {
        category_id?: number | string
      }
    }
  }

  const directId = candidate.data?.category_id
  const nestedId = candidate.data?.raw?.category_id
  const value = directId ?? nestedId

  if (value === undefined || value === null) {
    return null
  }

  const parsed = Number(value)

  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

export function MarketCharts({ categories, onOpenCategory }: MarketChartsProps) {
  const { language } = useI18n()
  const t = getMessages(language).market.charts
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const [series, setSeries] = useState<ChartSeries>('demand')

  const categoryNames = useMemo(() => categories.map(category => category.category_name), [categories])
  const underservedSorted = useMemo(
    () => [...categories].sort((left, right) => right.underserved_index - left.underserved_index),
    [categories],
  )
  const underservedNames = useMemo(() => underservedSorted.map(category => category.category_name), [underservedSorted])
  const minUnderserved = useMemo(
    () => Math.min(...categories.map(category => category.underserved_index), 0),
    [categories],
  )
  const maxUnderserved = useMemo(
    () => Math.max(...categories.map(category => category.underserved_index), 0.0001),
    [categories],
  )
  const demandMax = useMemo(() => Math.max(...categories.map(category => category.total_users), 1), [categories])
  const densityMax = useMemo(() => Math.max(...categories.map(category => category.total_extensions), 1), [categories])

  const underservedBarOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: { top: 18, right: 20, bottom: 24, left: 180 },
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: rawParams => {
          const params = rawParams as unknown as [{ dataIndex: number }]
          const dataIndex = params[0]?.dataIndex ?? -1
          const category = underservedSorted[dataIndex]

          if (!category) {
            return t.categoryNotFound
          }

          return [
            `<strong>${category.category_name}</strong>`,
            `${t.rank}: ${dataIndex + 1}`,
            `${t.underserved}: ${formatScore(category.underserved_index)}`,
            `${t.users}: ${formatInt(category.total_users, locale)}`,
            `${t.avgRating}: ${category.avg_rating.toFixed(3)}`,
            t.interpretationUnderserved,
          ]
            .filter(Boolean)
            .join('<br/>')
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        axisLabel: {
          formatter: value => Number(value).toFixed(2),
        },
      },
      yAxis: {
        type: 'category',
        data: underservedNames,
        axisLabel: {
          interval: 0,
          width: 160,
          overflow: 'truncate',
        },
      },
      series: [
        {
          type: 'bar',
          data: underservedSorted.map(category => ({
            value: category.underserved_index,
            category_id: category.category_id,
            itemStyle: {
              color: colorForUnderservedBar(category.underserved_index, minUnderserved, maxUnderserved),
            },
          })),
          barMaxWidth: 24,
          label: {
            show: true,
            position: 'right',
            formatter: params => Number(params.value).toFixed(4),
          },
        },
      ],
    }
  }, [locale, maxUnderserved, minUnderserved, underservedNames, underservedSorted, t])

  const treemapOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'item',
        formatter: rawParams => {
          const params = rawParams as unknown as { data: { raw: MarketCategory } }
          const category = params.data.raw

          return [
            `<strong>${category.category_name}</strong>`,
            `${t.underserved}: ${formatScore(category.underserved_index)}`,
            `${t.users}: ${formatInt(category.total_users, locale)}`,
            `${t.extensions}: ${formatInt(category.total_extensions, locale)}`,
            `${t.avgRating}: ${category.avg_rating.toFixed(3)}`,
            t.interpretationHeat,
          ].join('<br/>')
        },
      },
      series: [
        {
          type: 'treemap',
          roam: false,
          breadcrumb: {
            show: false,
          },
          nodeClick: false,
          label: {
            show: true,
            formatter: params => {
              const data = params.data as { raw: MarketCategory }
              const category = data.raw
              return `${category.category_name}\n${formatScore(category.underserved_index)}`
            },
            overflow: 'truncate',
            fontSize: 11,
          },
          upperLabel: { show: false },
          data: categories.map(category => ({
            name: category.category_name,
            value: Math.log1p(category.total_users),
            raw: category,
            itemStyle: {
              color: colorForScore(category.underserved_index, minUnderserved, maxUnderserved),
              borderColor: '#ffffff',
              borderWidth: 2,
              gapWidth: 2,
            },
          })),
        },
      ],
    }
  }, [categories, locale, maxUnderserved, minUnderserved, t])

  const demandOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: { top: 26, right: 16, bottom: 100, left: 80 },
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: rawParams => {
          const params = rawParams as unknown as [{ axisValue: string; value: number }]
          const item = params[0]

          if (!item) {
            return t.categoryNotFound
          }

          return [
            `<strong>${item.axisValue}</strong>`,
            `${t.totalUsers}: ${formatInt(Number(item.value), locale)}`,
            t.interpretationDemand,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: categoryNames,
        axisLabel: {
          interval: 0,
          rotate: 35,
        },
      },
      yAxis: {
        type: 'value',
        axisLabel: {
          formatter: value => formatInt(Number(value), locale),
        },
      },
      series: [
        {
          type: 'bar',
          name: t.totalUsers,
          data: categories.map(category => ({
            value: category.total_users,
            category_id: category.category_id,
            itemStyle: {
              color: colorForDemandBar(category.total_users, demandMax),
            },
          })),
        },
      ],
    }
  }, [categories, categoryNames, demandMax, locale, t])

  const densityOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: { top: 26, right: 16, bottom: 100, left: 80 },
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: rawParams => {
          const params = rawParams as unknown as [{ axisValue: string; value: number }]
          const item = params[0]

          if (!item) {
            return t.categoryNotFound
          }

          return [
            `<strong>${item.axisValue}</strong>`,
            `${t.extensions}: ${formatInt(Number(item.value), locale)}`,
            t.interpretationDensity,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: categoryNames,
        axisLabel: {
          interval: 0,
          rotate: 35,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'bar',
          name: t.extensions,
          data: categories.map(category => ({
            value: category.total_extensions,
            category_id: category.category_id,
            itemStyle: {
              color: colorForDensityBar(category.total_extensions, densityMax),
            },
          })),
        },
      ],
    }
  }, [categories, categoryNames, densityMax, locale, t])

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-5">
      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t.titleUnderserved}</CardTitle>
            <CardDescription>{t.descriptionUnderserved}</CardDescription>
          </div>
          <InfoHint text={t.hintUnderserved} title={t.hintTitleUnderserved} />
        </CardHeader>
        <CardContent>
          <ChartBox
            height={420}
            onClick={rawParams => {
              const categoryId = extractCategoryId(rawParams)

              if (categoryId !== null) {
                onOpenCategory?.(categoryId)
              }
            }}
            option={underservedBarOption}
          />
        </CardContent>
      </Card>

      <Card className="xl:col-span-3">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t.titleHeatmap}</CardTitle>
            <CardDescription>{t.descriptionHeatmap}</CardDescription>
            <p className="text-muted-foreground text-xs">
              {t.colorRange}: {formatScore(minUnderserved)} to {formatScore(maxUnderserved)}
            </p>
          </div>
          <InfoHint text={t.hintHeatmap} title={t.hintTitleHeatmap} />
        </CardHeader>
        <CardContent>
          <ChartBox
            height={420}
            onClick={rawParams => {
              const categoryId = extractCategoryId(rawParams)

              if (categoryId !== null) {
                onOpenCategory?.(categoryId)
              }
            }}
            option={treemapOption}
          />
        </CardContent>
      </Card>

      <Card className="xl:col-span-5">
        <CardHeader className="flex flex-row items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <CardTitle className="text-base">{t.titleDistribution}</CardTitle>
              <InfoHint text={t.hintDistribution} title={t.hintTitleDistribution} />
            </div>
            <CardDescription>{t.descriptionDistribution}</CardDescription>
          </div>
          <div className="flex rounded-md border p-1 text-xs">
            <Button
              className="h-7 px-2"
              onClick={() => setSeries('demand')}
              type="button"
              variant={series === 'demand' ? 'default' : 'ghost'}
            >
              {t.demand}
            </Button>
            <Button
              className="h-7 px-2"
              onClick={() => setSeries('density')}
              type="button"
              variant={series === 'density' ? 'default' : 'ghost'}
            >
              {t.density}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ChartBox
            height={320}
            onClick={rawParams => {
              const categoryId = extractCategoryId(rawParams)

              if (categoryId !== null) {
                onOpenCategory?.(categoryId)
              }
            }}
            option={series === 'demand' ? demandOption : densityOption}
          />
        </CardContent>
      </Card>
    </section>
  )
}
