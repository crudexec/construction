import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest } from 'next/server'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { updateChangeOrder } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string; coId: string; itemId: string }> }
 async function PATCHHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId, itemId } = await params
    const body = await request.json()
    const co = await updateChangeOrder(user, id, coId, { action: 'line-edit', version: body.version, itemId, item: { ...body, id: itemId } })
    return co!.lineItems.find(item => item.id === itemId)
  })
}
 async function DELETEHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId, itemId } = await params
    await updateChangeOrder(user, id, coId, { action: 'line-delete', itemId, version: request.nextUrl.searchParams.has('version') ? Number(request.nextUrl.searchParams.get('version')) : undefined })
    return { success: true }
  })
}


export const PATCH = auditedRoute('/api/contracts/[id]/change-orders/[coId]/line-items/[itemId]', 'PATCH', PATCHHandler)
export const DELETE = auditedRoute('/api/contracts/[id]/change-orders/[coId]/line-items/[itemId]', 'DELETE', DELETEHandler)
