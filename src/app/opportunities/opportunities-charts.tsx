'use client'

import type { EChartsOption } from 'echarts'
import { ScatterChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  type GridComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CircleHelp } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useEffect, useMemo, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'
import type { OpportunityPoint } from '@/lib/opportunities/types'

echarts.use([DataZoomComponent, GridComponent, TooltipComponent, ScatterChart, CanvasRenderer])

type OpportunitiesChartsProps = {
  points: OpportunityPoint[]
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

const clickDelayMs = 320

const categoryPalette = [
  '#2563eb',
  '#0ea5e9',
  '#14b8a6',
  '#10b981',
  '#22c55e',
  '#84cc16',
  '#f59e0b',
  '#f97316',
  '#ef4444',
  '#8b5cf6',
]

function formatInt(value: number, locale: string) {
  return new Intl.NumberFormat(locale).format(Math.round(value))
}

function quantile(values: number[], q: number) {
  if (values.length === 0) {
    return 0
  }

  const sorted = [...values].sort((left, right) => left - right)
  const position = (sorted.length - 1) * q
  const lower = Math.floor(position)
  const upper = Math.ceil(position)

  if (lower === upper) {
    return sorted[lower] ?? 0
  }

  const lowerValue = sorted[lower] ?? 0
  const upperValue = sorted[upper] ?? 0
  const weight = position - lower

  return lowerValue + (upperValue - lowerValue) * weight
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

function isSeriesDataClick(rawParams: unknown) {
  const params = rawParams as {
    componentType?: string
    data?: unknown
  }

  return params.componentType === 'series' && params.data !== undefined
}

function extractOpportunityPoint(rawParams: unknown): OpportunityPoint | null {
  const params = rawParams as {
    data?: {
      raw?: OpportunityPoint
    }
  }

  return params.data?.raw ?? null
}

function ChartBox({
  option,
  height,
  onPointClick,
  onPointDoubleClick,
}: {
  option: ECOption
  height: number
  onPointClick?: (rawParams: unknown) => void
  onPointDoubleClick?: (rawParams: unknown) => void
}) {
  const elementRef = useRef<HTMLDivElement | null>(null)
  const chartRef = useRef<ReturnType<typeof echarts.init> | null>(null)
  const clickTimeoutRef = useRef<number | null>(null)

  useEffect(() => {
    if (!elementRef.current) {
      return
    }

    const instance = echarts.init(elementRef.current, undefined, { renderer: 'canvas' })
    chartRef.current = instance
    const zr = instance.getZr()

    const onResize = () => {
      chartRef.current?.resize()
    }

    const resetZoom = () => {
      chartRef.current?.dispatchAction({
        type: 'dataZoom',
        batch: [
          {
            dataZoomIndex: 0,
            start: 0,
            end: 100,
          },
          {
            dataZoomIndex: 1,
            start: 0,
            end: 100,
          },
        ],
      })
    }

    const handleClick = (rawParams: unknown) => {
      if (!onPointClick || !isSeriesDataClick(rawParams)) {
        return
      }

      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
      }

      clickTimeoutRef.current = window.setTimeout(() => {
        clickTimeoutRef.current = null
        onPointClick(rawParams)
      }, clickDelayMs)
    }

    const handleDoubleClick = (rawParams: unknown) => {
      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
        clickTimeoutRef.current = null
      }

      if (isSeriesDataClick(rawParams)) {
        if (onPointDoubleClick) {
          onPointDoubleClick(rawParams)
          return
        }

        onPointClick?.(rawParams)
        return
      }
    }

    const handleCanvasDoubleClick = (event: { target?: unknown }) => {
      if (event.target === undefined || event.target === null) {
        resetZoom()
      }
    }

    instance.on('click', handleClick)
    instance.on('dblclick', handleDoubleClick)
    zr.on('dblclick', handleCanvasDoubleClick)
    window.addEventListener('resize', onResize)

    return () => {
      instance.off('click', handleClick)
      instance.off('dblclick', handleDoubleClick)
      zr.off('dblclick', handleCanvasDoubleClick)
      window.removeEventListener('resize', onResize)

      if (clickTimeoutRef.current !== null) {
        window.clearTimeout(clickTimeoutRef.current)
      }

      chartRef.current?.dispose()
      chartRef.current = null
    }
  }, [onPointClick, onPointDoubleClick])

  useEffect(() => {
    chartRef.current?.setOption(option, { notMerge: true, lazyUpdate: true })
  }, [option])

  return <div className="w-full" ref={elementRef} style={{ height }} />
}

