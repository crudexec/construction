import { NextRequest } from 'next/server'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { getChangeOrder, updateChangeOrder } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string; coId: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    const co = await getChangeOrder(user, id, coId)
    return { lineItems: co.lineItems, totalAmount: co.totalAmount, itemCount: co.lineItems.length }
  })
}
export async function POST(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    const body = await request.json()
    const co = await updateChangeOrder(user, id, coId, { action: 'line-add', version: body.version, item: body })
    return co!.lineItems.at(-1)
  }, 201)
}
