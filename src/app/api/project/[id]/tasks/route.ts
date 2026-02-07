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

    // Get groupBy query parameter
    const { searchParams } = new URL(request.url)
    const groupBy = searchParams.get('groupBy') || 'category' // default to category

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

    const tasks = await prisma.task.findMany({
      where: {
        cardId: projectId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            order: true
          }
        },
        milestone: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            targetDate: true,
            completedDate: true,
            amount: true,
            order: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            createdAt: true,
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            uploadedByVendor: {
              select: {
                id: true,
                name: true,
                companyName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
        // dependsOn: {
        //   select: {
        //     id: true,
        //     title: true,
        //     status: true
        //   }
        // }
      },
      orderBy: [
        {
          order: 'asc'
        },
        {
          createdAt: 'desc'
        }
      ]
    })

    // Group by milestone if requested
    if (groupBy === 'milestone') {
      // Fetch all milestones for the project
      const milestones = await prisma.projectMilestone.findMany({
        where: { projectId },
        orderBy: { order: 'asc' }
      })

      // Group tasks by milestone
      const grouped: Array<{
        milestone: (typeof milestones[number] & { completedTasksCount: number; totalTasksCount: number; progress: number }) | null;
        tasks: typeof tasks;
      }> = milestones.map(milestone => {
        const milestoneTasks = tasks.filter(t => t.milestoneId === milestone.id)
        const completedCount = milestoneTasks.filter(t => t.status === 'COMPLETED').length
        const progress = milestoneTasks.length > 0 ? (completedCount / milestoneTasks.length) * 100 : 0

        return {
          milestone: {
            ...milestone,
            completedTasksCount: completedCount,
            totalTasksCount: milestoneTasks.length,
            progress: Math.round(progress)
          },
          tasks: milestoneTasks.sort((a, b) => (a.order || 0) - (b.order || 0))
        }
      })

      // Add unassigned tasks group
      const unassignedTasks = tasks.filter(t => !t.milestoneId).sort((a, b) => (a.order || 0) - (b.order || 0))
      if (unassignedTasks.length > 0) {
        grouped.push({
          milestone: null,
          tasks: unassignedTasks
        })
      }

      return NextResponse.json({ groupBy: 'milestone', groups: grouped })
    }

    // Default: Sort tasks by category
    const sortedTasks = tasks.sort((a, b) => {
      // Both have categories - sort by category order, then task order
      if (a.category && b.category) {
        if (a.category.order !== b.category.order) {
          return a.category.order - b.category.order
        }
        return (a.order || 0) - (b.order || 0)
      }
      // Only a has category - a comes first
      if (a.category && !b.category) return -1
      // Only b has category - b comes first
      if (!a.category && b.category) return 1
      // Neither has category - sort by task order
      return (a.order || 0) - (b.order || 0)
    })

    return NextResponse.json(sortedTasks)
  } catch (error) {
    console.error('Error fetching project tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project tasks' },
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

    // If assigneeId is provided, verify the assignee exists and belongs to the same company
    if (body.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assigneeId,
          companyId: user.companyId
        }
      })

      if (!assignee) {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }
    }

    // If milestoneId is provided, verify it exists and belongs to the same project
    if (body.milestoneId) {
      const milestone = await prisma.projectMilestone.findFirst({
        where: {
          id: body.milestoneId,
          projectId: projectId
        }
      })

      if (!milestone) {
        return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 })
      }
    }

    // If dependencyIds are provided, verify they exist and belong to the same project
    if (body.dependencyIds && Array.isArray(body.dependencyIds) && body.dependencyIds.length > 0) {
      const dependencies = await prisma.task.findMany({
        where: {
          id: { in: body.dependencyIds },
          cardId: projectId
        }
      })

      if (dependencies.length !== body.dependencyIds.length) {
        return NextResponse.json({ error: 'One or more dependency tasks not found' }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: 'TODO',
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        cardId: projectId,
        categoryId: body.categoryId || null,
        milestoneId: body.milestoneId || null,
        assigneeId: body.assigneeId || null,
        creatorId: user.id,
        // dependsOn: body.dependencyIds && Array.isArray(body.dependencyIds) && body.dependencyIds.length > 0
        //   ? {
        //       connect: body.dependencyIds.map((id: string) => ({ id }))
        //     }
        //   : undefined
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_created',
        description: `Created task: ${task.title}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}