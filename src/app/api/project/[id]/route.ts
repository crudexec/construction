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
        _count: {
          select: {
            tasks: true,
            documents: true,
            estimates: true,
            budgetItems: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Calculate project metrics
    const totalBudget = project.budgetItems
      .filter(item => !item.isExpense)
      .reduce((sum, item) => sum + item.amount, 0)
    
    const totalExpenses = project.budgetItems
      .filter(item => item.isExpense)
      .reduce((sum, item) => sum + item.amount, 0)

    const completedTasks = project.tasks.filter(task => task.status === 'COMPLETED').length
    const totalTasks = project.tasks.length
    const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0

    const overdueTasks = project.tasks.filter(task => 
      task.dueDate && 
      new Date(task.dueDate) < new Date() && 
      task.status !== 'COMPLETED'
    ).length

    const projectWithMetrics = {
      ...project,
      metrics: {
        totalBudget,
        totalExpenses,
        profit: totalBudget - totalExpenses,
        progress: Math.round(progress),
        completedTasks,
        totalTasks,
        overdueTasks
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