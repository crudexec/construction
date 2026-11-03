import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { access, body, card, cardSelect, clientId, fail, FeedbackError, headers, lockRequest, messageSelect, string, visible } from '@/lib/feedback/server'
import { statusLabels, statuses } from '@/lib/feedback/types'
type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, context: Context) {
  try {
    const a = await access(request), { id } = await context.params
    const row = await prisma.feedbackRequest.findFirst({ where: { id, ...visible(a) }, select: cardSelect })
    if (!row) throw new FeedbackError('Feedback not found.', 404)
    const cursor = request.nextUrl.searchParams.get('before')
    if (cursor && !await prisma.feedbackMessage.findFirst({ where: { id: cursor, requestId: id }, select: { id: true } })) throw new FeedbackError('Invalid conversation cursor.')
    const messages = await prisma.feedbackMessage.findMany({ where: { requestId: id }, select: messageSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 51, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) })
    return NextResponse.json({ request: card(row), messages: messages.slice(0, 50).reverse(), nextCursor: messages.length > 50 ? messages[49].id : null, canManage: a.canManage }, { headers })
  } catch (error) { return fail(error) }
}
export async function POST(request: NextRequest, context: Context) {
  try {
    const a = await access(request), { id } = await context.params, input = await body(request)
    const text = string(input.body, 'Message', 4000), key = clientId(input.clientId)
    const result = await prisma.$transaction(async tx => {
      const row = await lockRequest(tx, id, a)
      const existing = await tx.feedbackMessage.findUnique({ where: { authorId_clientId: { authorId: a.user.id, clientId: key } }, select: { ...messageSelect, requestId: true } })
      if (existing) { if (existing.requestId !== id || existing.body !== text) throw new FeedbackError('This message was already sent with different content.', 409); return existing }
      const message = await tx.feedbackMessage.create({ data: { requestId: id, authorId: a.user.id, authorName: `${a.user.firstName} ${a.user.lastName}`, fromTeam: a.canManage && row.createdById !== a.user.id, clientId: key, body: text }, select: messageSelect })
      await tx.feedbackRequest.update({ where: { id }, data: { updatedAt: new Date() } })
      return message
    })
    return NextResponse.json(result, { status: 201, headers })
  } catch (error) { return fail(error) }
}
export async function PATCH(request: NextRequest, context: Context) {
  try {
    const a = await access(request); if (!a.canManage) throw new FeedbackError('Only the platform super admin can change status.', 403)
    const { id } = await context.params, input = await body(request)
    if (!statuses.includes(input.status as typeof statuses[number]) || !Number.isSafeInteger(input.version)) throw new FeedbackError('Invalid status or version.')
    const status = input.status as typeof statuses[number]
    const result = await prisma.$transaction(async tx => {
      const row = await lockRequest(tx, id, a)
      if (row.version !== input.version) throw new FeedbackError('Someone else updated this request. Refresh and try again.', 409)
      if (row.status === status) return { status: row.status, version: row.version }
      const changed = await tx.feedbackRequest.update({ where: { id }, data: { status, version: { increment: 1 } }, select: { status: true, version: true } })
      await tx.feedbackMessage.create({ data: { requestId: id, authorId: a.user.id, authorName: `${a.user.firstName} ${a.user.lastName}`, fromTeam: true, clientId: randomUUID(), kind: 'STATUS', body: `Moved from ${statusLabels[row.status]} to ${statusLabels[status]}.` } })
      return changed
    })
    return NextResponse.json(result, { headers })
  } catch (error) { return fail(error) }
}
