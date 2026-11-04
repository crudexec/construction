import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { failure, input, pageArgs, privateHeaders } from '@/lib/platform/server'
import { auditedRoute } from '@/lib/platform/route-audit'
import { chatIdentity, runQuestion, settings } from '@/lib/data-chat/server'
import { keyConfigured } from '@/lib/data-chat/openrouter'
async function get(request: NextRequest) {
  try {
    const user = await chatIdentity(request), config = await settings(user.companyId), { page, skip, take } = pageArgs(request)
    const where = { companyId: user.companyId, userId: user.id }
    const [items, total] = await prisma.$transaction([prisma.aiConversation.findMany({ where, select: { id: true, title: true, updatedAt: true }, orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }], skip, take }), prisma.aiConversation.count({ where })])
    return NextResponse.json({ available: config.enabled && keyConfigured(), reason: !config.enabled ? 'The data assistant has not been enabled for your company.' : !keyConfigured() ? 'The data assistant is waiting for its OpenRouter connection.' : null, items, total, page, pageSize: take }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
async function post(request: NextRequest) {
  try { const user = await chatIdentity(request), body = await input(request), config = await settings(user.companyId); return NextResponse.json(await runQuestion(request, user, user.companyId, config, body), { headers: privateHeaders }) }
  catch (error) { return failure(error) }
}
export const GET = auditedRoute('/api/data-chat', 'GET', get)
export const POST = auditedRoute('/api/data-chat', 'POST', post)
export const maxDuration = 90
