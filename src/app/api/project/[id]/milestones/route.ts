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

    const { id: projectId } = await params

    // Check if tasks should be included
    const { searchParams } = new URL(request.url)
    const includeTasks = searchParams.get('includeTasks') === 'true'

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: {
        projectId
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        responsibleUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        documenterUser: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        assignedContact: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true
          }
        },
        checklistItems: {
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
        },
        ...(includeTasks && {
          tasks: {
            select: {
              id: true,
              title: true,
              description: true,
              status: true,
              priority: true,
              dueDate: true,
              assignee: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true
                }
              }
            },
            orderBy: [
              { order: 'asc' },
              { createdAt: 'asc' }
            ]
          }
        })
      },
      orderBy: [
        { order: 'asc' },
        { createdAt: 'asc' }
      ]
    })

    // Calculate progress for tasks and checklist items
    const milestonesWithProgress = milestones.map(milestone => {
      const tasks = (milestone as any).tasks || []
      const completedTasksCount = tasks.filter((t: any) => t.status === 'COMPLETED').length
      const totalTasksCount = tasks.length
      const taskProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

      const checklistItems = milestone.checklistItems || []
      const completedChecklistItems = checklistItems.filter((i: any) => i.status === 'COMPLETED').length
      const totalChecklistItems = checklistItems.length
      const checklistProgress = totalChecklistItems > 0 ? Math.round((completedChecklistItems / totalChecklistItems) * 100) : 0

      return {
        ...milestone,
        completedTasksCount,
        totalTasksCount,
        progress: taskProgress,
        completedChecklistItems,
        totalChecklistItems,
        checklistProgress
      }
    })

    return NextResponse.json(milestonesWithProgress)

  } catch (error) {
    console.error('Error fetching project milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project milestones' },
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

    const { id: projectId } = await params
    const body = await request.json()

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const { title, description, amount, targetDate, vendorId, order } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    // If vendorId is provided, verify vendor exists and belongs to the company
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId: user.companyId
        }
      })

      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
    }

    // Get the max order if not provided
    let milestoneOrder = order
    if (milestoneOrder === undefined) {
      const maxOrder = await prisma.projectMilestone.findFirst({
        where: { projectId },
        orderBy: { order: 'desc' },
        select: { order: true }
      })
      milestoneOrder = (maxOrder?.order ?? -1) + 1
    }

    const milestone = await prisma.projectMilestone.create({
      data: {
        title,
        description,
        amount: amount ? parseFloat(amount) : null,
        targetDate: targetDate ? new Date(targetDate) : null,
        vendorId: vendorId || null,
        projectId,
        createdById: user.id,
        order: milestoneOrder
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
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

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'milestone_created',
        description: `Created milestone: ${milestone.title}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(milestone, { status: 201 })

  } catch (error) {
    console.error('Error creating project milestone:', error)
    return NextResponse.json(
      { error: 'Failed to create project milestone' },
      { status: 500 }
    )
  }
}
