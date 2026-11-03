import { randomBytes } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getEmailService } from '@/lib/email'
import { teamInviteTemplate } from '@/lib/email/templates/notifications'
import { requestOrigin } from '@/lib/import-review/server'
import { auditData, recordAudit } from '@/lib/platform/audit'
import { lockCompany, publicInvite } from '@/lib/platform/companies'
import { actorFor, email, failure, input, pageArgs, PlatformError, privateHeaders, requirePlatform, text } from '@/lib/platform/server'
type Context = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: Context) {
  try {
    await requirePlatform(request); const { id } = await context.params, { page, take, skip } = pageArgs(request)
    const where = { companyId: id, isAccepted: false }
    const [items, total] = await prisma.$transaction([prisma.teamInvite.findMany({ where, select: publicInvite, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take, skip }), prisma.teamInvite.count({ where })])
    return NextResponse.json({ items, total, page, pageSize: take }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request), reason = text(body.reason, 'Reason', 500)
    const result = await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id)
      if (company.status !== 'ACTIVE') throw new PlatformError('Reactivate this company before inviting users.', 409)
      const old = body.inviteId ? await tx.teamInvite.findFirst({ where: { id: text(body.inviteId, 'Invitation'), companyId: id, isAccepted: false } }) : null
      if (body.inviteId && !old) throw new PlatformError('Pending invitation not found.', 404)
      const recipient = old?.email || email(body.email)
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${recipient.toLowerCase()}))`
      if (await tx.user.findFirst({ where: { email: { equals: recipient, mode: 'insensitive' } } })) throw new PlatformError('This email already belongs to an account. Manage the existing user instead.', 409)
      if (!old && await tx.teamInvite.findFirst({ where: { email: { equals: recipient, mode: 'insensitive' }, isAccepted: false, expiresAt: { gt: new Date() } } })) throw new PlatformError('A pending invitation already exists for this email.', 409)
      const role = old?.role || String(body.role || 'STAFF')
      if (!['ADMIN', 'STAFF', 'CLIENT', 'SUBCONTRACTOR'].includes(role)) throw new PlatformError('Invalid role.')
      const token = randomBytes(32).toString('hex'), expiresAt = new Date(Date.now() + 7 * 86400000)
      const invite = old ? await tx.teamInvite.update({ where: { id: old.id }, data: { token, expiresAt } }) : await tx.teamInvite.create({ data: { companyId: id, email: recipient, firstName: text(body.firstName, 'First name', 80), lastName: text(body.lastName, 'Last name', 80), role: role as 'ADMIN' | 'STAFF' | 'CLIENT' | 'SUBCONTRACTOR', token, expiresAt, invitedById: user.id } })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'invitations', action: old ? 'renewed' : 'created', resourceId: invite.id, summary: `${old ? 'Renewed' : 'Created'} invitation for ${recipient}`, reason, after: invite }) })
      return { invite, company }
    })
    const inviteUrl = `${requestOrigin(request)}/invite/${result.invite.token}`
    let emailSent = false
    if (body.sendEmail === true) {
      try {
        const service = await getEmailService(user.companyId)
        if (service.isConfigured()) {
          const message = teamInviteTemplate({ recipientName: result.invite.firstName, recipientEmail: result.invite.email, invitedBy: `${user.firstName} ${user.lastName}`, role: result.invite.role, inviteUrl, expiresAt: result.invite.expiresAt.toISOString().slice(0, 10), companyName: result.company.name })
          emailSent = (await service.send({ to: result.invite.email, ...message })).success
        }
      } catch { /* The saved invitation remains available for manual delivery. */ }
      await recordAudit({ ...actorFor(user), companyId: id, companyName: result.company.name, module: 'invitations', action: 'email', resourceId: result.invite.id, summary: emailSent ? 'Invitation email sent' : 'Invitation email could not be sent', outcome: emailSent ? 'SUCCEEDED' : 'FAILED', after: { emailSent } })
    }
    return NextResponse.json({ id: result.invite.id, inviteUrl, emailSent, emailRequested: body.sendEmail === true }, { status: 201, headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export async function DELETE(request: NextRequest, context: Context) {
  try {
    const user = await requirePlatform(request), { id } = await context.params, body = await input(request), reason = text(body.reason, 'Reason', 500)
    await prisma.$transaction(async tx => {
      const company = await lockCompany(tx, id), invite = await tx.teamInvite.findFirst({ where: { id: text(body.inviteId, 'Invitation'), companyId: id, isAccepted: false } })
      if (!invite) throw new PlatformError('Pending invitation not found.', 404)
      await tx.teamInvite.deleteMany({ where: { companyId: id, email: { equals: invite.email, mode: 'insensitive' }, isAccepted: false } })
      await tx.auditEvent.create({ data: auditData({ ...actorFor(user), companyId: id, companyName: company.name, module: 'invitations', action: 'revoked', resourceId: invite.id, summary: `Revoked pending invitations for ${invite.email}`, reason, before: invite }) })
    })
    return NextResponse.json({ success: true }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
