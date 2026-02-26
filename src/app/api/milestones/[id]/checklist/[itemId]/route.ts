import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id: milestoneId, itemId } = await params
    const body = await request.json()

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Verify checklist item exists
    const existingItem = await prisma.milestoneChecklistItem.findFirst({
      where: {
        id: itemId,
        milestoneId
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    const { title, description, status, dueDate, order } = body

    // Handle status change to COMPLETED
    let completedData = {}
    if (status === 'COMPLETED' && existingItem.status !== 'COMPLETED') {
      completedData = {
        completedAt: new Date(),
        completedById: user.id
      }
    } else if (status && status !== 'COMPLETED' && existingItem.status === 'COMPLETED') {
      // Revert completion if status changed away from COMPLETED
      completedData = {
        completedAt: null,
        completedById: null
      }
    }

    const updatedItem = await prisma.milestoneChecklistItem.update({
      where: { id: itemId },
      data: {
        ...(title !== undefined && { title: title.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(status !== undefined && { status }),
        ...(dueDate !== undefined && { dueDate: dueDate ? new Date(dueDate) : null }),
        ...(order !== undefined && { order }),
        ...completedData,
        updatedAt: new Date()
      },
      include: {
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error updating checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to update checklist item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id: milestoneId, itemId } = await params

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    // Verify checklist item exists
    const existingItem = await prisma.milestoneChecklistItem.findFirst({
      where: {
        id: itemId,
        milestoneId
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Checklist item not found' }, { status: 404 })
    }

    await prisma.milestoneChecklistItem.delete({
      where: { id: itemId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to delete checklist item' },
      { status: 500 }
    )
  }
}
