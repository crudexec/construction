import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { access, fail, headers } from '@/lib/feedback/server'
 async function GETHandler(request: NextRequest) {
  try { const a = await access(request); return NextResponse.json({ canManage: a.canManage, global: a.global, userId: a.user.id }, { headers }) } catch (error) { return fail(error) }
}


export const GET = auditedRoute('/api/feedback/access', 'GET', GETHandler)
