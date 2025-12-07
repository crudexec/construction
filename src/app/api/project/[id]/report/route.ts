import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { startOfDay, endOfDay, parseISO, format } from 'date-fns'

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
    const { searchParams } = new URL(request.url)
    
    // Get filter parameters
    const startDateParam = searchParams.get('startDate')
    const endDateParam = searchParams.get('endDate')
    const priority = searchParams.get('priority')
    const categoryId = searchParams.get('categoryId')
    const includePhotos = searchParams.get('includePhotos') === 'true'

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      },
      include: {
        stage: true,
        owner: {
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true
          }
        },
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            role: true
          }
        },
        company: {
          select: {
            name: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Parse date range
    const startDate = startDateParam ? startOfDay(parseISO(startDateParam)) : startOfDay(new Date(new Date().setMonth(new Date().getMonth() - 1)))
    const endDate = endDateParam ? endOfDay(parseISO(endDateParam)) : endOfDay(new Date())

    // Build task filter
    const taskFilter: any = {
      cardId: projectId,
      OR: [
        {
          updatedAt: {
            gte: startDate,
            lte: endDate
          }
        },
        {
          completedAt: {
            gte: startDate,
            lte: endDate
          }
        }
      ]
    }

    if (priority) {
      taskFilter.priority = priority
    }

    if (categoryId) {
      taskFilter.categoryId = categoryId
    }

    // Fetch tasks with applied filters
    const tasks = await prisma.task.findMany({
      where: taskFilter,
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
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { status: 'asc' },
        { priority: 'desc' },
        { dueDate: 'asc' }
      ]
    })

    // Fetch daily logs for the period
    const dailyLogs = await prisma.dailyLog.findMany({
      where: {
        cardId: projectId,
        date: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        author: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        date: 'desc'
      }
    })

    // Fetch activities for the period
    const activities = await prisma.activity.findMany({
      where: {
        cardId: projectId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      include: {
        user: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 50
    })

    // Fetch documents/photos if requested
    let documents: any[] = []
    if (includePhotos) {
      documents = await prisma.document.findMany({
        where: {
          cardId: projectId,
          createdAt: {
            gte: startDate,
            lte: endDate
          },
          mimeType: {
            startsWith: 'image/'
          }
        },
        select: {
          id: true,
          name: true,
          url: true,
          createdAt: true,
          uploader: {
            select: {
              firstName: true,
              lastName: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        }
      })
    }

    // Calculate statistics
    const totalTasks = tasks.length
    const completedTasks = tasks.filter(t => t.status === 'COMPLETED').length
    const inProgressTasks = tasks.filter(t => t.status === 'IN_PROGRESS').length
    const overdueTasks = tasks.filter(t => t.status === 'OVERDUE' || (t.dueDate && new Date(t.dueDate) < new Date() && t.status !== 'COMPLETED')).length
    
    const completionRate = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group tasks by category
    const tasksByCategory = tasks.reduce((acc: any, task) => {
      const categoryName = task.category?.name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          color: task.category?.color || '#6366f1',
          tasks: [],
          completed: 0,
          inProgress: 0,
          todo: 0
        }
      }
      acc[categoryName].tasks.push(task)
      
      if (task.status === 'COMPLETED') acc[categoryName].completed++
      else if (task.status === 'IN_PROGRESS') acc[categoryName].inProgress++
      else acc[categoryName].todo++
      
      return acc
    }, {})

    // Get task categories for the project
    const categories = await prisma.taskCategory.findMany({
      where: { cardId: projectId },
      select: {
        id: true,
        name: true,
        color: true
      }
    })

    // Prepare report data
    const reportData = {
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        startDate: project.startDate,
        endDate: project.endDate,
        budget: project.budget,
        stage: project.stage.name,
        owner: project.owner,
        teamMembers: project.assignedUsers,
        company: project.company,
        address: {
          street: project.projectAddress,
          city: project.projectCity,
          state: project.projectState,
          zipCode: project.projectZipCode
        },
        contact: {
          name: project.contactName,
          email: project.contactEmail,
          phone: project.contactPhone
        }
      },
      reportPeriod: {
        startDate: format(startDate, 'MMM dd, yyyy'),
        endDate: format(endDate, 'MMM dd, yyyy')
      },
      statistics: {
        totalTasks,
        completedTasks,
        inProgressTasks,
        overdueTasks,
        completionRate,
        dailyLogsCount: dailyLogs.length,
        activitiesCount: activities.length,
        photosCount: documents.length
      },
      tasksByCategory: Object.values(tasksByCategory),
      tasks: tasks.map(task => ({
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        completedAt: task.completedAt,
        category: task.category?.name || 'Uncategorized',
        categoryColor: task.category?.color || '#6366f1',
        assignee: task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName}` : null,
        creator: `${task.creator.firstName} ${task.creator.lastName}`,
        createdAt: task.createdAt,
        updatedAt: task.updatedAt
      })),
      dailyLogs: dailyLogs.map(log => ({
        id: log.id,
        date: log.date,
        weather: log.weatherCondition,
        temperature: log.temperature,
        workersOnSite: log.workersOnSite,
        workPerformed: log.workCompleted,
        materials: log.materialsUsed,
        equipment: log.equipment,
        issues: log.issues,
        safetyIncidents: log.safetyIncidents,
        visitorLog: log.workerDetails,
        photos: log.photos,
        author: `${log.author.firstName} ${log.author.lastName}`,
        createdAt: log.createdAt
      })),
      recentActivities: activities.slice(0, 20).map(activity => ({
        id: activity.id,
        type: activity.type,
        description: activity.description,
        user: `${activity.user.firstName} ${activity.user.lastName}`,
        createdAt: activity.createdAt
      })),
      photos: documents,
      categories,
      generatedAt: new Date().toISOString(),
      generatedBy: `${user.firstName} ${user.lastName}`
    }

    return NextResponse.json(reportData)
  } catch (error) {
    console.error('Failed to generate report:', error)
    return NextResponse.json(
      { error: 'Failed to generate report' },
      { status: 500 }
    )
  }
}