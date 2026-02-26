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

    const { id: milestoneId } = await params

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

    const checklistItems = await prisma.milestoneChecklistItem.findMany({
      where: { milestoneId },
      include: {
        completedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { order: 'asc' }
    })

    return NextResponse.json(checklistItems)

  } catch (error) {
    console.error('Error fetching checklist items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch checklist items' },
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

    const { id: milestoneId } = await params
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

    const { title, description, dueDate, order } = body

    if (!title || title.trim() === '') {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // Get the next order value if not provided
    let itemOrder = order
    if (itemOrder === undefined) {
      const lastItem = await prisma.milestoneChecklistItem.findFirst({
        where: { milestoneId },
        orderBy: { order: 'desc' }
      })
      itemOrder = (lastItem?.order ?? -1) + 1
    }

    const checklistItem = await prisma.milestoneChecklistItem.create({
      data: {
        title: title.trim(),
        description: description?.trim() || null,
        dueDate: dueDate ? new Date(dueDate) : null,
        order: itemOrder,
        milestoneId
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

    return NextResponse.json(checklistItem, { status: 201 })

  } catch (error) {
    console.error('Error creating checklist item:', error)
    return NextResponse.json(
      { error: 'Failed to create checklist item' },
      { status: 500 }
    )
  }
}
