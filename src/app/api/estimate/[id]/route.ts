import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
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

    const { id: estimateId } = await params
    const body = await request.json()

    // Verify estimate exists and user has access (through project company)
    const estimate = await prisma.estimate.findFirst({
      where: { 
        id: estimateId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!estimate || estimate.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    // Update specific fields if provided
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.status !== undefined) {
      updateData.status = body.status
      
      // Set timestamp fields based on status
      if (body.status === 'SENT' && !estimate.sentAt) {
        updateData.sentAt = new Date()
      } else if (body.status === 'VIEWED' && !estimate.viewedAt) {
        updateData.viewedAt = new Date()
      } else if (body.status === 'ACCEPTED' && !estimate.acceptedAt) {
        updateData.acceptedAt = new Date()
      } else if (body.status === 'REJECTED' && !estimate.rejectedAt) {
        updateData.rejectedAt = new Date()
      }
    }
    if (body.validUntil !== undefined) updateData.validUntil = body.validUntil ? new Date(body.validUntil) : null
    if (body.subtotal !== undefined) updateData.subtotal = body.subtotal
    if (body.tax !== undefined) updateData.tax = body.tax
    if (body.discount !== undefined) updateData.discount = body.discount
    if (body.total !== undefined) updateData.total = body.total

    const updatedEstimate = await prisma.estimate.update({
      where: { id: estimateId },
      data: updateData,
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'estimate_updated',
        description: `Updated estimate: ${updatedEstimate.title}`,
        cardId: estimate.card.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedEstimate)
  } catch (error) {
    console.error('Error updating estimate:', error)
    return NextResponse.json(
      { error: 'Failed to update estimate' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    const { id: estimateId } = await params

    // Verify estimate exists and user has access (through project company)
    const estimate = await prisma.estimate.findFirst({
      where: { 
        id: estimateId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!estimate || estimate.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Estimate not found' }, { status: 404 })
    }

    // Delete estimate items first, then estimate
    await prisma.estimateLineItem.deleteMany({
      where: { estimateId }
    })

    await prisma.estimate.delete({
      where: { id: estimateId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'estimate_deleted',
        description: `Deleted estimate: ${estimate.title}`,
        cardId: estimate.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting estimate:', error)
    return NextResponse.json(
      { error: 'Failed to delete estimate' },
      { status: 500 }
    )
  }
}