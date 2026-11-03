import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest } from 'next/server'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { getChangeOrder, updateChangeOrder } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string; coId: string }> }
 async function GETHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    return getChangeOrder(user, id, coId)
  })
}
 async function PATCHHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    return updateChangeOrder(user, id, coId, await request.json())
  })
}
 async function DELETEHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    await updateChangeOrder(user, id, coId, { action: 'delete', version: request.nextUrl.searchParams.has('version') ? Number(request.nextUrl.searchParams.get('version')) : undefined })
    return { success: true }
  })
}


export const GET = auditedRoute('/api/contracts/[id]/change-orders/[coId]', 'GET', GETHandler)
export const PATCH = auditedRoute('/api/contracts/[id]/change-orders/[coId]', 'PATCH', PATCHHandler)
export const DELETE = auditedRoute('/api/contracts/[id]/change-orders/[coId]', 'DELETE', DELETEHandler)
