import { AssetStatus, Prisma } from '@prisma/client'
import { defaultAssetTypes } from './type-options'

// Only authored SQL fragments may be used as sort expressions or directions.
const sortExpressions = {
  equipmentId: Prisma.sql`LOWER(COALESCE(NULLIF(a."equipmentId", ''), a.name))`,
  name: Prisma.sql`LOWER(a.name)`,
  category: Prisma.sql`LOWER(COALESCE(a.category, ''))`,
  makeModel: Prisma.sql`LOWER(CONCAT_WS(' ', NULLIF(a.make, ''), NULLIF(a.model, ''), a.year))`,
  type: Prisma.sql`LOWER(COALESCE(t.name, a.type))`,
  status: Prisma.sql`COALESCE(s.name, a.status::text)`,
  location: Prisma.sql`LOWER(COALESCE(c.title, y.name, NULLIF(a."currentLocation", ''), 'zzz'))`,
  assignee: Prisma.sql`LOWER(COALESCE(u."firstName" || ' ' || u."lastName", 'zzz'))`,
  cost: Prisma.sql`COALESCE(a."purchaseCost", 0)`,
}

export class AssetListValidationError extends Error {}

// Plural filters are JSON arrays: [] means no matches. Omitted type/category
// includes all; omitted status defaults to non-retired below. Single values
// remain supported for existing callers.
function selections(params: URLSearchParams, plural: string, singular: string): string[] | undefined {
  if (!params.has(plural)) {
    const value = params.get(singular)?.trim()
    return value ? [value] : undefined
  }
  let values: unknown
  try { values = JSON.parse(params.get(plural)!) } catch {
    throw new AssetListValidationError(`Invalid ${plural} selection`)
  }
  if (!Array.isArray(values) || values.length > 1000 || values.some(value => typeof value !== 'string')) {
    throw new AssetListValidationError(`Invalid ${plural} selection`)
  }
  return [...new Set((values as string[]).map(value => value.trim()))]
}

function positiveInteger(params: URLSearchParams, name: string, fallback: number, maximum: number) {
  const value = params.get(name)
  if (value === null) return fallback
  if (!/^\d+$/.test(value) || !Number.isSafeInteger(Number(value)) || Number(value) < 1 || Number(value) > maximum) {
    throw new AssetListValidationError(`${name} must be an integer between 1 and ${maximum}`)
  }
  return Number(value)
}

export function parseAssetListParams(params: URLSearchParams) {
  const page = positiveInteger(params, 'page', 1, 2_147_483_647)
  const pageSize = positiveInteger(params, 'pageSize', 25, 100)
  const types = selections(params, 'types', 'type')
  const statuses = selections(params, 'statuses', 'status') ?? Object.values(AssetStatus).filter(status => status !== 'RETIRED')
  const categories = selections(params, 'categories', 'category')
  const search = params.get('search')?.trim() || ''
  const sortField = params.get('sortField') ?? 'equipmentId'
  const sortDirection = params.get('sortDirection') ?? 'asc'
  if (types?.some(type => !/^[A-Z0-9_]{1,100}$/.test(type))) throw new AssetListValidationError('Invalid asset type')
  if (statuses.some(status => !Object.values(AssetStatus).includes(status as AssetStatus))) throw new AssetListValidationError('Invalid asset status')
  if (categories?.some(category => category.length > 100)) throw new AssetListValidationError('Category must be 100 characters or fewer')
  if (search.length > 200) throw new AssetListValidationError('Search must be 200 characters or fewer')
  if (!Object.hasOwn(sortExpressions, sortField)) throw new AssetListValidationError('Invalid sort field')
  if (sortDirection !== 'asc' && sortDirection !== 'desc') throw new AssetListValidationError('Invalid sort direction')
  return { page, pageSize, types, statuses, categories, search, sortField: sortField as keyof typeof sortExpressions, sortDirection }
}

type AssetListParams = ReturnType<typeof parseAssetListParams>

// No attachments, service counts, notes, sharing tokens, or purchase/financing details
// are needed to render the table. Relations are fetched only for the requested page.
const assetListSelect = {
  id: true, equipmentId: true, name: true, category: true, type: true,
  serialNumber: true, make: true, model: true, year: true, status: true,
  currentLocation: true, purchaseCost: true,
  currentProject: { select: { title: true } },
  currentYard: { select: { name: true } },
  currentAssignee: { select: { id: true, firstName: true, lastName: true } },
  statusDefinition: { select: { id: true, name: true, baseStatus: true, color: true } },
} satisfies Prisma.AssetSelect

