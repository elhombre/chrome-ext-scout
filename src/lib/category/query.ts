import { sql } from 'kysely'
import type { CategoryTableParams } from '@/lib/category/filters'
import type {
  CategoryExplorerData,
  CategoryHistogramBucket,
  CategoryScatterPoint,
  CategoryTableRow,
} from '@/lib/category/types'
import { getDb } from '@/lib/db'
import type { GlobalFilters } from '@/lib/filters/global'

type RawCategoryBase = {
  id: number | string
  name: string
}

type RawCategorySummary = {
  extension_count: number | string
  avg_rating: number | string
}

type RawScatterPoint = {
  extension_id: number | string
  extension_name: string
  extension_url: string | null
  users: number | string
  users_log: number | string
  rating: number | string | null
  rating_votes: number | string
  updated_at: string | null
  rating_gap: number | string | null
}

type RawHistogramBucket = {
  bucket_start: number | string
  bucket_end: number | string
  item_count: number | string
}

type RawTableRow = RawScatterPoint & {
  extension_url: string | null
  total_count: number | string
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

function buildFilteredExtensionsCte(filters: GlobalFilters) {
  return sql`
    extensions_base as (
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
    )
  `
}

function buildCategoryExplorerCte(filters: GlobalFilters, categoryId: number) {
  const filteredExtensionsCte = buildFilteredExtensionsCte(filters)

  return sql`
    ${filteredExtensionsCte},
    category_summary as (
      select
        count(distinct fe.extension_id)::int as extension_count,
        coalesce(sum(fe.rating * fe.rating_votes) filter (where fe.rating is not null and fe.rating_votes > 0), 0)::double precision as rating_weighted_sum,
        coalesce(sum(fe.rating_votes) filter (where fe.rating is not null and fe.rating_votes > 0), 0)::double precision as rating_weight_sum
      from category_extensions ce
      left join filtered_extensions fe on fe.extension_id = ce.extension_id
      where ce.category_id = ${categoryId}
    ),
    category_stats as (
      select
        cs.extension_count,
        case
          when cs.rating_weight_sum > 0 then
            (cs.rating_weight_sum / (cs.rating_weight_sum + 5000.0))
            * (cs.rating_weighted_sum / cs.rating_weight_sum)
            + (5000.0 / (cs.rating_weight_sum + 5000.0)) * gr.c_rating
          else gr.c_rating
        end as avg_rating
      from category_summary cs
      cross join global_rating gr
    ),
    category_extensions_view as (
      select
        e.id as extension_id,
        e.name as extension_name,
        e.canonical_url as extension_url,
        fe.users,
        fe.rating,
        fe.rating_votes,
        e.updated_at,
        case
          when fe.rating is null then null
          else cs.avg_rating - fe.rating
        end as rating_gap
      from category_extensions ce
      join filtered_extensions fe on fe.extension_id = ce.extension_id
      join extensions e on e.id = ce.extension_id
      cross join category_stats cs
      where ce.category_id = ${categoryId}
    )
  `
}

function buildOrderByClause(params: CategoryTableParams) {
  const direction = params.sortDir === 'asc' ? 'asc' : 'desc'

  switch (params.sortBy) {
    case 'rating':
      return `
        case when cex.rating is null then 1 else 0 end asc,
        cex.rating ${direction},
        cex.extension_id asc
      `
    case 'rating_gap':
      return `
        case when cex.rating_gap is null then 1 else 0 end asc,
        cex.rating_gap ${direction},
        cex.extension_id asc
      `
    default:
      return `
        cex.users ${direction},
        cex.extension_id asc
      `
  }
}

function mapScatterRow(row: RawScatterPoint): CategoryScatterPoint {
  return {
    extension_id: toNumber(row.extension_id),
    extension_name: row.extension_name,
    extension_url: row.extension_url,
    users: toNumber(row.users),
    users_log: toNumber(row.users_log),
    rating: toNullableNumber(row.rating),
    rating_votes: toNumber(row.rating_votes),
    updated_at: row.updated_at,
    rating_gap: toNullableNumber(row.rating_gap),
  }
}

function mapHistogramRow(row: RawHistogramBucket): CategoryHistogramBucket {
  return {
    bucket_start: toNumber(row.bucket_start),
    bucket_end: toNumber(row.bucket_end),
    item_count: toNumber(row.item_count),
  }
}

function mapTableRow(row: RawTableRow): CategoryTableRow {
  return {
    extension_id: toNumber(row.extension_id),
    extension_name: row.extension_name,
    extension_url: row.extension_url,
    users: toNumber(row.users),
    rating: toNullableNumber(row.rating),
    rating_votes: toNumber(row.rating_votes),
    updated_at: row.updated_at,
    rating_gap: toNullableNumber(row.rating_gap),
  }
}

type GetCategoryExplorerDataInput = {
  categoryId: number
  filters: GlobalFilters
  table: CategoryTableParams
}

export async function getCategoryExplorerData({
  categoryId,
  filters,
  table,
}: GetCategoryExplorerDataInput): Promise<CategoryExplorerData | null> {
  const db = getDb()

  const categoryResult = await sql<RawCategoryBase>`
    select
      c.id,
      c.name
    from categories c
    where c.id = ${categoryId}
    limit 1
  `.execute(db)

  const categoryRow = categoryResult.rows[0]

  if (!categoryRow) {
    return null
  }

  const cte = buildCategoryExplorerCte(filters, categoryId)
  const offset = (table.page - 1) * table.pageSize
  const orderByClause = buildOrderByClause(table)

  const [summaryResult, scatterResult, usersHistogramResult, ratingHistogramResult, tableRowsResult] =
    await Promise.all([
      sql<RawCategorySummary>`
      with ${cte}
      select
        cs.extension_count,
        cs.avg_rating
      from category_stats cs
    `.execute(db),
      sql<RawScatterPoint>`
      with ${cte}
      select
        cex.extension_id,
        cex.extension_name,
        cex.extension_url,
        cex.users,
        ln(cex.users + 1) as users_log,
        cex.rating,
        cex.rating_votes,
        cex.updated_at,
        cex.rating_gap
      from category_extensions_view cex
      order by cex.users desc, cex.extension_id asc
    `.execute(db),
      sql<RawHistogramBucket>`
      with ${cte}
      select
        case
          when buckets.bucket = 0 then 0
          else power(10::double precision, buckets.bucket - 1)
        end as bucket_start,
        case
          when buckets.bucket = 0 then 0
          else power(10::double precision, buckets.bucket) - 1
        end as bucket_end,
        buckets.item_count
      from (
        select
          case
            when cex.users <= 0 then 0
            when cex.users < 10 then 1
            else floor(ln(cex.users) / ln(10)) + 1
          end::int as bucket,
          count(*)::int as item_count
        from category_extensions_view cex
        group by 1
      ) as buckets
      order by buckets.bucket asc
    `.execute(db),
      sql<RawHistogramBucket>`
      with ${cte}
      select
        (floor(cex.rating / 0.25) * 0.25)::double precision as bucket_start,
        least((floor(cex.rating / 0.25) * 0.25) + 0.25, 5.0)::double precision as bucket_end,
        count(*)::int as item_count
      from category_extensions_view cex
      where cex.rating is not null
      group by 1, 2
      order by 1 asc
    `.execute(db),
      sql<RawTableRow>`
      with ${cte}
      select
        cex.extension_id,
        cex.extension_name,
        cex.extension_url,
        cex.users,
        cex.rating,
        cex.rating_votes,
        cex.updated_at,
        cex.rating_gap,
        count(*) over()::int as total_count
      from category_extensions_view cex
      order by ${sql.raw(orderByClause)}
      limit ${table.pageSize}
      offset ${offset}
    `.execute(db),
    ])

  const summaryRow = summaryResult.rows[0]

  const extensionCount = summaryRow ? toNumber(summaryRow.extension_count) : 0
  const avgRating = summaryRow ? toNumber(summaryRow.avg_rating) : 0

  const scatterPoints = scatterResult.rows.map(mapScatterRow)
  const usersHistogram = usersHistogramResult.rows.map(mapHistogramRow)
  const ratingHistogram = ratingHistogramResult.rows.map(mapHistogramRow)
  const tableRows = tableRowsResult.rows.map(mapTableRow)
  const tableTotal = tableRowsResult.rows[0] ? toNumber(tableRowsResult.rows[0].total_count) : 0

  return {
    category: {
      id: toNumber(categoryRow.id),
      name: categoryRow.name,
      avg_rating: avgRating,
      extension_count: extensionCount,
    },
    scatter_points: scatterPoints,
    users_histogram: usersHistogram,
    rating_histogram: ratingHistogram,
    table: {
      page: table.page,
      pageSize: table.pageSize,
      total: tableTotal,
      rows: tableRows,
    },
  }
}
