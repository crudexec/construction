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

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const changeOrders = await prisma.changeOrder.findMany({
      where: { contractId },
      include: {
        lineItems: {
          orderBy: { order: 'asc' },
          include: {
            costCode: {
              select: { id: true, code: true, name: true }
            }
          }
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
        },
        rejectedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { changeOrderNumber: 'asc' }
    })

    // Calculate totals
    const approvedTotal = changeOrders
      .filter(co => co.status === 'APPROVED')
      .reduce((sum, co) => sum + co.totalAmount, 0)

    const pendingTotal = changeOrders
      .filter(co => co.status === 'PENDING_APPROVAL')
      .reduce((sum, co) => sum + co.totalAmount, 0)

    return NextResponse.json({
      changeOrders,
      approvedTotal,
      pendingTotal,
      totalCount: changeOrders.length
    })

  } catch (error) {
    console.error('Error fetching change orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change orders' },
      { status: 500 }
    )
  }
}

export async function POST(
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
    const body = await request.json()

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const { title, description, reason, lineItems } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    // Get next change order number
    const lastCO = await prisma.changeOrder.findFirst({
      where: { contractId },
      orderBy: { changeOrderNumber: 'desc' }
    })
    const nextNumber = (lastCO?.changeOrderNumber ?? 0) + 1

    // Calculate total amount from line items
    let totalAmount = 0
    if (lineItems && Array.isArray(lineItems)) {
      totalAmount = lineItems.reduce((sum: number, item: any) => {
        return sum + (item.quantity * item.unitPrice)
      }, 0)

      // Validate any provided cost codes belong to this company
      const costCodeIds = Array.from(new Set(lineItems.map((item: any) => item.costCodeId).filter(Boolean)))
      if (costCodeIds.length > 0) {
        const validCostCodes = await prisma.costCode.findMany({
          where: { id: { in: costCodeIds as string[] }, companyId: user.companyId },
          select: { id: true }
        })
        if (validCostCodes.length !== costCodeIds.length) {
          return NextResponse.json({ error: 'One or more cost codes not found' }, { status: 404 })
        }
      }
    }

    const changeOrder = await prisma.changeOrder.create({
      data: {
        contractId,
        changeOrderNumber: nextNumber,
        title,
        description,
        reason,
        totalAmount,
        createdById: user.id,
        lineItems: lineItems && Array.isArray(lineItems) ? {
          create: lineItems.map((item: any, index: number) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            order: index,
            notes: item.notes,
            costCodeId: item.costCodeId || null,
            specSection: item.specSection || null
          }))
        } : undefined
      },
      include: {
        lineItems: {
          orderBy: { order: 'asc' },
          include: {
            costCode: {
              select: { id: true, code: true, name: true }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(changeOrder, { status: 201 })

  } catch (error) {
    console.error('Error creating change order:', error)
    return NextResponse.json(
      { error: 'Failed to create change order' },
      { status: 500 }
    )
  }
}