export function OpportunitiesCharts({ points }: OpportunitiesChartsProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { language } = useI18n()
  const t = getMessages(language).opportunities.charts
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const queryString = searchParams.toString()

  const categoryColorMap = useMemo(() => {
    const categories = [...new Set(points.map(point => point.category_name))].sort((left, right) =>
      left.localeCompare(right),
    )

    const map = new Map<string, string>()

    categories.forEach((categoryName, index) => {
      map.set(categoryName, categoryPalette[index % categoryPalette.length])
    })

    return map
  }, [points])

  const usersLogValues = useMemo(() => points.map(point => Math.log1p(point.users)), [points])
  const usersLogMax = useMemo(() => Math.max(...usersLogValues, 0), [usersLogValues])
  const usersLogP75 = useMemo(() => quantile(usersLogValues, 0.75), [usersLogValues])
  const inverseCompetitionValues = useMemo(() => points.map(point => 1 - point.competition_norm), [points])
  const inverseCompetitionP90 = useMemo(
    () =>
      Math.max(
        quantile(
          inverseCompetitionValues.map(value => Math.max(value, 0)),
          0.9,
        ),
        0.05,
      ),
    [inverseCompetitionValues],
  )

  const bubbleOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: {
        top: 20,
        right: 20,
        bottom: 56,
        left: 64,
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: [0],
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          moveOnMouseMove: true,
          throttle: 40,
        },
        {
          type: 'inside',
          yAxisIndex: [0],
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseWheel: false,
          moveOnMouseMove: true,
          throttle: 40,
        },
      ],
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'item',
        formatter: rawParams => {
          const params = rawParams as unknown as { data: { raw: OpportunityPoint } }
          const point = params.data.raw

          return [
            `<strong>${point.extension_name}</strong>`,
            `${t.category}: ${point.category_name}`,
            `${t.score}: ${point.score.toFixed(2)}`,
            `${t.visualX}: ${Math.log1p(point.users).toFixed(3)} ${t.forSpreadOnly}`,
            `${t.demandNorm}: ${point.demand_norm.toFixed(3)}`,
            `${t.gapEffective}: ${point.gap_effective.toFixed(3)}`,
            `${t.competition}: ${formatInt(point.competition_count, locale)}`,
            `${t.users}: ${formatInt(point.users, locale)}`,
            `${t.ratingGap}: ${point.rating_gap.toFixed(3)}`,
            `${t.confidence}: ${point.confidence_norm.toFixed(3)}`,
            t.interpretation,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: usersLogMax > 0 ? usersLogMax : undefined,
        name: t.axisX,
        axisLabel: {
          formatter: value => Number(value).toFixed(1),
        },
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 1,
        name: t.axisY,
      },
      series: [
        {
          type: 'scatter',
          markArea: {
            itemStyle: {
              color: 'rgba(34, 197, 94, 0.08)',
            },
            label: {
              show: true,
              color: '#166534',
              fontSize: 11,
              formatter: t.targetQuadrant,
            },
            data: [
              [
                {
                  xAxis: usersLogP75,
                  yAxis: 0.6,
                },
                {
                  xAxis: usersLogMax > 0 ? usersLogMax : 1,
                  yAxis: 1,
                },
              ],
            ],
          },
          data: points.map(point => ({
            value: [Math.log1p(point.users), point.gap_effective, 1 - point.competition_norm, point.demand_norm],
            raw: point,
            itemStyle: {
              color: categoryColorMap.get(point.category_name) ?? '#0f172a',
              opacity: 0.72,
              borderColor: 'rgba(255, 255, 255, 0.9)',
              borderWidth: 1,
              shadowColor: 'rgba(15, 23, 42, 0.1)',
              shadowBlur: 2,
            },
          })),
          emphasis: {
            scale: true,
            itemStyle: {
              opacity: 0.95,
              borderColor: '#0f172a',
              borderWidth: 1.5,
            },
          },
          symbolSize: value => {
            const array = Array.isArray(value) ? value : []
            const inverseCompetition = Number(array[2] ?? 0)
            const demandNorm = Number(array[3] ?? 0)
            const competitionFactor = Math.min(Math.max(inverseCompetition / inverseCompetitionP90, 0), 1.3)
            const demandFactor = Math.min(Math.max(demandNorm, 0), 1)
            const blended = Math.min(1.3, 0.8 * competitionFactor + 0.2 * demandFactor)

            return Math.max(12, Math.min(42, 12 + blended ** 0.8 * 30))
          },
        },
      ],
    }
  }, [categoryColorMap, inverseCompetitionP90, locale, points, t, usersLogMax, usersLogP75])

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-3">
        <div>
          <CardTitle className="text-base">{t.title}</CardTitle>
          <CardDescription>{t.description}</CardDescription>
        </div>
        <InfoHint text={t.hintText} title={t.hintTitle} />
      </CardHeader>
      <CardContent>
        <ChartBox
          height={440}
          onPointClick={rawParams => {
            const point = extractOpportunityPoint(rawParams)

            if (point?.extension_url) {
              window.open(point.extension_url, '_blank', 'noopener,noreferrer')
            }
          }}
          onPointDoubleClick={rawParams => {
            const point = extractOpportunityPoint(rawParams)

            if (!point) {
              return
            }

            const target = queryString
              ? `/category/${point.category_id}?${queryString}`
              : `/category/${point.category_id}`
            router.push(target)
          }}
          option={bubbleOption}
        />
      </CardContent>
    </Card>
  )
}
