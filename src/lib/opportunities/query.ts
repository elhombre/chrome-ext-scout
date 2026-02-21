import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { GlobalFilters } from '@/lib/filters/global'
import {
  OPPORTUNITIES_BAYES_PRIOR_WEIGHT,
  OPPORTUNITIES_COMPETITION_P95,
  OPPORTUNITIES_GAP_CAP_P90,
  OPPORTUNITIES_SCORE_DEMAND_WEIGHT,
  OPPORTUNITIES_SCORE_GAP_WEIGHT,
  OPPORTUNITIES_SCORE_INVERSE_COMPETITION_WEIGHT,
  OPPORTUNITIES_SCORE_SCALE,
  OPPORTUNITIES_USERS_P95,
  OPPORTUNITIES_VOTES_P95,
} from '@/lib/opportunities/constants'
import type { OpportunitiesParams } from '@/lib/opportunities/filters'
import type { OpportunitiesData, OpportunityPoint } from '@/lib/opportunities/types'
import { DEFAULT_TABLE_PAGE_SIZE } from '@/lib/pagination/constants'

type RawOpportunityRow = {
  category_id: number | string
  category_name: string
  extension_id: number | string
  extension_name: string
  extension_url: string | null
  users: number | string
  rating: number | string | null
  rating_votes: number | string
  category_avg_rating: number | string
  competition_count: number | string
  demand_norm: number | string
  competition_norm: number | string
  rating_gap: number | string
  confidence_norm: number | string
  gap_effective: number | string
  score: number | string
  total_count?: number | string
}

function toNumber(value: number | string) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function toNullableNumber(value: number | string | null) {
  if (value === null) {
    return null
  }

  return toNumber(value)
}

function buildOrderByClause(params: OpportunitiesParams) {
  const direction = params.sortDir === 'asc' ? 'asc' : 'desc'

  switch (params.sortBy) {
    case 'users':
      return `
        final.users ${direction},
        final.score desc,
        final.rating_votes desc,
        final.extension_id asc
      `
    case 'rating_gap':
      return `
        final.rating_gap ${direction},
        final.score desc,
        final.users desc,
        final.extension_id asc
      `
    case 'competition_count':
      return `
        final.competition_count ${direction},
        final.score desc,
        final.users desc,
        final.extension_id asc
      `
    default:
      return `
        final.score ${direction},
        final.users desc,
        final.rating_votes desc,
        final.extension_id asc
      `
  }
}

function mapOpportunityRow(row: RawOpportunityRow): OpportunityPoint {
  return {
    category_id: toNumber(row.category_id),
    category_name: row.category_name,
    extension_id: toNumber(row.extension_id),
    extension_name: row.extension_name,
    extension_url: row.extension_url,
    users: toNumber(row.users),
    rating: toNullableNumber(row.rating),
    rating_votes: toNumber(row.rating_votes),
    category_avg_rating: toNumber(row.category_avg_rating),
    competition_count: toNumber(row.competition_count),
    demand_norm: toNumber(row.demand_norm),
    competition_norm: toNumber(row.competition_norm),
    rating_gap: toNumber(row.rating_gap),
    confidence_norm: toNumber(row.confidence_norm),
    gap_effective: toNumber(row.gap_effective),
    score: toNumber(row.score),
  }
}

type GetOpportunitiesDataInput = {
  filters: GlobalFilters
  params: OpportunitiesParams
}

