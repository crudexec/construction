import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { auditData } from '@/lib/platform/audit'
import { lockCompany, publicUser } from '@/lib/platform/companies'
import { actorFor, failure, input, pageArgs, PlatformError, privateHeaders, requirePlatform, text } from '@/lib/platform/server'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePlatform(request); const { id } = await context.params, { page, take, skip, search } = pageArgs(request)
    const where = { companyId: id, ...(search ? { OR: [{ email: { contains: search, mode: 'insensitive' as const } }, { firstName: { contains: search, mode: 'insensitive' as const } }, { lastName: { contains: search, mode: 'insensitive' as const } }] } : {}) }
    const [items, total] = await prisma.$transaction([prisma.user.findMany({ where, select: publicUser, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take, skip }), prisma.user.count({ where })])
    return NextResponse.json({ items, total, page, pageSize: take }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request)
    const userId = text(body.userId, 'User'), reason = text(body.reason, 'Reason', 500)
    const result = await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id)
      const target = await tx.user.findFirst({ where: { id: userId, companyId: id }, select: publicUser })
      if (!target) throw new PlatformError('User not found.', 404)
      if (target.platformAdmin) throw new PlatformError('Platform administrator accounts are managed outside company controls.', 403)
      if (userId === user.id) throw new PlatformError('You cannot modify your own account here.', 409)
      const action = text(body.action, 'Action')
      const data: { role?: 'ADMIN' | 'STAFF' | 'CLIENT' | 'SUBCONTRACTOR'; isActive?: boolean; sessionVersion: { increment: number } } = { sessionVersion: { increment: 1 } }
      if (action === 'role') {
        if (!['ADMIN', 'STAFF', 'CLIENT', 'SUBCONTRACTOR'].includes(String(body.role))) throw new PlatformError('Invalid role.')
        data.role = body.role as typeof data.role
      } else if (action === 'disable' || action === 'activate') data.isActive = action === 'activate'
      else if (action !== 'revoke-sessions') throw new PlatformError('Unknown user action.')
      if (target.role === 'ADMIN' && target.isActive && (data.isActive === false || (data.role && data.role !== 'ADMIN')) && await tx.user.count({ where: { companyId: id, isActive: true, role: 'ADMIN' } }) <= 1) throw new PlatformError('Assign another active company administrator first.', 409)
      const updated = await tx.user.update({ where: { id: userId }, data, select: publicUser })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'users', action, resourceId: userId, summary: `${action === 'revoke-sessions' ? 'Revoked sessions for' : 'Updated access for'} ${target.firstName} ${target.lastName}`, reason, before: target, after: updated }) })
      return updated
    })
    return NextResponse.json(result, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
