import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // Get all active cards for this company - these are effectively "projects" in the system
    const projects = await prisma.card.findMany({
      where: { 
        companyId: user.companyId,
        status: {
          not: 'CANCELLED'
        }
      },
      include: {
        stage: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tasks: {
          select: {
            id: true,
            title: true,
            status: true,
            dueDate: true
          }
        },
        budgetItems: {
          select: {
            id: true,
            amount: true,
            isExpense: true
          }
        },
        _count: {
          select: {
            tasks: true,
            documents: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      }
    })

    // Calculate project metrics
    const projectsWithMetrics = projects.map(project => {
      const totalBudget = project.budgetItems
        .filter(item => !item.isExpense)
        .reduce((sum, item) => sum + item.amount, 0)
      
      const totalExpenses = project.budgetItems
        .filter(item => item.isExpense)
        .reduce((sum, item) => sum + item.amount, 0)

      const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length
      const totalTasks = project.tasks.length
      const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

      return {
        ...project,
        metrics: {
          totalBudget,
          totalExpenses,
          profit: totalBudget - totalExpenses,
          progress: Math.round(progress),
          completedTasks,
          totalTasks
        }
      }
    })

    return NextResponse.json(projectsWithMetrics)
  } catch (error) {
    console.error('Error fetching projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch projects' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      title,
      description,
      contactName,
      contactEmail,
      contactPhone,
      projectAddress,
      projectCity,
      projectState,
      projectZipCode,
      budget,
      startDate,
      endDate,
      priority
    } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Project title is required' },
        { status: 400 }
      )
    }

    // Find or create a "Projects" stage
    let projectStage = await prisma.stage.findFirst({
      where: { 
        companyId: user.companyId,
        name: 'Projects'
      }
    })

    if (!projectStage) {
      const maxOrder = await prisma.stage.findFirst({
        where: { companyId: user.companyId },
        orderBy: { order: 'desc' },
        select: { order: true }
      })

      projectStage = await prisma.stage.create({
        data: {
          name: 'Projects',
          color: '#10b981',
          order: (maxOrder?.order || 0) + 1,
          companyId: user.companyId
        }
      })
    }

    const project = await prisma.card.create({
      data: {
        title,
        description,
        contactName,
        contactEmail,
        contactPhone,
        projectAddress,
        projectCity,
        projectState,
        projectZipCode,
        budget: budget ? parseFloat(budget) : null,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        priority: priority || 'MEDIUM',
        status: 'ACTIVE',
        stageId: projectStage.id,
        companyId: user.companyId,
        ownerId: user.id
      },
      include: {
        stage: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    await prisma.activity.create({
      data: {
        type: 'project_created',
        description: `Created new project: ${title}`,
        cardId: project.id,
        userId: user.id
      }
    })

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error creating project:', error)
    return NextResponse.json(
      { error: 'Failed to create project' },
      { status: 500 }
    )
  }
}