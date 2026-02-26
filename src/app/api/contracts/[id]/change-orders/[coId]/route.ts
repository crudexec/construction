import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
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

    const { id: contractId, coId } = await params

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

    const changeOrder = await prisma.changeOrder.findFirst({
      where: {
        id: coId,
        contractId
      },
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
        },
        rejectedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    return NextResponse.json(changeOrder)

  } catch (error) {
    console.error('Error fetching change order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch change order' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
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

    const { id: contractId, coId } = await params
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

    const existingCO = await prisma.changeOrder.findFirst({
      where: {
        id: coId,
        contractId
      }
    })

    if (!existingCO) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    const { title, description, reason, status } = body

    // Handle status transitions
    const updateData: any = {
      ...(title !== undefined && { title }),
      ...(description !== undefined && { description }),
      ...(reason !== undefined && { reason }),
      updatedAt: new Date()
    }

    if (status !== undefined && status !== existingCO.status) {
      // Validate status transition
      const validTransitions: Record<string, string[]> = {
        'DRAFT': ['PENDING_APPROVAL'],
        'PENDING_APPROVAL': ['APPROVED', 'REJECTED', 'DRAFT'],
        'APPROVED': [],
        'REJECTED': ['DRAFT']
      }

      if (!validTransitions[existingCO.status]?.includes(status)) {
        return NextResponse.json(
          { error: `Cannot transition from ${existingCO.status} to ${status}` },
          { status: 400 }
        )
      }

      updateData.status = status

      if (status === 'PENDING_APPROVAL') {
        updateData.submittedAt = new Date()
      } else if (status === 'APPROVED') {
        updateData.approvedAt = new Date()
        updateData.approvedById = user.id
      } else if (status === 'REJECTED') {
        updateData.rejectedAt = new Date()
        updateData.rejectedById = user.id
        if (body.rejectionReason) {
          updateData.rejectionReason = body.rejectionReason
        }
      }
    }

    const updatedCO = await prisma.changeOrder.update({
      where: { id: coId },
      data: updateData,
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
        },
        rejectedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(updatedCO)

  } catch (error) {
    console.error('Error updating change order:', error)
    return NextResponse.json(
      { error: 'Failed to update change order' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
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

    const { id: contractId, coId } = await params

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

    const existingCO = await prisma.changeOrder.findFirst({
      where: {
        id: coId,
        contractId
      }
    })

    if (!existingCO) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    // Only allow deletion of DRAFT change orders
    if (existingCO.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft change orders can be deleted' },
        { status: 400 }
      )
    }

    await prisma.changeOrder.delete({
      where: { id: coId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting change order:', error)
    return NextResponse.json(
      { error: 'Failed to delete change order' },
      { status: 500 }
    )
  }
}
