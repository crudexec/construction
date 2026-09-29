import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { changeOrderRequest } from '@/lib/change-orders/http'
import { changeOrderInclude, createChangeOrder, requireContract } from '@/lib/change-orders/workflow'

type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => {
    const { id: contractId } = await params
    await requireContract(prisma, user.companyId, contractId)
    const changeOrders = await prisma.changeOrder.findMany({ where: { contractId }, include: changeOrderInclude, orderBy: { changeOrderNumber: 'asc' } })
    return {
      changeOrders, totalCount: changeOrders.length,
      approvedTotal: changeOrders.filter(co => co.status === 'APPROVED').reduce((sum, co) => sum + co.totalAmount, 0),
      pendingTotal: changeOrders.filter(co => co.status === 'PENDING_APPROVAL').reduce((sum, co) => sum + co.totalAmount, 0)
    }
  })
}
export async function POST(request: NextRequest, { params }: Context) {
  return changeOrderRequest(request, async user => createChangeOrder(user, (await params).id, await request.json()), 201)
}
