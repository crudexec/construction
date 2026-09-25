import type { Prisma } from '@prisma/client'
import { contractMaxPayment } from './payment-calculations'

export async function getContractMaxPayment(db: Prisma.TransactionClient, contractId: string) {
  const contract = await db.vendorContract.findUniqueOrThrow({
    where: { id: contractId },
    select: { totalSum: true, retentionPercent: true, changeOrders: { where: { status: 'APPROVED' }, select: { totalAmount: true } } }
  })
  return contractMaxPayment(contract.totalSum, contract.changeOrders.reduce((sum, co) => sum + co.totalAmount, 0), contract.retentionPercent ?? 0)
}
