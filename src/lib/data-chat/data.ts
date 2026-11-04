import { AssetStatus, CardStatus, TaskStatus, VendorStatus, WorkOrderStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { PlatformError } from '@/lib/platform/server'
import type { Source } from './types'

type Delegate = { findMany(args: object): Promise<Record<string, unknown>[]>; count(args: object): Promise<number>; groupBy(args: object): Promise<unknown[]> }
type Dataset = { delegate: unknown; scope: (companyId: string) => object; search: string[]; select: object; statuses?: string[]; due?: string; href?: string }
const direct = (companyId: string) => ({ companyId })
const datasets: Record<string, Dataset> = {
  assets: { delegate: prisma.asset, scope: direct, search: ['name', 'equipmentId', 'serialNumber', 'make', 'model', 'category', 'currentLocation'], statuses: Object.values(AssetStatus), href: '/dashboard/assets/', select: { id: true, name: true, equipmentId: true, type: true, category: true, status: true, make: true, model: true, year: true, serialNumber: true, currentLocation: true, currentProjectId: true, currentAssigneeId: true, purchaseCost: true, purchaseDate: true, updatedAt: true, statusDefinition: { select: { name: true } } } satisfies Prisma.AssetSelect },
  projects: { delegate: prisma.card, scope: direct, search: ['title', 'projectNumber', 'projectCity', 'projectAddress'], statuses: Object.values(CardStatus), due: 'endDate', href: '/dashboard/projects/', select: { id: true, title: true, projectNumber: true, status: true, priority: true, budget: true, startDate: true, endDate: true, projectCity: true, projectAddress: true, updatedAt: true } satisfies Prisma.CardSelect },
  tasks: { delegate: prisma.task, scope: companyId => ({ card: { companyId } }), search: ['title'], statuses: Object.values(TaskStatus), due: 'dueDate', select: { id: true, title: true, status: true, priority: true, dueDate: true, cardId: true, assigneeId: true, completedAt: true, updatedAt: true } satisfies Prisma.TaskSelect },
  work_orders: { delegate: prisma.workOrder, scope: direct, search: ['title'], statuses: Object.values(WorkOrderStatus), due: 'scheduledDate', href: '/dashboard/assets/work-orders/', select: { id: true, title: true, status: true, assetId: true, scheduledDate: true, assignedToId: true, estimatedCost: true, actualCost: true, completedAt: true, updatedAt: true } satisfies Prisma.WorkOrderSelect },
  vendors: { delegate: prisma.vendor, scope: direct, search: ['name', 'companyName', 'city'], statuses: Object.values(VendorStatus), href: '/dashboard/vendors/', select: { id: true, name: true, companyName: true, type: true, status: true, city: true, isActive: true, updatedAt: true } satisfies Prisma.VendorSelect },
  contacts: { delegate: prisma.contact, scope: direct, search: ['firstName', 'lastName', 'companyName'], href: '/dashboard/contacts/', select: { id: true, firstName: true, lastName: true, companyName: true, position: true, updatedAt: true } satisfies Prisma.ContactSelect },
  inventory: { delegate: prisma.inventoryMaterial, scope: direct, search: ['name', 'sku'], select: { id: true, name: true, sku: true, quantity: true, unit: true, unitCost: true, updatedAt: true } satisfies Prisma.InventoryMaterialSelect },
  service_history: { delegate: prisma.assetServiceEntry, scope: companyId => ({ asset: { companyId } }), search: ['title'], due: 'performedDate', select: { id: true, assetId: true, title: true, performedDate: true, cost: true, workOrderId: true, createdAt: true } satisfies Prisma.AssetServiceEntrySelect },
}
export const dataTool = {
  type: 'function', function: { name: 'query_company_data', description: 'Read current company data. summary gives an exact count and status totals across all matching records. search returns up to 20 records per page (max 20 pages), with exact matching total. Counts include retired/archived records unless filtered. Use status enums exactly. Available statuses: ' + Object.entries(datasets).filter(([, d]) => d.statuses).map(([name, d]) => `${name}: ${d.statuses!.join(',')}`).join('; ') + '. dueBefore uses task due date, project end date, work order scheduled date, or service performed date. createdFrom/createdTo filter creation dates. No documents, credentials, notes, messages, or arbitrary queries are available.', parameters: { type: 'object', additionalProperties: false, required: ['dataset', 'operation'], properties: { dataset: { type: 'string', enum: Object.keys(datasets) }, operation: { type: 'string', enum: ['summary', 'search'] }, search: { type: 'string', maxLength: 120 }, id: { type: 'string', maxLength: 100 }, status: { type: 'string', maxLength: 40 }, assetId: { type: 'string', maxLength: 100 }, projectId: { type: 'string', maxLength: 100 }, dueBefore: { type: 'string', description: 'YYYY-MM-DD, inclusive UTC' }, createdFrom: { type: 'string', description: 'YYYY-MM-DD' }, createdTo: { type: 'string', description: 'YYYY-MM-DD, inclusive UTC' }, page: { type: 'integer', minimum: 1, maximum: 20 } } } },
}
function date(value: unknown, end: boolean) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PlatformError('Use YYYY-MM-DD dates.')
  const result = new Date(value + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'))
  if (isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new PlatformError('Invalid calendar date.')
  return result
}
export async function queryData(companyId: string, input: unknown): Promise<{ data: unknown; source: Source }> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) throw new PlatformError('Expected query parameters.')
  const args = input as Record<string, unknown>
  if (Object.keys(args).some(k => !Object.hasOwn(dataTool.function.parameters.properties, k))) throw new PlatformError('Unsupported query parameter.')
  const dataset = typeof args.dataset === 'string' && Object.hasOwn(datasets, args.dataset) ? datasets[args.dataset] : null
  if (!dataset || (args.operation !== 'summary' && args.operation !== 'search')) throw new PlatformError('Unsupported dataset or operation.')
  for (const key of ['search', 'id', 'status', 'assetId', 'projectId']) if (args[key] !== undefined && (typeof args[key] !== 'string' || (args[key] as string).length > 120)) throw new PlatformError('Invalid query filter.')
  const page = args.page ?? 1
  if (!Number.isInteger(page) || Number(page) < 1 || Number(page) > 20) throw new PlatformError('Page must be between 1 and 20.')
  const filters: Record<string, unknown> = {}
  if (args.id) filters.id = args.id
  if (args.status) { if (!dataset.statuses?.includes(String(args.status))) throw new PlatformError('Invalid status for this dataset.'); filters.status = args.status }
  if (args.assetId) { if (!['work_orders', 'service_history'].includes(String(args.dataset))) throw new PlatformError('Asset filter is unavailable for this dataset.'); filters.assetId = args.assetId }
  if (args.projectId) { if (!['assets', 'tasks'].includes(String(args.dataset))) throw new PlatformError('Project filter is unavailable for this dataset.'); filters[args.dataset === 'assets' ? 'currentProjectId' : 'cardId'] = args.projectId }
  if (args.search) filters.OR = dataset.search.map(key => ({ [key]: { contains: args.search, mode: 'insensitive' } }))
  if (args.dueBefore) { if (!dataset.due) throw new PlatformError('Due-date filter is unavailable for this dataset.'); filters[dataset.due] = { lte: date(args.dueBefore, true) } }
  if (args.createdFrom || args.createdTo) filters.createdAt = { ...(args.createdFrom ? { gte: date(args.createdFrom, false) } : {}), ...(args.createdTo ? { lte: date(args.createdTo, true) } : {}) }
  // The scope is constructed exclusively by the server and cannot be overridden.
  const where = { AND: [dataset.scope(companyId), filters] }, delegate = dataset.delegate as Delegate
  const total = await delegate.count({ where })
  const source: Source = { dataset: String(args.dataset), operation: String(args.operation), total, returned: 0, filters: args, records: [] }
  if (args.operation === 'summary') {
    const groups = dataset.statuses ? await delegate.groupBy({ by: ['status'], where, _count: { _all: true }, orderBy: { status: 'asc' } }) as { status: string; _count: { _all: number } }[] : []
    source.groups = groups.map(group => ({ label: group.status, count: group._count._all }))
    return { data: { total, ...(dataset.statuses ? { byStatus: source.groups } : {}) }, source }
  }
  const rows = await delegate.findMany({ where, select: dataset.select, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 20, skip: (Number(page) - 1) * 20 })
  // Bound even database text: records remain untrusted data, never instructions.
  const bounded = JSON.parse(JSON.stringify(rows, (_key, value) => typeof value === 'string' ? value.slice(0, 500) : value)) as Record<string, unknown>[]
  source.returned = rows.length
  source.records = bounded.map(row => ({ id: String(row.id), label: String(row.name || row.title || `${row.firstName} ${row.lastName}`).slice(0, 160), ...(dataset.href ? { href: dataset.href + encodeURIComponent(String(row.id)) } : {}) }))
  return { data: { total, page, pageSize: 20, records: bounded, hasMore: Number(page) * 20 < total }, source }
}
