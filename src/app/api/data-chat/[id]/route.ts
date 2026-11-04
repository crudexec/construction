import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { failure, PlatformError, privateHeaders } from '@/lib/platform/server'
import { auditedRoute } from '@/lib/platform/route-audit'
import { chatIdentity, runSelect } from '@/lib/data-chat/server'
async function get(request: NextRequest, context: { params: Promise<{ id: string }> }) {
  try {
    const user = await chatIdentity(request), { id } = await context.params
    const thread = await prisma.aiConversation.findFirst({ where: { id, companyId: user.companyId, userId: user.id }, select: { id: true, title: true, runs: { select: runSelect, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 30 } } })
    if (!thread) throw new PlatformError('Conversation not found.', 404)
    return NextResponse.json(thread, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export const GET = auditedRoute('/api/data-chat/[id]', 'GET', get)
