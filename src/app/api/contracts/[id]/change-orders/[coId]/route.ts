import { NextRequest } from 'next/server'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { getChangeOrder, updateChangeOrder } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string; coId: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    return getChangeOrder(user, id, coId)
  })
}
export async function PATCH(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    return updateChangeOrder(user, id, coId, await request.json())
  })
}
export async function DELETE(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id, coId } = await params
    await updateChangeOrder(user, id, coId, { action: 'delete', version: request.nextUrl.searchParams.has('version') ? Number(request.nextUrl.searchParams.get('version')) : undefined })
    return { success: true }
  })
}
