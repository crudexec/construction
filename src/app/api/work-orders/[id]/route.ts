import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_STATUSES = ['SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED']

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

    const { id } = await params

    const workOrder = await prisma.workOrder.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        issues: {
          include: {
            issue: {
              select: {
                id: true, title: true, description: true, urgency: true, status: true,
                asset: { select: { id: true, name: true } }
              }
            }
          }
        },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' }
        },
        attachments: { orderBy: { createdAt: 'desc' } }
      }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Error fetching work order:', error)
    return NextResponse.json({ error: 'Failed to fetch work order' }, { status: 500 })
  }
}

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

    const { id } = await params

    const existing = await prisma.workOrder.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title, description, status, scheduledDate,
      estimatedDuration, actualDuration, estimatedCost, actualCost, assignedToId
    } = body

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: user.companyId }
      })
      if (!assignee) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
      }
    }

    const becomingCompleted = status === 'COMPLETED' && existing.status !== 'COMPLETED'

    const workOrder = await prisma.workOrder.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(scheduledDate !== undefined && { scheduledDate: scheduledDate ? new Date(scheduledDate) : null }),
        ...(estimatedDuration !== undefined && { estimatedDuration }),
        ...(actualDuration !== undefined && { actualDuration }),
        ...(estimatedCost !== undefined && { estimatedCost }),
        ...(actualCost !== undefined && { actualCost }),
        ...(assignedToId !== undefined && { assignedToId: assignedToId || null }),
        ...(becomingCompleted && { completedAt: new Date() })
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        issues: { include: { issue: { select: { id: true, title: true, status: true } } } }
      }
    })

    // When a work order is completed, resolve any bundled issues still open/in-progress
    if (becomingCompleted) {
      const linkedIssueIds = workOrder.issues.map(wi => wi.issue.id)
      if (linkedIssueIds.length > 0) {
        await prisma.assetIssue.updateMany({
          where: { id: { in: linkedIssueIds }, status: { in: ['OPEN', 'IN_PROGRESS'] } },
          data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedById: user.id }
        })
      }
    }

    return NextResponse.json(workOrder)
  } catch (error) {
    console.error('Error updating work order:', error)
    return NextResponse.json({ error: 'Failed to update work order' }, { status: 500 })
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete work orders' }, { status: 403 })
    }

    const { id } = await params

    const existing = await prisma.workOrder.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    await prisma.workOrder.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting work order:', error)
    return NextResponse.json({ error: 'Failed to delete work order' }, { status: 500 })
  }
}
