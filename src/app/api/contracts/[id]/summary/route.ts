import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: contractId } = await params

    // Get contract with all related data
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true
          }
        },
        lineItems: {
          orderBy: { order: 'asc' }
        },
        changeOrders: {
          include: {
            lineItems: {
              orderBy: { order: 'asc' }
            },
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            approvedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: { changeOrderNumber: 'asc' }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Calculate line items total
    const lineItemsTotal = contract.lineItems.reduce(
      (sum, item) => sum + item.totalPrice,
      0
    )

    // Calculate change order totals by status
    const changeOrdersByStatus = contract.changeOrders.reduce(
      (acc, co) => {
        if (!acc[co.status]) {
          acc[co.status] = { count: 0, total: 0 }
        }
        acc[co.status].count++
        acc[co.status].total += co.totalAmount
        return acc
      },
      {} as Record<string, { count: number; total: number }>
    )

    const approvedChangeOrdersTotal = changeOrdersByStatus['APPROVED']?.total || 0
    const pendingChangeOrdersTotal = changeOrdersByStatus['PENDING_APPROVAL']?.total || 0
    const draftChangeOrdersTotal = changeOrdersByStatus['DRAFT']?.total || 0
    const rejectedChangeOrdersTotal = changeOrdersByStatus['REJECTED']?.total || 0

    // Current contract value = Original (totalSum or lineItemsTotal) + Approved COs
    const originalContractValue = contract.totalSum || lineItemsTotal
    const currentContractValue = originalContractValue + approvedChangeOrdersTotal
    const potentialContractValue = currentContractValue + pendingChangeOrdersTotal

    return NextResponse.json({
      contract: {
        id: contract.id,
        contractNumber: contract.contractNumber,
        type: contract.type,
        status: contract.status,
        startDate: contract.startDate,
        endDate: contract.endDate,
        terms: contract.terms,
        notes: contract.notes,
        vendor: contract.vendor
      },
      lineItems: {
        items: contract.lineItems,
        count: contract.lineItems.length,
        total: lineItemsTotal
      },
      changeOrders: {
        items: contract.changeOrders,
        byStatus: {
          draft: changeOrdersByStatus['DRAFT'] || { count: 0, total: 0 },
          pending: changeOrdersByStatus['PENDING_APPROVAL'] || { count: 0, total: 0 },
          approved: changeOrdersByStatus['APPROVED'] || { count: 0, total: 0 },
          rejected: changeOrdersByStatus['REJECTED'] || { count: 0, total: 0 }
        },
        totalCount: contract.changeOrders.length
      },
      financials: {
        originalContractValue,
        approvedChangeOrdersTotal,
        pendingChangeOrdersTotal,
        draftChangeOrdersTotal,
        rejectedChangeOrdersTotal,
        currentContractValue,
        potentialContractValue,
        netChangeFromOriginal: currentContractValue - originalContractValue,
        percentChangeFromOriginal: originalContractValue > 0
          ? ((currentContractValue - originalContractValue) / originalContractValue) * 100
          : 0
      }
    })

  } catch (error) {
    console.error('Error fetching contract summary:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract summary' },
      { status: 500 }
    )
  }
}
