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

    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
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
            description: true,
            status: true,
            priority: true,
            dueDate: true,
            completedAt: true,
            assignee: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            creator: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            milestone: {
              select: {
                id: true,
                title: true
              }
            },
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        budgetItems: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            amount: true,
            quantity: true,
            unit: true,
            isExpense: true,
            isPaid: true,
            paidAt: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        documents: {
          select: {
            id: true,
            name: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            isShared: true,
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            createdAt: true,
            updatedAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        estimates: {
          select: {
            id: true,
            estimateNumber: true,
            title: true,
            description: true,
            subtotal: true,
            tax: true,
            discount: true,
            total: true,
            status: true,
            validUntil: true,
            sentAt: true,
            viewedAt: true,
            acceptedAt: true,
            rejectedAt: true,
            createdAt: true,
            updatedAt: true,
            items: {
              select: {
                id: true,
                name: true,
                description: true,
                quantity: true,
                unit: true,
                unitPrice: true,
                total: true,
                order: true
              },
              orderBy: {
                order: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        activities: {
          select: {
            id: true,
            type: true,
            description: true,
            metadata: true,
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        },
        projectMilestones: {
          select: {
            id: true,
            title: true,
            description: true,
            targetDate: true,
            status: true,
            completedDate: true,
            order: true,
            tasks: {
              select: {
                id: true,
                status: true
              }
            }
          },
          orderBy: {
            order: 'asc'
          }
        },
        projectVendors: {
          select: {
            id: true,
            status: true,
            vendor: {
              select: {
                id: true,
                companyName: true,
                name: true
              }
            }
          }
        },
        purchaseOrders: {
          select: {
            id: true,
            orderNumber: true,
            status: true,
            total: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 5
        },
        boqItems: {
          select: {
            id: true,
            totalCost: true,
            actualCost: true
          }
        },
        _count: {
          select: {
            tasks: true,
            documents: true,
            estimates: true,
            budgetItems: true,
            projectMilestones: true,
            purchaseOrders: true,
            boqItems: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Calculate project metrics
    const now = new Date()
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const weekFromNow = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000)

    // Budget & Expense calculations
    const totalBudget = project.budgetItems
      .filter(item => !item.isExpense)
      .reduce((sum, item) => sum + item.amount, 0)

    const totalExpenses = project.budgetItems
      .filter(item => item.isExpense)
      .reduce((sum, item) => sum + item.amount, 0)

    const paidExpenses = project.budgetItems
      .filter(item => item.isExpense && item.isPaid)
      .reduce((sum, item) => sum + item.amount, 0)

    const unpaidExpenses = totalExpenses - paidExpenses

    // Group expenses by category
    const expensesByCategory = project.budgetItems
      .filter(item => item.isExpense)
      .reduce((acc: Record<string, number>, item) => {
        const category = item.category || 'Other'
        acc[category] = (acc[category] || 0) + item.amount
        return acc
      }, {})

    // Task calculations
    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length
    const inProgressTasks = project.tasks.filter(task => task.status === 'IN_PROGRESS').length
    const todoTasks = project.tasks.filter(task => task.status === 'TODO').length
    const totalTasks = project.tasks.length
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    // Overdue tasks
    const overdueTasks = project.tasks.filter(task =>
      task.dueDate &&
      new Date(task.dueDate) < today &&
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED'
    )

    // Upcoming tasks (due within 7 days)
    const upcomingTasks = project.tasks.filter(task =>
      task.dueDate &&
      new Date(task.dueDate) >= today &&
      new Date(task.dueDate) <= weekFromNow &&
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED'
    ).sort((a, b) => new Date(a.dueDate!).getTime() - new Date(b.dueDate!).getTime())

    // Recently completed tasks (last 7 days)
    const recentlyCompleted = project.tasks.filter(task =>
      task.status === 'COMPLETED' &&
      task.completedAt &&
      new Date(task.completedAt) >= new Date(today.getTime() - 7 * 24 * 60 * 60 * 1000)
    ).slice(0, 5)

    // High priority unfinished tasks
    const highPriorityTasks = project.tasks.filter(task =>
      (task.priority === 'HIGH' || task.priority === 'URGENT') &&
      task.status !== 'COMPLETED' &&
      task.status !== 'CANCELLED'
    )

    // Milestone calculations
    const completedMilestones = project.projectMilestones.filter(m => m.status === 'COMPLETED').length
    const totalMilestones = project.projectMilestones.length
    const upcomingMilestones = project.projectMilestones
      .filter(m => m.targetDate && new Date(m.targetDate) >= today && m.status !== 'COMPLETED')
      .sort((a, b) => new Date(a.targetDate!).getTime() - new Date(b.targetDate!).getTime())
      .slice(0, 3)
      .map(m => ({ ...m, name: m.title, dueDate: m.targetDate })) // Map to expected format

    const overdueMilestones = project.projectMilestones.filter(m =>
      m.targetDate &&
      new Date(m.targetDate) < today &&
      m.status !== 'COMPLETED'
    ).map(m => ({ ...m, name: m.title, dueDate: m.targetDate })) // Map to expected format

    // Timeline calculations
    let timelineProgress = 0
    let daysRemaining = null
    let daysElapsed = null
    let totalDays = null
    let isOverdue = false

    if (project.startDate) {
      const startDate = new Date(project.startDate)

      if (project.endDate) {
        const endDate = new Date(project.endDate)
        totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
        daysRemaining = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
        isOverdue = daysRemaining < 0
        timelineProgress = totalDays > 0 ? Math.min(100, Math.max(0, (daysElapsed / totalDays) * 100)) : 0
      } else {
        daysElapsed = Math.ceil((today.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24))
      }
    }

    // Budget utilization
    const budgetUtilization = project.budget && project.budget > 0
      ? (totalExpenses / project.budget) * 100
      : 0

    // Vendor stats
    const activeVendors = project.projectVendors.filter(v => v.status === 'ASSIGNED' || v.status === 'IN_PROGRESS').length

    // Purchase order stats
    const pendingPOs = project.purchaseOrders.filter(po => po.status === 'PENDING_APPROVAL' || po.status === 'APPROVED' || po.status === 'SENT').length
    const totalPOValue = project.purchaseOrders.reduce((sum, po) => sum + (po.total || 0), 0)

    // BOQ stats
    const completedBOQItems = project.boqItems.filter(item => item.actualCost !== null).length
    const totalBOQValue = project.boqItems.reduce((sum, item) => sum + (item.totalCost || 0), 0)

    // Document stats
    const recentDocuments = project.documents.slice(0, 5)
    const documentsByType = project.documents.reduce((acc: Record<string, number>, doc) => {
      const type = doc.mimeType?.split('/')[0] || 'other'
      acc[type] = (acc[type] || 0) + 1
      return acc
    }, {})

    // Project health score (0-100)
    let healthScore = 100
    const healthFactors: string[] = []

    // Deduct for overdue tasks (up to 30 points)
    if (overdueTasks.length > 0) {
      const overdueDeduction = Math.min(30, overdueTasks.length * 5)
      healthScore -= overdueDeduction
      healthFactors.push(`${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''}`)
    }

    // Deduct for overdue milestones (up to 20 points)
    if (overdueMilestones.length > 0) {
      const milestoneDeduction = Math.min(20, overdueMilestones.length * 10)
      healthScore -= milestoneDeduction
      healthFactors.push(`${overdueMilestones.length} overdue milestone${overdueMilestones.length > 1 ? 's' : ''}`)
    }

    // Deduct for budget overrun (up to 25 points)
    if (budgetUtilization > 100) {
      const budgetDeduction = Math.min(25, (budgetUtilization - 100) / 2)
      healthScore -= budgetDeduction
      healthFactors.push('Budget overrun')
    }

    // Deduct for timeline overdue (up to 25 points)
    if (isOverdue && daysRemaining !== null) {
      const timelineDeduction = Math.min(25, Math.abs(daysRemaining) * 2)
      healthScore -= timelineDeduction
      healthFactors.push('Past deadline')
    }

    healthScore = Math.max(0, Math.round(healthScore))

    const projectWithMetrics = {
      ...project,
      metrics: {
        // Core metrics
        totalBudget,
        totalExpenses,
        paidExpenses,
        unpaidExpenses,
        profit: totalBudget - totalExpenses,
        budgetUtilization: Math.round(budgetUtilization),
        expensesByCategory,

        // Task metrics
        progress: Math.round(progress),
        completedTasks,
        inProgressTasks,
        todoTasks,
        totalTasks,
        overdueTasks: overdueTasks.length,
        upcomingTasksCount: upcomingTasks.length,
        highPriorityCount: highPriorityTasks.length,

        // Milestone metrics
        completedMilestones,
        totalMilestones,
        milestonesProgress: totalMilestones > 0 ? Math.round((completedMilestones / totalMilestones) * 100) : 0,

        // Timeline metrics
        timelineProgress: Math.round(timelineProgress),
        daysRemaining,
        daysElapsed,
        totalDays,
        isOverdue,

        // Vendor & procurement
        activeVendors,
        totalVendors: project.projectVendors.length,
        pendingPOs,
        totalPOValue,

        // BOQ
        completedBOQItems,
        totalBOQItems: project.boqItems.length,
        totalBOQValue,

        // Documents
        totalDocuments: project.documents.length,
        documentsByType,

        // Health
        healthScore,
        healthFactors
      },
      insights: {
        overdueTasks: overdueTasks.slice(0, 5),
        upcomingTasks: upcomingTasks.slice(0, 5),
        recentlyCompleted,
        highPriorityTasks: highPriorityTasks.slice(0, 5),
        upcomingMilestones,
        overdueMilestones,
        recentDocuments
      }
    }

    return NextResponse.json(projectWithMetrics)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate and prepare update data
    const updateData: any = {
      updatedAt: new Date()
    }

    // Only include fields that are provided and valid
    if (body.title !== undefined) updateData.title = body.title
    if (body.description !== undefined) updateData.description = body.description
    if (body.contactName !== undefined) updateData.contactName = body.contactName
    if (body.contactEmail !== undefined) updateData.contactEmail = body.contactEmail
    if (body.contactPhone !== undefined) updateData.contactPhone = body.contactPhone
    if (body.projectAddress !== undefined) updateData.projectAddress = body.projectAddress
    if (body.projectCity !== undefined) updateData.projectCity = body.projectCity
    if (body.projectState !== undefined) updateData.projectState = body.projectState
    if (body.projectZipCode !== undefined) updateData.projectZipCode = body.projectZipCode
    if (body.projectSize !== undefined) updateData.projectSize = body.projectSize ? parseFloat(body.projectSize) : null
    if (body.projectSizeUnit !== undefined) updateData.projectSizeUnit = body.projectSizeUnit
    if (body.budget !== undefined) updateData.budget = body.budget ? parseFloat(body.budget) : null
    if (body.timeline !== undefined) updateData.timeline = body.timeline
    if (body.priority !== undefined) updateData.priority = body.priority
    if (body.status !== undefined) updateData.status = body.status

    // Handle date fields
    if (body.startDate !== undefined) {
      updateData.startDate = body.startDate ? new Date(body.startDate) : null
    }
    if (body.endDate !== undefined) {
      updateData.endDate = body.endDate ? new Date(body.endDate) : null
    }

    const updatedProject = await prisma.card.update({
      where: { id: projectId },
      data: updateData,
      include: {
        stage: true,
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
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'project_updated',
        description: `Updated project details: ${updatedProject.title}`,
        cardId: projectId,
        userId: user.id,
        metadata: JSON.stringify({
          updatedFields: Object.keys(updateData).filter(key => key !== 'updatedAt')
        })
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
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

    const { id: projectId } = await params
    const body = await request.json()

    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const updatedProject = await prisma.card.update({
      where: { id: projectId },
      data: {
        ...body,
        updatedAt: new Date()
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
        type: 'project_updated',
        description: `Updated project: ${updatedProject.title}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}