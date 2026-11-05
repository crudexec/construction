import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { Prisma } from '@prisma/client'
import { deleteCompanyRecords } from '@/lib/platform/delete-company'
import { auditData } from '@/lib/platform/audit'
import { companySelect, lockCompany } from '@/lib/platform/companies'
import { actorFor, email, failure, input, PlatformError, privateHeaders, requirePlatform, text } from '@/lib/platform/server'

type Context = { params: Promise<{ id: string }> }
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params
    const body = await input(request), reason = text(body.reason, 'Reason', 500)
    await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id)
      if (body.confirmationName !== company.name) throw new PlatformError('Type the exact company name to confirm deletion.')
      // Serialize against platform grants (which reference these user rows).
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE "companyId"=${id} FOR UPDATE`)
      if (id === user.companyId || await tx.platformAdmin.count({ where: { user: { companyId: id } } })) {
        throw new PlatformError('A company containing a platform administrator cannot be deleted.', 409)
      }
      await deleteCompanyRecords(tx, id)
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'companies', action: 'deleted', resourceId: id, summary: `Deleted ${company.name} and its company records`, reason, before: company }) })
    }, { timeout: 60000 })
    return NextResponse.json({ deleted: true }, { headers: privateHeaders })
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2003') return failure(new PlatformError('Linked records prevented deletion. No changes were saved. Review this company’s relationships before trying again.', 409))
    return failure(error)
  }
}
export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePlatform(request); const { id } = await context.params
    const company = await prisma.company.findUnique({ where: { id }, select: companySelect })
    if (!company) throw new PlatformError('Company not found.', 404)
    const [activeUsers, pendingInvites, lastEvent, lastLogin] = await Promise.all([
      prisma.user.count({ where: { companyId: id, isActive: true } }),
      prisma.teamInvite.count({ where: { companyId: id, isAccepted: false } }),
      prisma.auditEvent.findFirst({ where: { companyId: id, outcome: 'SUCCEEDED' }, orderBy: { createdAt: 'desc' }, select: { createdAt: true } }),
      prisma.user.aggregate({ where: { companyId: id }, _max: { lastLogin: true } }),
    ])
    return NextResponse.json({ ...company, activeUsers, pendingInvites, lastActivity: lastEvent?.createdAt || null, lastLogin: lastLogin._max.lastLogin }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request), reason = text(body.reason, 'Reason', 500)
    const result = await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id)
      if (body.action === 'suspend' || body.action === 'reactivate' || body.action === 'revoke-sessions') {
        if (body.action === 'suspend' && await tx.platformAdmin.count({ where: { user: { companyId: id } } })) throw new PlatformError('A company containing a platform administrator cannot be suspended.', 409)
        const status = body.action === 'suspend' ? 'SUSPENDED' : body.action === 'reactivate' ? 'ACTIVE' : company.status
        const updated = await tx.company.update({ where: { id }, data: { status, accessVersion: { increment: 1 }, ...(body.action !== 'revoke-sessions' ? { suspendedAt: status === 'SUSPENDED' ? new Date() : null, suspensionReason: status === 'SUSPENDED' ? reason : null } : {}) } })
        await tx.platformSession.deleteMany({ where: { admin: { user: { companyId: id } } } })
        await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'companies', action: body.action, resourceId: id, summary: body.action === 'suspend' ? `Suspended ${company.name}` : body.action === 'reactivate' ? `Reactivated ${company.name}` : `Revoked sessions for ${company.name}`, reason, before: company, after: updated }) })
        return { id, status }
      }
      if (body.action !== 'edit') throw new PlatformError('Unknown company action.')
      const data: Record<string, string | null> = {}
      for (const key of ['name', 'appName', 'email', 'phone', 'website', 'address', 'city', 'state', 'zipCode', 'country', 'currency']) {
        if (body[key] === undefined) continue
        if (['name', 'appName', 'currency'].includes(key)) data[key] = text(body[key], key, key === 'currency' ? 3 : 160)
        else if (key === 'email' && body[key]) data[key] = email(body[key])
        else data[key] = body[key] === '' || body[key] === null ? null : text(body[key], key, 300)
      }
      if (data.currency && !/^[A-Z]{3}$/.test(data.currency)) throw new PlatformError('Currency must be a three-letter code.')
      const updated = await tx.company.update({ where: { id }, data })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'companies', action: 'updated', resourceId: id, summary: `Updated ${company.name}`, reason, before: company, after: updated }) })
      return { id }
    })
    return NextResponse.json(result, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
