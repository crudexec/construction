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

    const { id: vendorId } = await params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')
    const status = searchParams.get('status')

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Build where clause with optional filters
    const whereClause: Record<string, unknown> = {
      vendorId: vendorId
    }

    if (projectId) {
      whereClause.projectId = projectId
    }

    if (status) {
      whereClause.status = status
    }

    // Fetch project milestones assigned to this vendor
    const milestones = await prisma.projectMilestone.findMany({
      where: whereClause,
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true
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
        // Get ALL tasks under this milestone (not filtered by vendorId)
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
        }
      },
      orderBy: [
        { status: 'asc' },
        { targetDate: 'asc' }
      ]
    })

    // Calculate progress for each milestone
    const milestonesWithProgress = milestones.map(milestone => {
      const tasks = milestone.tasks || []
      const completedTasksCount = tasks.filter(t => t.status === 'COMPLETED').length
      const totalTasksCount = tasks.length
      const taskProgress = totalTasksCount > 0 ? Math.round((completedTasksCount / totalTasksCount) * 100) : 0

      const checklistItems = milestone.checklistItems || []
      const completedChecklistItems = checklistItems.filter(i => i.status === 'COMPLETED').length
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
    console.error('Error fetching vendor milestones:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor milestones' },
      { status: 500 }
    )
  }
}
