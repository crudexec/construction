import { auditedRoute } from '@/lib/platform/route-audit'
import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { access, body, card, cardSelect, clientId, fail, FeedbackError, headers, pagePath, scope, string } from '@/lib/feedback/server'
import { statuses } from '@/lib/feedback/types'

 async function GETHandler(request: NextRequest) {
  try {
    const a = await access(request), params = request.nextUrl.searchParams
    const board = params.get('view') === 'board', status = params.get('status'), search = params.get('search')?.trim().slice(0, 160)
    if (status && !statuses.includes(status as typeof statuses[number])) throw new FeedbackError('Invalid feedback status.')
    const where: Prisma.FeedbackRequestWhereInput = { ...scope(a, board), ...(board && a.global && params.get('companyId') ? { companyId: params.get('companyId')! } : {}), ...(status ? { status: status as typeof statuses[number] } : {}), ...(board && params.get('unanswered') === 'true' ? { AND: [{ status: { not: 'DONE' } }], createdAt: { lt: new Date(Date.now() - 7 * 86400000) }, messages: { none: { fromTeam: true } } } : {}), ...(search ? { OR: [{ title: { contains: search, mode: 'insensitive' } }, { createdByName: { contains: search, mode: 'insensitive' } }] } : {}) }
    const cursor = params.get('cursor')
    if (cursor && !await prisma.feedbackRequest.findFirst({ where: { ...where, id: cursor }, select: { id: true } })) throw new FeedbackError('The list changed. Refresh to continue.', 409)
    const [rows, total] = await prisma.$transaction([
      prisma.feedbackRequest.findMany({ where, select: cardSelect, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 26, ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}) }),
      prisma.feedbackRequest.count({ where }),
    ])
    return NextResponse.json({ items: rows.slice(0, 25).map(card), total, nextCursor: rows.length > 25 ? rows[24].id : null }, { headers })
  } catch (error) { return fail(error) }
}
 async function POSTHandler(request: NextRequest) {
  try {
    const a = await access(request), input = await body(request)
    const title = string(input.title, 'Subject', 160), text = string(input.body, 'Message', 4000), key = clientId(input.clientId), page = pagePath(input.pagePath)
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "User" WHERE id=${a.user.id} FOR UPDATE`)
      const existing = await tx.feedbackRequest.findUnique({ where: { createdById_clientId: { createdById: a.user.id, clientId: key } }, include: { messages: { orderBy: { createdAt: 'asc' }, take: 1 } } })
      if (existing) { if (existing.companyId !== a.user.companyId || existing.title !== title || existing.messages[0]?.body !== text || existing.pagePath !== page) throw new FeedbackError('This request was already sent with different content. Start a new request.', 409); return { id: existing.id } }
      const name = `${a.user.firstName} ${a.user.lastName}`
      const row = await tx.feedbackRequest.create({ data: { companyId: a.user.companyId, createdById: a.user.id, createdByName: name, clientId: key, title, pagePath: page, messages: { create: { authorId: a.user.id, authorName: name, clientId: key, body: text } } }, select: { id: true } })
      return row
    })
    return NextResponse.json(result, { status: 201, headers })
  } catch (error) { return fail(error) }
}


export const GET = auditedRoute('/api/feedback', 'GET', GETHandler)
export const POST = auditedRoute('/api/feedback', 'POST', POSTHandler)
