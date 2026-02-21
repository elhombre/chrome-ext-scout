'use client'

import type { EChartsOption } from 'echarts'
import { BarChart, ScatterChart } from 'echarts/charts'
import {
  DataZoomComponent,
  GridComponent,
  type GridComponentOption,
  TooltipComponent,
  type TooltipComponentOption,
  VisualMapComponent,
} from 'echarts/components'
import * as echarts from 'echarts/core'
import { CanvasRenderer } from 'echarts/renderers'
import { CircleHelp } from 'lucide-react'
import { useEffect, useMemo, useRef } from 'react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import type { CategoryHistogramBucket, CategoryScatterPoint } from '@/lib/category/types'
import { useI18n } from '@/lib/i18n'
import { getMessages } from '@/lib/messages'

echarts.use([
  DataZoomComponent,
  GridComponent,
  TooltipComponent,
  VisualMapComponent,
  ScatterChart,
  BarChart,
  CanvasRenderer,
])

type CategoryChartsProps = {
  scatterPoints: CategoryScatterPoint[]
  usersHistogram: CategoryHistogramBucket[]
  ratingHistogram: CategoryHistogramBucket[]
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

function formatBucket(bucket: CategoryHistogramBucket, locale: string) {
  if (bucket.bucket_start === 0 && bucket.bucket_end === 0) {
    return '0'
  }

  return `${formatInt(bucket.bucket_start, locale)} - ${formatInt(bucket.bucket_end, locale)}`
}

function formatRatingBucket(bucket: CategoryHistogramBucket) {
  return `${bucket.bucket_start.toFixed(2)} - ${bucket.bucket_end.toFixed(2)}`
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

function blendChannel(a: number, b: number, t: number) {
  return Math.round(a + (b - a) * t)
}

function interpolateHex(from: [number, number, number], to: [number, number, number], t: number) {
  const r = blendChannel(from[0], to[0], t)
  const g = blendChannel(from[1], to[1], t)
  const b = blendChannel(from[2], to[2], t)
  return `rgb(${r}, ${g}, ${b})`
}

function isSeriesDataClick(rawParams: unknown) {
  const params = rawParams as {
    componentType?: string
    data?: unknown
  }

  return params.componentType === 'series' && params.data !== undefined
}

function extractScatterPoint(rawParams: unknown): CategoryScatterPoint | null {
  const params = rawParams as {
    data?: {
      raw?: CategoryScatterPoint
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
      }, 180)
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

export function CategoryCharts({ scatterPoints, usersHistogram, ratingHistogram }: CategoryChartsProps) {
  const { language } = useI18n()
  const t = getMessages(language).category.charts
  const locale = language === 'ru' ? 'ru-RU' : 'en-US'
  const votesP90 = useMemo(
    () =>
      Math.max(
        quantile(
          scatterPoints.map(point => point.rating_votes),
          0.9,
        ),
        1,
      ),
    [scatterPoints],
  )
  const scatterColorData = useMemo(
    () =>
      scatterPoints.map(point => {
        const positiveGap = Math.max(point.rating_gap ?? 0, 0)
        return {
          point,
          positiveGap,
        }
      }),
    [scatterPoints],
  )
  const gapP90 = useMemo(
    () =>
      Math.max(
        quantile(
          scatterColorData.map(item => item.positiveGap),
          0.9,
        ),
        0.0001,
      ),
    [scatterColorData],
  )
  const usersLogMin = useMemo(() => Math.min(...scatterPoints.map(point => point.users_log), 0), [scatterPoints])
  const usersLogMax = useMemo(() => Math.max(...scatterPoints.map(point => point.users_log), 0.0001), [scatterPoints])

  const scatterOption = useMemo<ECOption>(() => {
    const usersLogRange = Math.max(usersLogMax - usersLogMin, 0.0001)
    const colorData = scatterColorData.map(item => {
      const gapNorm = Math.min(item.positiveGap / gapP90, 1)
      const demandNorm = Math.min(Math.max((item.point.users_log - usersLogMin) / usersLogRange, 0), 1)
      const colorScore = 0.65 * gapNorm + 0.35 * demandNorm

      return {
        value: [item.point.users_log, item.point.rating ?? 0, item.point.rating_votes, colorScore],
        raw: item.point,
      }
    })

    return {
      animation: false,
      grid: { top: 20, right: 20, bottom: 52, left: 64 },
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
          const params = rawParams as unknown as { data: { raw: CategoryScatterPoint } }
          const point = params.data.raw

          return [
            `<strong>${point.extension_name}</strong>`,
            `${t.users}: ${formatInt(point.users, locale)}`,
            `${t.rating}: ${point.rating === null ? t.notAvailable : point.rating.toFixed(3)}`,
            `${t.votes}: ${formatInt(point.rating_votes, locale)}`,
            `${t.ratingGap}: ${point.rating_gap === null ? t.notAvailable : point.rating_gap.toFixed(3)}`,
            `${t.updated}: ${point.updated_at ?? t.notAvailable}`,
            t.interpretationScatter,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'value',
        name: 'log1p(users)',
      },
      yAxis: {
        type: 'value',
        min: 0,
        max: 5,
        name: 'rating',
      },
      visualMap: {
        show: false,
        dimension: 3,
        min: 0,
        max: 1,
        inRange: {
          color: ['#7dd3fc', '#67e8f9', '#34d399', '#a3e635'],
        },
      },
      series: [
        {
          type: 'scatter',
          itemStyle: {
            opacity: 0.48,
            borderColor: 'rgba(255, 255, 255, 0.92)',
            borderWidth: 1,
            shadowColor: 'rgba(15, 23, 42, 0.08)',
            shadowBlur: 2,
          },
          emphasis: {
            scale: true,
            itemStyle: {
              opacity: 0.9,
              borderColor: '#0f172a',
              borderWidth: 1.5,
            },
          },
          symbolSize: value => {
            const array = Array.isArray(value) ? value : []
            const votes = Number(array[2] ?? 0)
            const normalized = Math.min(Math.max(Math.log1p(Math.max(votes, 0)) / Math.log1p(votesP90), 0), 1.2)
            return Math.max(3, Math.min(24, 3 + normalized * 21))
          },
          data: colorData,
        },
      ],
    }
  }, [gapP90, locale, scatterColorData, t, usersLogMax, usersLogMin, votesP90])

  const usersHistogramOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: { top: 20, right: 16, bottom: 80, left: 56 },
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: rawParams => {
          const params = rawParams as unknown as [{ axisValue: string; value: number }]
          const item = params[0]

          if (!item) {
            return t.bucketNotFound
          }

          return [
            `<strong>${item.axisValue}</strong>`,
            `${t.extensions}: ${formatInt(Number(item.value), locale)}`,
            t.interpretationUsersHist,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: usersHistogram.map(bucket => formatBucket(bucket, locale)),
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
          data: usersHistogram.map((bucket, index) => {
            const normalized = usersHistogram.length <= 1 ? 0 : index / (usersHistogram.length - 1)
            return {
              value: bucket.item_count,
              itemStyle: {
                color: interpolateHex([186, 230, 253], [59, 130, 246], normalized),
              },
            }
          }),
        },
      ],
    }
  }, [locale, usersHistogram, t])

  const ratingHistogramOption = useMemo<ECOption>(() => {
    return {
      animation: false,
      grid: { top: 20, right: 16, bottom: 80, left: 56 },
      tooltip: {
        ...echartsTooltipBase,
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: rawParams => {
          const params = rawParams as unknown as [{ axisValue: string; value: number }]
          const item = params[0]

          if (!item) {
            return t.bucketNotFound
          }

          return [
            `<strong>${item.axisValue}</strong>`,
            `${t.extensions}: ${formatInt(Number(item.value), locale)}`,
            t.interpretationRatingHist,
          ].join('<br/>')
        },
      },
      xAxis: {
        type: 'category',
        data: ratingHistogram.map(formatRatingBucket),
        axisLabel: {
          interval: 1,
          rotate: 35,
        },
      },
      yAxis: {
        type: 'value',
      },
      series: [
        {
          type: 'bar',
          data: ratingHistogram.map((bucket, index) => {
            const normalized = ratingHistogram.length <= 1 ? 0 : index / (ratingHistogram.length - 1)
            return {
              value: bucket.item_count,
              itemStyle: {
                color: interpolateHex([187, 247, 208], [16, 185, 129], normalized),
              },
            }
          }),
        },
      ],
    }
  }, [locale, ratingHistogram, t])

  return (
    <section className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <Card className="xl:col-span-3">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t.titleScatter}</CardTitle>
            <CardDescription>{t.descriptionScatter}</CardDescription>
          </div>
          <InfoHint text={t.hintScatter} title={t.hintTitleScatter} />
        </CardHeader>
        <CardContent>
          <ChartBox
            height={420}
            onPointClick={rawParams => {
              const point = extractScatterPoint(rawParams)

              if (point?.extension_url) {
                window.open(point.extension_url, '_blank', 'noopener,noreferrer')
              }
            }}
            option={scatterOption}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t.titleUsersHist}</CardTitle>
            <CardDescription>{t.descriptionUsersHist}</CardDescription>
          </div>
          <InfoHint text={t.hintUsersHist} title={t.hintTitleUsersHist} />
        </CardHeader>
        <CardContent>
          <ChartBox height={300} option={usersHistogramOption} />
        </CardContent>
      </Card>

      <Card className="xl:col-span-2">
        <CardHeader className="flex flex-row items-start justify-between gap-3">
          <div>
            <CardTitle className="text-base">{t.titleRatingHist}</CardTitle>
            <CardDescription>{t.descriptionRatingHist}</CardDescription>
          </div>
          <InfoHint text={t.hintRatingHist} title={t.hintTitleRatingHist} />
        </CardHeader>
        <CardContent>
          <ChartBox height={300} option={ratingHistogramOption} />
        </CardContent>
      </Card>
    </section>
  )
}
