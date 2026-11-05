import { NextRequest, NextResponse } from 'next/server'
import { AssetRequestStatus, Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assetUser } from '@/lib/assets/types'
import { failure, pageArgs, PlatformError, privateHeaders } from '@/lib/platform/server'
import { auditedRoute } from '@/lib/platform/route-audit'
async function get(request: NextRequest) {
  try {
    const user = await assetUser(request), { page, take } = pageArgs(request)
    const status = request.nextUrl.searchParams.get('status')
    if (status && status !== 'all' && !Object.values(AssetRequestStatus).includes(status as AssetRequestStatus)) throw new PlatformError('Choose a valid request status.')
    const scope = { asset: { companyId: user.companyId } }
    const where = { ...scope, ...(status && status !== 'all' ? { status: status as AssetRequestStatus } : {}) }
    const result = await prisma.$transaction(async tx => {
      const total = await tx.assetRequest.count({ where }), totalPages = Math.max(1, Math.ceil(total / take)), currentPage = Math.min(page, totalPages)
      const [items, pendingCount] = await Promise.all([
        tx.assetRequest.findMany({ where, skip: (currentPage - 1) * take, take, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], select: {
          id: true, purpose: true, status: true, startDate: true, endDate: true, notes: true, createdAt: true,
          requester: { select: { id: true, firstName: true, lastName: true, email: true } },
          approvedBy: { select: { id: true, firstName: true, lastName: true } },
          asset: { select: { id: true, equipmentId: true, name: true, type: true } }, project: { select: { id: true, title: true } },
        } }), tx.assetRequest.count({ where: { ...scope, status: 'PENDING' } }),
      ])
      return { items, total, page: currentPage, pageSize: take, totalPages, pendingCount }
    }, { isolationLevel: Prisma.TransactionIsolationLevel.RepeatableRead })
    return NextResponse.json(result, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
export const GET = auditedRoute('/api/asset-requests', 'GET', get)
