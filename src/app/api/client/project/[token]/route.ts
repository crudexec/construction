import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the project by client access token
    const projects = await prisma.card.findMany({
      where: {
        customFields: {
          contains: token
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
        company: {
          select: {
            name: true,
            logo: true,
            website: true,
            phone: true,
            email: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true
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
            category: {
              select: {
                id: true,
                name: true,
                color: true
              }
            },
            assignee: {
              select: {
                firstName: true,
                lastName: true
              }
            }
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
            createdAt: true,
            folder: {
              select: {
                id: true,
                name: true,
                color: true
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
            createdAt: true,
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
          take: 20
        },
        estimates: {
          where: {
            status: {
              in: ['SENT', 'VIEWED', 'ACCEPTED']
            }
          },
          select: {
            id: true,
            estimateNumber: true,
            title: true,
            total: true,
            status: true,
            validUntil: true,
            createdAt: true
          },
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    // Find the project that has this specific token
    const project = projects.find(p => {
      const customFields = JSON.parse(p.customFields || '{}')
      return customFields.clientAccessToken === token && customFields.clientAccessEnabled === true
    })

    if (!project) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 })
    }

    // Calculate project metrics
    const totalTasks = project.tasks.length
    const completedTasks = project.tasks.filter(t => t.status === 'COMPLETED').length
    const overdueTasks = project.tasks.filter(t => 
      t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group tasks by category
    const tasksByCategory = project.tasks.reduce((acc: any, task) => {
      const categoryName = task.category?.name || 'Uncategorized'
      if (!acc[categoryName]) {
        acc[categoryName] = {
          name: categoryName,
          color: task.category?.color || '#6B7280',
          tasks: []
        }
      }
      acc[categoryName].tasks.push(task)
      return acc
    }, {})

    // Get only images from documents
    const images = project.documents.filter(doc => 
      doc.mimeType.startsWith('image/')
    )

    // Get other documents
    const otherDocuments = project.documents.filter(doc => 
      !doc.mimeType.startsWith('image/')
    )

    return NextResponse.json({
      project: {
        id: project.id,
        title: project.title,
        description: project.description,
        status: project.status,
        priority: project.priority,
        stage: project.stage,
        contactName: project.contactName,
        contactEmail: project.contactEmail,
        contactPhone: project.contactPhone,
        projectAddress: project.projectAddress,
        projectCity: project.projectCity,
        projectState: project.projectState,
        projectZipCode: project.projectZipCode,
        budget: project.budget,
        startDate: project.startDate,
        endDate: project.endDate,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      company: project.company,
      projectManager: project.owner,
      metrics: {
        totalTasks,
        completedTasks,
        overdueTasks,
        progressPercentage,
        totalDocuments: project.documents.length,
        totalImages: images.length,
        totalEstimates: project.estimates.length
      },
      tasksByCategory: Object.values(tasksByCategory),
      tasks: project.tasks,
      images,
      documents: otherDocuments,
      activities: project.activities,
      estimates: project.estimates
    })
  } catch (error) {
    console.error('Error fetching client project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 }
    )
  }
}