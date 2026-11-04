import { NextRequest } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { auditData } from '@/lib/platform/audit'
import { PlatformError, requirePlatform, text } from '@/lib/platform/server'
import { answer, keyConfigured } from './openrouter'
import { defaultPrompt } from './types'

export async function chatIdentity(request: NextRequest) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer /, '')
  const user = token ? await validateUser(token) : null
  if (!user) throw new PlatformError('Please sign in to continue.', 401)
  if (user.role !== 'ADMIN') throw new PlatformError('Company administrator access is required for data chat.', 403)
  return user
}
export const startOfDay = () => { const date = new Date(); date.setUTCHours(0, 0, 0, 0); return date }
export async function settings(companyId: string) {
  const stored = await prisma.companyAiConfig.findUnique({ where: { companyId } })
  return stored || { companyId, enabled: false, model: '', systemPrompt: defaultPrompt, version: 0, dailyRequestLimit: 100 }
}
export function prompt(value: unknown) { return text(value, 'Company system prompt', 8000) }
export function messageInput(body: Record<string, unknown>) {
  const question = text(body.question, 'Question', 3000), clientId = text(body.clientId, 'Message identifier', 80)
  if (!/^[a-zA-Z0-9_-]{16,80}$/.test(clientId)) throw new PlatformError('Invalid message identifier.')
  return { question, clientId }
}
export const runSelect = { id: true, conversationId: true, question: true, answer: true, sources: true, status: true, model: true, promptVersion: true, totalTokens: true, errorCode: true, createdAt: true } satisfies Prisma.AiRunSelect

