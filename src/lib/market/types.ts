import type { MarketFilters } from '@/lib/market/filters'

export type MarketCategory = {
  category_id: number
  category_name: string
  total_extensions: number
  total_users: number
  avg_rating: number
  underserved_index: number
}

export type MarketApiResponse = {
  generated_at: string
  filters_applied: MarketFilters
  categories: MarketCategory[]
}
