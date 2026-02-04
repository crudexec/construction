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
            email: true,
            currency: true
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
        clientPortalSettings: true,
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

    // Get portal settings (with defaults if none exist)
    const portalSettings = project.clientPortalSettings || {
      showProgress: true,
      showTimeline: true,
      showBudgetSummary: false,
      showProjectDescription: true,
      showTeamMembers: true,
      showTasks: true,
      showTaskAssignees: false,
      showTaskDueDates: true,
      showCompletedTasks: true,
      hideInternalTasks: true,
      showDocuments: true,
      allowedFileTypes: '["pdf","jpg","jpeg","png","doc","docx"]',
      hideInternalDocuments: true,
      showEstimates: true,
      showEstimateDetails: false,
      showInvoices: false,
      showPayments: false,
      showMessages: true,
      showActivityFeed: true,
      hideInternalMessages: true,
      showPhotos: true,
      showWalkarounds: false,
      customWelcomeMessage: null
    }

    // Parse allowed file types
    let allowedFileTypes = ['pdf', 'jpg', 'jpeg', 'png', 'doc', 'docx']
    try {
      if (portalSettings.allowedFileTypes) {
        allowedFileTypes = JSON.parse(portalSettings.allowedFileTypes)
      }
    } catch (error) {
      console.error('Error parsing allowed file types:', error)
    }

    // Filter tasks based on settings
    let filteredTasks = project.tasks
    if (!portalSettings.showTasks) {
      filteredTasks = []
    } else {
      // Filter out internal tasks if hideInternalTasks is enabled
      if (portalSettings.hideInternalTasks) {
        // Assuming internal tasks have a flag or are identified by description/category
        filteredTasks = filteredTasks.filter(task => 
          !task.description?.toLowerCase().includes('[internal]') &&
          !task.title.toLowerCase().includes('[internal]')
        )
      }
      
      // Filter out completed tasks if showCompletedTasks is disabled
      if (!portalSettings.showCompletedTasks) {
        filteredTasks = filteredTasks.filter(task => task.status !== 'COMPLETED')
      }
      
      // Remove assignee info if showTaskAssignees is disabled
      if (!portalSettings.showTaskAssignees) {
        filteredTasks = filteredTasks.map(task => ({
          ...task,
          assignee: null
        }))
      }
      
      // Remove due dates if showTaskDueDates is disabled
      if (!portalSettings.showTaskDueDates) {
        filteredTasks = filteredTasks.map(task => ({
          ...task,
          dueDate: null
        }))
      }
    }

    // Filter documents based on settings
    let filteredDocuments = project.documents
    if (!portalSettings.showDocuments) {
      filteredDocuments = []
    } else {
      // Filter by allowed file types
      if (allowedFileTypes.length > 0) {
        filteredDocuments = filteredDocuments.filter(doc => {
          const fileExt = doc.fileName.toLowerCase().split('.').pop()
          return allowedFileTypes.includes(fileExt || '')
        })
      }
      
      // Hide internal documents if enabled
      if (portalSettings.hideInternalDocuments) {
        filteredDocuments = filteredDocuments.filter(doc => 
          !doc.name.toLowerCase().includes('[internal]') &&
          !doc.folder?.name.toLowerCase().includes('internal')
        )
      }
    }

    // Filter estimates based on settings
    let filteredEstimates = project.estimates
    if (!portalSettings.showEstimates) {
      filteredEstimates = []
    }

    // Filter activities based on settings
    let filteredActivities = project.activities
    if (!portalSettings.showActivityFeed) {
      filteredActivities = []
    } else if (portalSettings.hideInternalMessages) {
      filteredActivities = filteredActivities.filter(activity => 
        !activity.description.toLowerCase().includes('[internal]')
      )
    }

    // Calculate project metrics using filtered data
    const totalTasks = filteredTasks.length
    const completedTasks = filteredTasks.filter(t => t.status === 'COMPLETED').length
    const overdueTasks = filteredTasks.filter(t => 
      t.status !== 'COMPLETED' && t.dueDate && new Date(t.dueDate) < new Date()
    ).length
    const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0

    // Group filtered tasks by category
    const tasksByCategory = filteredTasks.reduce((acc: any, task) => {
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

    // Get only images from filtered documents
    const images = filteredDocuments.filter(doc => 
      doc.mimeType.startsWith('image/') && portalSettings.showPhotos
    )

    // Get other documents from filtered documents
    const otherDocuments = filteredDocuments.filter(doc => 
      !doc.mimeType.startsWith('image/')
    )

    // Build the response based on portal settings
    const response: any = {
      project: {
        id: project.id,
        title: project.title,
        description: portalSettings.showProjectDescription ? project.description : null,
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
        budget: portalSettings.showBudgetSummary ? project.budget : null,
        startDate: portalSettings.showTimeline ? project.startDate : null,
        endDate: portalSettings.showTimeline ? project.endDate : null,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt
      },
      company: project.company,
      projectManager: portalSettings.showTeamMembers ? project.owner : null,
      metrics: {
        totalTasks: portalSettings.showTasks ? totalTasks : 0,
        completedTasks: portalSettings.showTasks ? completedTasks : 0,
        overdueTasks: portalSettings.showTasks ? overdueTasks : 0,
        progressPercentage: portalSettings.showProgress ? progressPercentage : null,
        totalDocuments: portalSettings.showDocuments ? filteredDocuments.length : 0,
        totalImages: portalSettings.showPhotos ? images.length : 0,
        totalEstimates: portalSettings.showEstimates ? filteredEstimates.length : 0
      },
      portalSettings: {
        showTasks: portalSettings.showTasks,
        showDocuments: portalSettings.showDocuments,
        showPhotos: portalSettings.showPhotos,
        showEstimates: portalSettings.showEstimates,
        showActivityFeed: portalSettings.showActivityFeed,
        showMessages: portalSettings.showMessages,
        showEstimateDetails: portalSettings.showEstimateDetails,
        customWelcomeMessage: portalSettings.customWelcomeMessage
      }
    }

    // Add optional sections based on settings
    if (portalSettings.showTasks) {
      response.tasksByCategory = Object.values(tasksByCategory)
      response.tasks = filteredTasks
    }

    if (portalSettings.showPhotos) {
      response.images = images
    }

    if (portalSettings.showDocuments) {
      response.documents = otherDocuments
    }

    if (portalSettings.showActivityFeed) {
      response.activities = filteredActivities
    }

    if (portalSettings.showEstimates) {
      response.estimates = filteredEstimates
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error fetching client project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project data' },
      { status: 500 }
    )
  }
}