type User = Awaited<ReturnType<typeof chatIdentity>>
type Config = Awaited<ReturnType<typeof settings>>
export async function runQuestion(request: NextRequest, user: User, companyId: string, config: Config, body: Record<string, unknown>, preview = false) {
  const { question, clientId } = messageInput(body)
  const conversationId = body.conversationId === undefined || body.conversationId === null ? null : text(body.conversationId, 'Conversation', 100)
  const company = await prisma.company.findUnique({ where: { id: companyId } })
  if (!company || company.status !== 'ACTIVE') throw new PlatformError('This company is unavailable.', 404)
  const assertAccess = async () => {
    const current = preview ? await requirePlatform(request) : await chatIdentity(request)
    if (current.id !== user.id || (!preview && current.companyId !== companyId)) throw new PlatformError('Access has changed. Sign in again.', 403)
    const target = await prisma.company.findUnique({ where: { id: companyId }, select: { status: true, accessVersion: true } })
    if (target?.status !== 'ACTIVE' || target.accessVersion !== company.accessVersion) throw new PlatformError('Company access changed. Start again after signing in.', 403)
    if (!preview) { const latest = await settings(companyId); if (!latest.enabled) throw new PlatformError('The data assistant is disabled for this company.', 409); if (latest.version !== config.version) throw new PlatformError('Assistant settings changed. Start a new message.', 409) }
  }
  await assertAccess()
  if (!keyConfigured()) throw new PlatformError('OpenRouter is not connected. Ask the platform administrator to configure the server key.', 503)
  const actor = { companyId, companyName: company.name, actorId: user.id, actorName: `${user.firstName} ${user.lastName}`, actorType: preview ? 'PLATFORM_ADMIN' : 'USER', scope: preview ? 'PLATFORM' as const : 'COMPANY' as const, module: 'data-chat', action: preview ? 'prompt-tested' : 'question-answered', summary: preview ? 'Tested a draft company assistant configuration' : 'Asked the company data assistant' }
  const acquired = await prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`company-ai:${companyId}`}))`
    const existing = await tx.aiRun.findUnique({ where: { companyId_userId_clientId: { companyId, userId: user.id, clientId } } })
    if (existing) {
      if (existing.question !== question || existing.purpose !== (preview ? 'TEST' : 'CHAT') || (conversationId && existing.conversationId !== conversationId)) throw new PlatformError('Message identifier is already used. Start a new message.', 409)
      if (existing.status === 'SUCCEEDED') return { run: existing, reused: true }
      throw new PlatformError(existing.status === 'RUNNING' ? 'This message is still processing. Refresh the conversation shortly.' : 'This attempt failed. Send again to start a new attempt.', 409)
    }
    const stale = new Date(Date.now() - 120000)
    await tx.aiRun.updateMany({ where: { companyId, status: 'RUNNING', createdAt: { lt: stale } }, data: { status: 'FAILED', errorCode: 'Interrupted. Send a new message to retry.', finishedAt: new Date() } })
    if (await tx.aiRun.count({ where: { companyId, createdAt: { gte: startOfDay() } } }) >= config.dailyRequestLimit) throw new PlatformError('This company has reached its daily assistant request limit. It resets at midnight UTC.', 429)
    if (await tx.aiRun.count({ where: { companyId, userId: user.id, createdAt: { gte: new Date(Date.now() - 60000) } } }) >= 10) throw new PlatformError('Too many questions. Wait a minute before sending another.', 429)
    if (await tx.aiRun.findFirst({ where: { companyId, userId: user.id, status: 'RUNNING' } })) throw new PlatformError('Your previous question is still processing. Wait before sending another.', 409)
    let threadId = conversationId
    if (!preview) {
      if (threadId) {
        const thread = await tx.aiConversation.findFirst({ where: { id: threadId, companyId, userId: user.id }, include: { _count: { select: { runs: true } } } })
        if (!thread) throw new PlatformError('Conversation not found.', 404)
        if (thread._count.runs >= 30) throw new PlatformError('This conversation has reached 30 questions. Start a new chat.')
      } else threadId = (await tx.aiConversation.create({ data: { companyId, userId: user.id, title: question.slice(0, 100) } })).id
      await tx.aiConversation.update({ where: { id: threadId }, data: { updatedAt: new Date() } })
    } else threadId = null
    const run = await tx.aiRun.create({ data: { companyId, userId: user.id, clientId, conversationId: threadId, purpose: preview ? 'TEST' : 'CHAT', question, model: config.model, promptVersion: config.version } })
    await tx.auditEvent.create({ data: auditData({ ...actor, requestId: run.id, resourceId: run.id, outcome: 'STARTED' }) })
    return { run, reused: false }
  })
  if (acquired.reused) return prisma.aiRun.findUniqueOrThrow({ where: { id: acquired.run.id }, select: runSelect })
  const run = acquired.run
  try {
    const history = run.conversationId ? (await prisma.aiRun.findMany({ where: { conversationId: run.conversationId, companyId, userId: user.id, status: 'SUCCEEDED', id: { not: run.id } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 4, select: { question: true, answer: true } })).reverse() : []
    const result = await answer({ companyId, companyName: company.name, currency: company.currency, model: config.model, systemPrompt: config.systemPrompt, question, history, assertAccess })
    await assertAccess()
    return await prisma.$transaction(async tx => {
      const saved = await tx.aiRun.update({ where: { id: run.id }, data: { status: 'SUCCEEDED', answer: result.answer, sources: result.sources as unknown as Prisma.InputJsonValue, totalTokens: result.totalTokens, finishedAt: new Date() }, select: runSelect })
      await tx.auditEvent.create({ data: auditData({ ...actor, requestId: run.id, resourceId: run.id, outcome: 'SUCCEEDED' }) })
      return saved
    })
  } catch (error) {
    const publicMessage = error instanceof PlatformError ? error.message : 'Could not complete the answer. Try again.'
    await prisma.$transaction(async tx => {
      await tx.aiRun.update({ where: { id: run.id }, data: { status: 'FAILED', errorCode: publicMessage, finishedAt: new Date() } })
      await tx.auditEvent.create({ data: auditData({ ...actor, requestId: run.id, resourceId: run.id, outcome: 'FAILED' }) })
    })
    throw error
  }
}
