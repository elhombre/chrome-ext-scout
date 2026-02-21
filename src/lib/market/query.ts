import { sql } from 'kysely'

import { getDb } from '@/lib/db'
import type { MarketFilters } from '@/lib/market/filters'
import type { MarketCategory } from '@/lib/market/types'

type RawMarketCategory = {
  category_id: number | string
  category_name: string
  total_extensions: number | string
  total_users: number | string
  avg_rating: number | string
  underserved_index: number | string
}

function toNumber(value: number | string) {
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export async function getMarketCategories(filters: MarketFilters): Promise<MarketCategory[]> {
  const db = getDb()

  const result = await sql<RawMarketCategory>`
    with extensions_base as (
      select
        e.id as extension_id,
        e.name as extension_name,
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
        count(distinct fe.extension_id)::int as total_extensions,
        coalesce(sum(fe.users), 0)::double precision as total_users,
        coalesce(sum(fe.rating * fe.rating_votes) filter (where fe.rating_votes > 0), 0)::double precision as rating_weighted_sum,
        coalesce(sum(fe.rating_votes) filter (where fe.rating_votes > 0), 0)::double precision as rating_weight_sum
      from categories c
      left join category_extensions ce on ce.category_id = c.id
      left join filtered_extensions fe on fe.extension_id = ce.extension_id
      group by c.id, c.name
    ),
    category_scores as (
      select
        ca.category_id,
        ca.category_name,
        ca.total_extensions,
        ca.total_users,
        case
          when ca.rating_weight_sum > 0 then
            (ca.rating_weight_sum / (ca.rating_weight_sum + 5000.0))
            * (ca.rating_weighted_sum / ca.rating_weight_sum)
            + (5000.0 / (ca.rating_weight_sum + 5000.0)) * gr.c_rating
          else gr.c_rating
        end as avg_rating
      from category_aggregates ca
      cross join global_rating gr
    ),
    distribution as (
      select
        percentile_cont(0.95) within group (order by cs.total_users) as p95_total_users
      from category_scores cs
      where cs.total_extensions > 0
    ),
    normalized as (
      select
        cs.category_id,
        cs.category_name,
        cs.total_extensions,
        cs.total_users,
        cs.avg_rating,
        case
          when coalesce(d.p95_total_users, 0) > 0 then
            least(greatest(ln(cs.total_users + 1) / ln(d.p95_total_users + 1), 0), 1)
          else 0
        end as users_norm,
        least(greatest(cs.avg_rating / 5.0, 0), 1) as rating_norm
      from category_scores cs
      cross join distribution d
      where cs.total_extensions > 0
    )
    select
      n.category_id,
      n.category_name,
      n.total_extensions,
      n.total_users,
      n.avg_rating,
      (n.users_norm * (1 - n.rating_norm))::double precision as underserved_index
    from normalized n
    order by n.total_users desc, n.category_id asc
  `.execute(db)

  return result.rows.map(row => ({
    category_id: toNumber(row.category_id),
    category_name: row.category_name,
    total_extensions: toNumber(row.total_extensions),
    total_users: toNumber(row.total_users),
    avg_rating: toNumber(row.avg_rating),
    underserved_index: toNumber(row.underserved_index),
  }))
}
