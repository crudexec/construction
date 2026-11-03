import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { validateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { hasPlatformSession } from '@/lib/platform/server'
import { requestOrigin } from '@/lib/import-review/server'

export const headers = { 'Cache-Control': 'private, no-store', 'X-Robots-Tag': 'noindex, nofollow' }
export class FeedbackError extends Error { constructor(message: string, public status = 400) { super(message) } }
export function fail(error: unknown) {
  if (error instanceof FeedbackError) return NextResponse.json({ error: error.message }, { status: error.status, headers })
  console.error('Feedback request failed', error instanceof Error ? error.name : 'unknown')
  return NextResponse.json({ error: 'Could not load or save feedback. Please try again.' }, { status: 500, headers })
}
export async function access(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer /, '')
  const user = token ? await validateUser(token) : null
  if (!user) throw new FeedbackError('Please sign in to use feedback.', 401)
  const feedbackGrant = await prisma.feedbackManager.findUnique({ where: { userId: user.id } })
  const platformGrant = await prisma.platformAdmin.findUnique({ where: { userId: user.id } })
  const global = !!feedbackGrant || (!!platformGrant && await hasPlatformSession(request, user))
  return { user, global, canManage: global }
}
export type Access = Awaited<ReturnType<typeof access>>
export function scope(a: Access, board = false): Prisma.FeedbackRequestWhereInput {
  if (board) {
    if (!a.canManage) throw new FeedbackError('You do not have access to the feedback board.', 403)
    return {}
  }
  return { companyId: a.user.companyId, createdById: a.user.id }
}
export function visible(a: Access): Prisma.FeedbackRequestWhereInput { return a.canManage ? scope(a, true) : scope(a) }
export const cardSelect = {
  id: true, title: true, status: true, version: true, pagePath: true, createdById: true, createdByName: true, createdAt: true, updatedAt: true,
  company: { select: { name: true } }, _count: { select: { messages: true } },
  messages: { orderBy: [{ createdAt: 'desc' as const }, { id: 'desc' as const }], take: 1, select: { body: true } },
} satisfies Prisma.FeedbackRequestSelect
type Card = Prisma.FeedbackRequestGetPayload<{ select: typeof cardSelect }>
export function card(row: Card) { const { _count, messages, ...rest } = row; return { ...rest, messageCount: _count.messages, preview: messages[0]?.body.slice(0, 180) || '' } }
export const messageSelect = { id: true, authorId: true, authorName: true, fromTeam: true, body: true, kind: true, createdAt: true } satisfies Prisma.FeedbackMessageSelect
export function string(value: unknown, name: string, max: number) {
  if (typeof value !== 'string' || !value.trim() || value.trim().length > max) throw new FeedbackError(`${name} is required and must be ${max.toLocaleString()} characters or fewer.`)
  return value.trim()
}
export function clientId(value: unknown) {
  if (typeof value !== 'string' || !/^[a-zA-Z0-9_-]{16,80}$/.test(value)) throw new FeedbackError('Invalid message identifier. Refresh and try again.')
  return value
}
export function pagePath(value: unknown) {
  if (value === null || value === undefined || value === '') return null
  if (typeof value !== 'string' || value.length > 300 || !/^\/dashboard(?:\/[a-zA-Z0-9_-]+)*\/?$/.test(value)) throw new FeedbackError('Invalid page reference.')
  return value
}
export async function body(request: NextRequest) {
  if (request.headers.get('origin') !== requestOrigin(request) || request.headers.get('sec-fetch-site') === 'cross-site') throw new FeedbackError('Open Buildflo to send feedback.', 403)
  if (!request.headers.get('content-type')?.startsWith('application/json')) throw new FeedbackError('Expected JSON.', 415)
  const reader = request.body?.getReader(); if (!reader) throw new FeedbackError('Missing message.')
  let size = 0; const chunks: Uint8Array[] = []
  while (true) { const part = await reader.read(); if (part.done) break; size += part.value.length; if (size > 24576) { await reader.cancel(); throw new FeedbackError('Message is too large.', 413) }; chunks.push(part.value) }
  try { const parsed = JSON.parse(Buffer.concat(chunks).toString('utf8')); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(); return parsed as Record<string, unknown> } catch { throw new FeedbackError('Invalid message.') }
}
export async function lockRequest(tx: Prisma.TransactionClient, id: string, a: Access) {
  // Scope before locking, then recheck after obtaining the lock.
  if (!await tx.feedbackRequest.findFirst({ where: { id, ...visible(a) }, select: { id: true } })) throw new FeedbackError('Feedback not found.', 404)
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "FeedbackRequest" WHERE id=${id} FOR UPDATE`)
  const row = await tx.feedbackRequest.findFirst({ where: { id, ...visible(a) } })
  if (!row) throw new FeedbackError('Feedback not found.', 404)
  return row
}
