import type { CategoryTableParams } from '@/lib/category/filters'
import type { GlobalFilters } from '@/lib/filters/global'

export type CategoryInfo = {
  id: number
  name: string
  avg_rating: number
  extension_count: number
}

export type CategoryScatterPoint = {
  extension_id: number
  extension_name: string
  extension_url: string | null
  users: number
  users_log: number
  rating: number | null
  rating_votes: number
  updated_at: string | null
  rating_gap: number | null
}

export type CategoryHistogramBucket = {
  bucket_start: number
  bucket_end: number
  item_count: number
}

export type CategoryTableRow = {
  extension_id: number
  extension_name: string
  extension_url: string | null
  users: number
  rating: number | null
  rating_votes: number
  rating_gap: number | null
  updated_at: string | null
}

export type CategoryExplorerData = {
  category: CategoryInfo
  scatter_points: CategoryScatterPoint[]
  users_histogram: CategoryHistogramBucket[]
  rating_histogram: CategoryHistogramBucket[]
  table: {
    page: number
    pageSize: number
    total: number
    rows: CategoryTableRow[]
  }
}

export type CategoryApiResponse = {
  generated_at: string
  filters_applied: GlobalFilters
  category: CategoryInfo
  scatter_points: CategoryScatterPoint[]
  users_histogram: CategoryHistogramBucket[]
  rating_histogram: CategoryHistogramBucket[]
  table: CategoryExplorerData['table']
  table_applied: CategoryTableParams
}