export async function getOpportunitiesData({ filters, params }: GetOpportunitiesDataInput): Promise<OpportunitiesData> {
  const db = getDb()
  const orderByClause = buildOrderByClause(params)
  const offset = (params.page - 1) * DEFAULT_TABLE_PAGE_SIZE

  const baseCte = sql`
    with extensions_base as (
      select
        e.id as extension_id,
        e.name as extension_name,
        e.canonical_url as extension_url,
        coalesce(e.users, 0)::double precision as users,
        e.rating,
        coalesce(e.rating_votes, 0)::double precision as rating_votes,
        coalesce(e.languages, '') as languages
      from extensions e
    ),
    top_excluded as (
      select
        b.extension_id
      from extensions_base b
      order by b.users desc, b.extension_id asc
      limit (
        case
          when ${filters.excludeTopPct} <= 0 then 0
          else ceil(
            (select count(*)::numeric from extensions_base)
            * (${filters.excludeTopPct}::numeric / 100.0)
          )::int
        end
      )
    ),
    filtered_extensions as (
      select
        b.extension_id,
        b.extension_name,
        b.extension_url,
        b.users,
        b.rating,
        b.rating_votes
      from extensions_base b
      left join top_excluded te on te.extension_id = b.extension_id
      where
        te.extension_id is null
        and b.users >= ${filters.minUsers}
        and (${filters.maxUsers}::double precision is null or b.users <= ${filters.maxUsers}::double precision)
        and b.rating is not null
        and b.rating >= ${filters.ratingMin}
        and b.rating <= ${filters.ratingMax}
        and (${filters.lang} = '' or b.languages ilike ('%' || ${filters.lang} || '%'))
        and (${filters.extName} = '' or b.extension_name ilike ('%' || ${filters.extName} || '%'))
    ),
    global_weighted as (
      select
        coalesce(sum(fe.rating * fe.rating_votes) filter (where fe.rating_votes > 0), 0)::double precision as weighted_sum,
        coalesce(sum(fe.rating_votes) filter (where fe.rating_votes > 0), 0)::double precision as weight_sum
      from filtered_extensions fe
    ),
    global_rating as (
      select
        case
          when gw.weight_sum > 0 then gw.weighted_sum / gw.weight_sum
          else 0
        end as c_rating
      from global_weighted gw
    ),
    category_aggregates as (
      select
        c.id as category_id,
        c.name as category_name,
        count(distinct fe.extension_id)::int as competition_count,
        coalesce(sum(fe.rating * fe.rating_votes) filter (where fe.rating is not null and fe.rating_votes > 0), 0)::double precision as rating_weighted_sum,
        coalesce(sum(fe.rating_votes) filter (where fe.rating is not null and fe.rating_votes > 0), 0)::double precision as rating_weight_sum
      from categories c
      left join category_extensions ce on ce.category_id = c.id
      left join filtered_extensions fe on fe.extension_id = ce.extension_id
      group by c.id, c.name
    ),
    category_scores as (
      select
        ca.category_id,
        ca.category_name,
        ca.competition_count,
        case
          when ca.rating_weight_sum > 0 then
            (ca.rating_weight_sum / (ca.rating_weight_sum + ${OPPORTUNITIES_BAYES_PRIOR_WEIGHT}::double precision))
            * (ca.rating_weighted_sum / ca.rating_weight_sum)
            + (${OPPORTUNITIES_BAYES_PRIOR_WEIGHT}::double precision / (ca.rating_weight_sum + ${OPPORTUNITIES_BAYES_PRIOR_WEIGHT}::double precision)) * gr.c_rating
          else gr.c_rating
        end as category_avg_rating
      from category_aggregates ca
      cross join global_rating gr
      where ca.competition_count > 0
    ),
    candidate_set as (
      select
        cs.category_id,
        cs.category_name,
        fe.extension_id,
        fe.extension_name,
        fe.extension_url,
        fe.users,
        fe.rating,
        fe.rating_votes,
        cs.category_avg_rating,
        cs.competition_count,
        greatest(cs.category_avg_rating - fe.rating, 0)::double precision as rating_gap
      from filtered_extensions fe
      join category_extensions ce on ce.extension_id = fe.extension_id
      join category_scores cs on cs.category_id = ce.category_id
    ),
    distribution as (
      select
        (select percentile_cont(${OPPORTUNITIES_USERS_P95}) within group (order by c.users) from candidate_set c) as p95_users,
        (select percentile_cont(${OPPORTUNITIES_VOTES_P95}) within group (order by c.rating_votes) from candidate_set c) as p95_votes,
        (
          select percentile_cont(${OPPORTUNITIES_COMPETITION_P95}) within group (order by cs.competition_count)
          from category_scores cs
        ) as p95_competition_count,
        (select percentile_cont(${OPPORTUNITIES_GAP_CAP_P90}) within group (order by c.rating_gap) from candidate_set c) as gap_cap
    ),
    normalized as (
      select
        c.category_id,
        c.category_name,
        c.extension_id,
        c.extension_name,
        c.extension_url,
        c.users,
        c.rating,
        c.rating_votes,
        c.category_avg_rating,
        c.competition_count,
        c.rating_gap,
        case
          when coalesce(d.p95_users, 0) > 0 then
            least(greatest(ln(c.users + 1) / ln(d.p95_users + 1), 0), 1)
          else 0
        end as demand_norm,
        case
          when coalesce(d.p95_competition_count, 0) > 0 then
            least(greatest(ln(c.competition_count + 1) / ln(d.p95_competition_count + 1), 0), 1)
          else 0
        end as competition_norm,
        case
          when coalesce(d.gap_cap, 0) > 0 then
            least(greatest(c.rating_gap / d.gap_cap, 0), 1)
          else 0
        end as rating_gap_norm,
        case
          when coalesce(d.p95_votes, 0) > 0 then
            least(greatest(ln(c.rating_votes + 1) / ln(d.p95_votes + 1), 0), 1)
          else 0
        end as confidence_norm
      from candidate_set c
      cross join distribution d
    ),
    final as (
      select
        n.category_id,
        n.category_name,
        n.extension_id,
        n.extension_name,
        n.extension_url,
        n.users,
        n.rating,
        n.rating_votes,
        n.category_avg_rating,
        n.competition_count,
        n.demand_norm,
        n.competition_norm,
        n.rating_gap,
        n.confidence_norm,
        (n.rating_gap_norm * n.confidence_norm)::double precision as gap_effective,
        (
          ${OPPORTUNITIES_SCORE_SCALE} * (
            ${OPPORTUNITIES_SCORE_DEMAND_WEIGHT} * n.demand_norm +
            ${OPPORTUNITIES_SCORE_GAP_WEIGHT} * (n.rating_gap_norm * n.confidence_norm) +
            ${OPPORTUNITIES_SCORE_INVERSE_COMPETITION_WEIGHT} * (1 - n.competition_norm)
          )
        )::double precision as score
      from normalized n
    )
  `

  const [tableResult, bubbleResult] = await Promise.all([
    sql<RawOpportunityRow>`
      ${baseCte}
      select
        scoped.category_id,
        scoped.category_name,
        scoped.extension_id,
        scoped.extension_name,
        scoped.extension_url,
        scoped.users,
        scoped.rating,
        scoped.rating_votes,
        scoped.category_avg_rating,
        scoped.competition_count,
        scoped.demand_norm,
        scoped.competition_norm,
        scoped.rating_gap,
        scoped.confidence_norm,
        scoped.gap_effective,
        scoped.score
      from (
        select final.*
        from final
        order by ${sql.raw(orderByClause)}
        limit ${params.limit}
      ) scoped
      limit ${DEFAULT_TABLE_PAGE_SIZE}
      offset ${offset}
    `.execute(db),
    sql<RawOpportunityRow>`
      ${baseCte}
      select
        scoped.category_id,
        scoped.category_name,
        scoped.extension_id,
        scoped.extension_name,
        scoped.extension_url,
        scoped.users,
        scoped.rating,
        scoped.rating_votes,
        scoped.category_avg_rating,
        scoped.competition_count,
        scoped.demand_norm,
        scoped.competition_norm,
        scoped.rating_gap,
        scoped.confidence_norm,
        scoped.gap_effective,
        scoped.score
      from (
        select final.*
        from final
        order by ${sql.raw(orderByClause)}
        limit ${params.limit}
      ) scoped
    `.execute(db),
  ])

  const tableRows = tableResult.rows.map(mapOpportunityRow)
  const bubblePoints = bubbleResult.rows.map(mapOpportunityRow)
  const totalCount = bubblePoints.length

  return {
    bubble_points: bubblePoints,
    table: {
      page: params.page,
      pageSize: DEFAULT_TABLE_PAGE_SIZE,
      total: totalCount,
      rows: tableRows,
    },
  }
}
