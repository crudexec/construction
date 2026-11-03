import { Prisma, type AuditEvent } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { recordAudit } from '@/lib/platform/audit'
import { actorFor, failure, pageArgs, PlatformError, privateHeaders, requirePlatform } from '@/lib/platform/server'

function date(value: string | null, end = false) {
  if (!value) return undefined
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) throw new PlatformError('Enter a valid date.')
  const result = new Date(value + (end ? 'T23:59:59.999Z' : 'T00:00:00.000Z'))
  if (Number.isNaN(result.getTime()) || result.toISOString().slice(0, 10) !== value) throw new PlatformError('Enter a valid date.')
  return result
}
const cell = (value: unknown) => {
  let text = String(value ?? '')
  if (/^[\s]*[=+\-@\t\r]/.test(text)) text = "'" + text
  return '"' + text.replaceAll('"', '""') + '"'
}
export async function GET(request: NextRequest) {
  try {
    const user = await requirePlatform(request), { params, page, skip, take, search } = pageArgs(request)
    const companyId = params.get('companyId'), actorId = params.get('actorId'), module = params.get('module'), outcome = params.get('outcome'), scope = params.get('scope')
    const from = date(params.get('from')), to = date(params.get('to'), true)
    if (from && to && from > to) throw new PlatformError('Start date must be before end date.')
    if (outcome && !['SUCCEEDED', 'FAILED'].includes(outcome)) throw new PlatformError('Invalid outcome.')
    if (scope && !['COMPANY', 'PLATFORM'].includes(scope)) throw new PlatformError('Invalid scope.')
    const createdAt = from || to ? { gte: from, lte: to } : undefined
    if (params.get('source') === 'legacy') {
      if (!companyId) throw new PlatformError('Choose a company for legacy activity.')
      if (params.get('format')) throw new PlatformError('Export the audited feed; legacy activity remains available for reference.')
      const where = { card: { companyId }, ...(params.get('actor') ? { user: { OR: [{ firstName: { contains: params.get('actor')!.slice(0, 160), mode: 'insensitive' as const } }, { lastName: { contains: params.get('actor')!.slice(0, 160), mode: 'insensitive' as const } }] } } : {}), ...(actorId ? { userId: actorId } : {}), ...(search ? { description: { contains: search, mode: 'insensitive' as const } } : {}), createdAt }
      const [rows, total] = await prisma.$transaction([prisma.activity.findMany({ where, include: { user: { select: { firstName: true, lastName: true } } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], skip, take }), prisma.activity.count({ where })])
      return NextResponse.json({ items: rows.map(r => ({ id: r.id, createdAt: r.createdAt, actorName: `${r.user.firstName} ${r.user.lastName}`, actorId: r.userId, actorType: 'LEGACY', module: 'projects', action: r.type, summary: r.description, outcome: 'LEGACY', resourceId: r.cardId, scope: 'COMPANY' })), total, page, pageSize: take }, { headers: privateHeaders })
    }
    const where: Prisma.AuditEventWhereInput = {
      ...(companyId ? { companyId } : {}), ...(actorId ? { actorId } : {}), ...(params.get('actor') ? { actorName: { contains: params.get('actor')!.slice(0, 160), mode: 'insensitive' as const } } : {}), ...(module ? { module: module.slice(0, 100) } : {}), ...(scope ? { scope } : {}),
      outcome: outcome || { in: ['SUCCEEDED', 'FAILED'] }, createdAt,
      ...(search ? { OR: [{ summary: { contains: search, mode: 'insensitive' } }, { actorName: { contains: search, mode: 'insensitive' } }, { companyName: { contains: search, mode: 'insensitive' } }, { resourceId: { contains: search } }] } : {}),
    }
    const incomplete = params.get('incomplete') === 'true'
    // Keep the anti-join, filters, count and pagination in PostgreSQL. Fetching a
    // fixed prefix of ids first would silently omit older companies' attempts.
    const clauses = [Prisma.sql`a.outcome='STARTED'`, Prisma.sql`a."createdAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes'`, Prisma.sql`NOT EXISTS (SELECT 1 FROM "AuditEvent" b WHERE b."requestId"=a."requestId" AND b.outcome IN ('SUCCEEDED','FAILED'))`]
    if (companyId) clauses.push(Prisma.sql`a."companyId"=${companyId}`)
    if (actorId) clauses.push(Prisma.sql`a."actorId"=${actorId}`)
    const contains = (value: string) => '%' + value.replace(/[\\%_]/g, '\\$&') + '%'
    if (params.get('actor')) clauses.push(Prisma.sql`a."actorName" ILIKE ${contains(params.get('actor')!.slice(0, 160))}`)
    if (module) clauses.push(Prisma.sql`a.module=${module.slice(0, 100)}`)
    if (scope) clauses.push(Prisma.sql`a.scope=${scope}`)
    if (from) clauses.push(Prisma.sql`a."createdAt">=${from}`)
    if (to) clauses.push(Prisma.sql`a."createdAt"<=${to}`)
    if (search) clauses.push(Prisma.sql`(a.summary ILIKE ${contains(search)} OR a."actorName" ILIKE ${contains(search)} OR a."companyName" ILIKE ${contains(search)} OR a."resourceId" LIKE ${contains(search)})`)
    const incompleteWhere = Prisma.join(clauses, ' AND ')
    const count = async () => incomplete ? Number((await prisma.$queryRaw<{ total: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS total FROM "AuditEvent" a WHERE ${incompleteWhere}`))[0].total) : prisma.auditEvent.count({ where })
    const rows = (limit: number, offset = 0) => incomplete ? prisma.$queryRaw<AuditEvent[]>(Prisma.sql`SELECT a.* FROM "AuditEvent" a WHERE ${incompleteWhere} ORDER BY a."createdAt" DESC, a.id DESC LIMIT ${limit} OFFSET ${offset}`) : prisma.auditEvent.findMany({ where, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: limit, skip: offset })
    if (params.get('format') === 'csv') {
      const total = await count()
      if (total > 10000) throw new PlatformError('This export exceeds 10,000 events. Narrow the company or date filters first.')
      const exported = await rows(10000)
      const csv = [['Time (UTC)', 'Company', 'Actor', 'Actor type', 'Module', 'Action', 'Outcome', 'Summary', 'Record', 'Reason', 'Before', 'After'].map(cell).join(','), ...exported.map(r => [r.createdAt.toISOString(), r.companyName, r.actorName, r.actorType, r.module, r.action, r.outcome, r.summary, r.resourceId, r.reason, JSON.stringify(r.before), JSON.stringify(r.after)].map(cell).join(','))].join('\r\n')
      const company = companyId ? await prisma.company.findUnique({ where: { id: companyId }, select: { name: true } }) : null
      await recordAudit({ ...actorFor(user), ...(companyId && company ? { companyId, companyName: company.name } : {}), module: 'audit', action: 'exported', summary: `Exported ${exported.length} audit events`, after: { count: exported.length } })
      return new NextResponse(csv, { headers: { ...privateHeaders, 'Content-Type': 'text/csv; charset=utf-8', 'Content-Disposition': 'attachment; filename="buildflo-activity.csv"' } })
    }
    const [items, total] = await Promise.all([rows(take, skip), count()])
    return NextResponse.json({ items, total, page, pageSize: take }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
