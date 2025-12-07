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

    const { id } = await params

    // Fetch project with tasks for timeline
    const project = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      },
      include: {
        tasks: {
          where: {
            isArchived: false,
            dueDate: { not: null }  // Only include tasks with due dates
          },
          include: {
            category: {
              select: {
                name: true,
                color: true
              }
            },
            assignee: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            // dependsOn: {
            //   select: {
            //     id: true,
            //     title: true,
            //     status: true,
            //     completedAt: true
            //   }
            // },
            // dependents: {
            //   select: {
            //     id: true,
            //     title: true,
            //     status: true
            //   }
            // }
          },
          orderBy: {
            dueDate: 'asc'
          }
        },
        stage: {
          select: {
            name: true,
            color: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    if (!project.startDate || !project.endDate) {
      return NextResponse.json(
        { 
          error: 'Project must have start and end dates for timeline view',
          debug: {
            hasStartDate: !!project.startDate,
            hasEndDate: !!project.endDate,
            startDate: project.startDate,
            endDate: project.endDate
          }
        },
        { status: 400 }
      )
    }

    // Calculate project progress based on completed tasks
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length
    const projectProgress = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Determine project status
    let projectStatus = 'NOT_STARTED'
    if (project.status === 'COMPLETED') {
      projectStatus = 'COMPLETED'
    } else if (project.status === 'CANCELLED') {
      projectStatus = 'CANCELLED'
    } else if (completedTasks > 0 || project.status === 'ACTIVE') {
      projectStatus = 'ACTIVE'
    } else if (project.endDate && new Date(project.endDate) < new Date()) {
      projectStatus = 'OVERDUE'
    }

    // Transform tasks for timeline
    const timelineTasks = project.tasks.map(task => {
      // For tasks without explicit start dates, estimate based on creation or due date
      const taskStartDate = task.createdAt
      const taskEndDate = task.dueDate!
      
      // Calculate task progress
      let taskProgress = 0
      if (task.status === 'COMPLETED') taskProgress = 100
      else if (task.status === 'IN_PROGRESS') taskProgress = 50

      // Determine task status including overdue check
      let taskStatus = task.status
      
      if (task.status !== 'COMPLETED' && new Date(taskEndDate) < new Date()) {
        taskStatus = 'OVERDUE'
      }

      return {
        id: task.id,
        title: task.title,
        startDate: taskStartDate,
        endDate: taskEndDate,
        progress: taskProgress,
        category: task.category?.name || 'Uncategorized',
        categoryColor: task.category?.color || '#6366f1',
        assignee: task.assignee 
          ? `${task.assignee.firstName} ${task.assignee.lastName}`
          : undefined,
        status: taskStatus as 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
        // isBlocked: task.dependsOn?.some(dep => dep.status !== 'COMPLETED') || false,
        // dependencies: task.dependsOn?.map(dep => ({
        //   id: dep.id,
        //   title: dep.title,
        //   status: dep.status,
        //   isCompleted: dep.status === 'COMPLETED'
        // })) || [],
        // dependents: task.dependents?.map(dep => ({
        //   id: dep.id,
        //   title: dep.title,
        //   status: dep.status
        // })) || []
      }
    })

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        startDate: project.startDate,
        endDate: project.endDate,
        progress: projectProgress,
        status: projectStatus,
        stage: project.stage.name,
        stageColor: project.stage.color
      },
      tasks: timelineTasks
    })

  } catch (error) {
    console.error('Failed to fetch project timeline:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project timeline' },
      { status: 500 }
    )
  }
}