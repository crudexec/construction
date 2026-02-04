import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// POST - Approve a purchase order
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

    const { id } = await params

    // Check if PO exists and belongs to company
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Only allow approving draft or pending approval orders
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existingPO.status)) {
      return NextResponse.json(
        { error: 'Purchase order cannot be approved in current status' },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        },
        lineItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true
              }
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
        }
      }
    })

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error approving purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to approve purchase order' },
      { status: 500 }
    )
  }
}
