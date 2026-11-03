import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest } from 'next/server'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { getChangeOrder, updateChangeOrder } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string; coId: string }> }
 async function GETHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    const co = await getChangeOrder(user, id, coId)
    return { lineItems: co.lineItems, totalAmount: co.totalAmount, itemCount: co.lineItems.length }
  })
}
 async function POSTHandler(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    const body = await request.json()
    const co = await updateChangeOrder(user, id, coId, { action: 'line-add', version: body.version, item: body })
    return co!.lineItems.at(-1)
  }, 201)
}


export const GET = auditedRoute('/api/contracts/[id]/change-orders/[coId]/line-items', 'GET', GETHandler)
export const POST = auditedRoute('/api/contracts/[id]/change-orders/[coId]/line-items', 'POST', POSTHandler)