export type AssetListItem = Prisma.AssetGetPayload<{ select: typeof assetListSelect }>
export interface AssetListResponse {
  data: AssetListItem[]
  pagination: { page: number; pageSize: number; total: number; totalPages: number }
  summary: { availableCount: number; inUseCount: number; maintenanceCount: number; totalValue: number }
}

export async function listAssets(tx: Prisma.TransactionClient, companyId: string, params: AssetListParams): Promise<AssetListResponse> {
  if (params.types?.length) {
    const stored = await tx.assetTypeDefinition.findMany({ where: { companyId }, select: { key: true } })
    const known = new Set([...defaultAssetTypes, ...stored].map(type => type.key))
    if (params.types.some(type => !known.has(type))) throw new AssetListValidationError('Invalid asset type')
  }
  const conditions = [Prisma.sql`a."companyId" = ${companyId}`]
  if (params.types) conditions.push(params.types.length
    ? Prisma.sql`a.type IN (${Prisma.join(params.types.map(type => Prisma.sql`${type}`))})` : Prisma.sql`FALSE`)
  conditions.push(params.statuses.length
    ? Prisma.sql`a.status IN (${Prisma.join(params.statuses.map(status => Prisma.sql`${status}::"AssetStatus"`))})` : Prisma.sql`FALSE`)
  if (params.categories) conditions.push(params.categories.length
    ? Prisma.sql`LOWER(COALESCE(a.category, '')) IN (${Prisma.join(params.categories.map(category => Prisma.sql`LOWER(${category})`))})` : Prisma.sql`FALSE`)
  const where = Prisma.join(conditions, ' AND ')
  // STRPOS preserves literal substring search: %, _ and backslashes aren't wildcards.
  const search = params.search ? Prisma.sql`(
    STRPOS(LOWER(a.name), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a."equipmentId"), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a.category), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a."serialNumber"), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a.make), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a.model), LOWER(${params.search})) > 0 OR
    STRPOS(LOWER(a."currentLocation"), LOWER(${params.search})) > 0
  )` : Prisma.sql`TRUE`

  // Summary retains the existing type/status/category scope; text search only
  // narrows the result count and rows. All aggregates stay inside PostgreSQL.
  const [totals] = await tx.$queryRaw<Array<AssetListResponse['summary'] & { total: number }>>(Prisma.sql`
    SELECT COUNT(*) FILTER (WHERE ${search})::int AS total,
      COUNT(*) FILTER (WHERE a.status = 'AVAILABLE')::int AS "availableCount",
      COUNT(*) FILTER (WHERE a.status = 'IN_USE')::int AS "inUseCount",
      COUNT(*) FILTER (WHERE a.status = 'UNDER_MAINTENANCE')::int AS "maintenanceCount",
      COALESCE(SUM(a."purchaseCost"), 0)::float8 AS "totalValue"
    FROM "Asset" a WHERE ${where}
  `)
  const { total, ...summary } = totals
  const totalPages = Math.max(1, Math.ceil(total / params.pageSize))
  const page = Math.min(params.page, totalPages)
  const pagination = { page, pageSize: params.pageSize, total, totalPages }
  if (total === 0) return { data: [], pagination, summary }

  const joins = params.sortField === 'type' ? Prisma.sql`LEFT JOIN "AssetTypeDefinition" t ON t."companyId" = a."companyId" AND t.key = a.type` : params.sortField === 'status'
    ? Prisma.sql`LEFT JOIN "AssetStatusDefinition" s ON s.id = a."statusDefinitionId"`
    : params.sortField === 'assignee'
      ? Prisma.sql`LEFT JOIN "User" u ON u.id = a."currentAssigneeId"`
      : params.sortField === 'location'
        ? Prisma.sql`LEFT JOIN "Card" c ON c.id = a."currentProjectId" LEFT JOIN "AssetYard" y ON y.id = a."currentYardId"`
        : Prisma.empty
  const direction = params.sortDirection === 'desc' ? Prisma.sql`DESC` : Prisma.sql`ASC`
  // Stable tie breakers prevent equal sort values from moving between pages.
  const ids = await tx.$queryRaw<Array<{ id: string }>>(Prisma.sql`
    SELECT a.id FROM "Asset" a ${joins}
    WHERE ${where} AND ${search}
    ORDER BY ${sortExpressions[params.sortField]} ${direction}, a."createdAt" DESC, a.id ASC
    LIMIT ${params.pageSize} OFFSET ${(page - 1) * params.pageSize}
  `)
  const rows = await tx.asset.findMany({
    where: { companyId, id: { in: ids.map(asset => asset.id) } },
    select: assetListSelect,
  })
  const rowsById = new Map(rows.map(asset => [asset.id, asset]))
  return { data: ids.map(({ id }) => rowsById.get(id)!), pagination, summary }
}
