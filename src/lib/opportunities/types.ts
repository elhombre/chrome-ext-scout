import type { GlobalFilters } from '@/lib/filters/global'
import type { OpportunitiesParams } from '@/lib/opportunities/filters'

export type OpportunityPoint = {
  category_id: number
  category_name: string
  extension_id: number
  extension_name: string
  extension_url: string | null
  users: number
  rating: number | null
  rating_votes: number
  category_avg_rating: number
  competition_count: number
  demand_norm: number
  competition_norm: number
  rating_gap: number
  confidence_norm: number
  gap_effective: number
  score: number
}

export type OpportunitiesData = {
  bubble_points: OpportunityPoint[]
  table: {
    page: number
    pageSize: number
    total: number
    rows: OpportunityPoint[]
  }
}

export type OpportunitiesApiResponse = {
  generated_at: string
  filters_applied: GlobalFilters
  bubble_points: OpportunityPoint[]
  table: OpportunitiesData['table']
  table_applied: OpportunitiesParams
}
