import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditData } from '@/lib/platform/audit'
import { companySelect } from '@/lib/platform/companies'
import { actorFor, email, failure, input, pageArgs, PlatformError, privateHeaders, requirePlatform, text } from '@/lib/platform/server'
import { requestOrigin } from '@/lib/import-review/server'

export async function GET(request: NextRequest) {
  try {
    await requirePlatform(request)
    const { params, page, take, skip, search } = pageArgs(request), status = params.get('status')
    if (status && !['ACTIVE', 'SUSPENDED'].includes(status)) throw new PlatformError('Invalid company status.')
    const attention = params.get('attention'), month = new Date(Date.now() - 30 * 86400000)
    const attentionFilter = attention === 'missing-admin' ? { status: 'ACTIVE' as const, users: { none: { isActive: true, role: 'ADMIN' as const } } } : attention === 'inactive' ? { status: 'ACTIVE' as const, createdAt: { lt: month }, users: { none: { lastLogin: { gte: month } } } } : attention === 'expired-invites' ? { status: 'ACTIVE' as const, teamInvites: { some: { isAccepted: false, expiresAt: { lt: new Date() } } } } : {}
    const createdAfter = params.get('createdAfter')
    const createdDate = createdAfter ? new Date(createdAfter + 'T00:00:00.000Z') : undefined
    if (createdAfter && (!/^\d{4}-\d{2}-\d{2}$/.test(createdAfter) || Number.isNaN(createdDate!.getTime()) || createdDate!.toISOString().slice(0, 10) !== createdAfter)) throw new PlatformError('Invalid date.')
    const where = { AND: [attentionFilter, ...(status ? [{ status: status as 'ACTIVE' | 'SUSPENDED' }] : []), ...(createdDate ? [{ createdAt: { gte: createdDate } }] : [])], ...(search ? { OR: [{ name: { contains: search, mode: 'insensitive' as const } }, { email: { contains: search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await prisma.$transaction([
      prisma.company.findMany({ where, select: companySelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take, skip }), prisma.company.count({ where }),
    ])
    const activity = items.length ? await prisma.auditEvent.groupBy({ by: ['companyId'], where: { companyId: { in: items.map(c => c.id) }, outcome: 'SUCCEEDED' }, _max: { createdAt: true } }) : []
    return NextResponse.json({ items: items.map(c => ({ ...c, lastActivity: activity.find(a => a.companyId === c.id)?._max.createdAt || null })), total, page, pageSize: take }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requirePlatform(request), body = await input(request)
    const name = text(body.name, 'Company name'), adminEmail = email(body.adminEmail), firstName = text(body.firstName, 'First name', 80), lastName = text(body.lastName, 'Last name', 80), reason = text(body.reason, 'Reason', 500)
    const result = await prisma.$transaction(async tx => {
      // Serialize email reservations, including concurrent company creation requests.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${adminEmail}))`
      if (await tx.user.findFirst({ where: { email: { equals: adminEmail, mode: 'insensitive' } } }) || await tx.teamInvite.findFirst({ where: { email: { equals: adminEmail, mode: 'insensitive' }, isAccepted: false, expiresAt: { gt: new Date() } } })) throw new PlatformError('This email already has an account or pending invitation. Resolve the existing association first.', 409)
      const company = await tx.company.create({ data: { name, email: adminEmail } })
      const invite = await tx.teamInvite.create({ data: { companyId: company.id, email: adminEmail, firstName, lastName, role: 'ADMIN', token: randomBytes(32).toString('hex'), invitedById: user.id, expiresAt: new Date(Date.now() + 7 * 86400000) } })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: company.id, companyName: company.name, module: 'companies', action: 'created', resourceId: company.id, summary: `Created ${company.name} and an initial administrator invitation`, reason, after: company }) })
      return { id: company.id, inviteUrl: `${requestOrigin(request)}/invite/${invite.token}`, expiresAt: invite.expiresAt }
    })
    return NextResponse.json(result, { status: 201, headers: privateHeaders })
  } catch (error) { return failure(error) }
}
