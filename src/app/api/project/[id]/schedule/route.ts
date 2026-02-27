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

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get schedule activities with WBS and relationships
    const activities = await prisma.scheduleActivity.findMany({
      where: { projectId },
      include: {
        wbs: true,
        predecessors: {
          include: {
            predecessor: {
              select: {
                id: true,
                activityId: true,
                name: true,
              },
            },
          },
        },
        successors: {
          include: {
            successor: {
              select: {
                id: true,
                activityId: true,
                name: true,
              },
            },
          },
        },
        linkedTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        linkedMilestone: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
      orderBy: [{ wbsId: 'asc' }, { sortOrder: 'asc' }],
    })

    // Get WBS hierarchy
    const wbs = await prisma.scheduleWBS.findMany({
      where: { projectId },
      orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    })

    // Get latest import info
    const latestImport = await prisma.scheduleImport.findFirst({
      where: { projectId },
      orderBy: { importedAt: 'desc' },
    })

    // Calculate schedule statistics
    const stats = {
      totalActivities: activities.length,
      completedActivities: activities.filter((a) => a.status === 'COMPLETED').length,
      inProgressActivities: activities.filter((a) => a.status === 'IN_PROGRESS').length,
      notStartedActivities: activities.filter((a) => a.status === 'NOT_STARTED').length,
      criticalActivities: activities.filter((a) => a.isCritical).length,
      overallProgress:
        activities.length > 0
          ? Math.round(
              activities.reduce((sum, a) => sum + a.percentComplete, 0) / activities.length
            )
          : 0,
    }

    // Find project date range from activities
    const allDates = activities
      .flatMap((a) => [a.plannedStart, a.plannedFinish, a.actualStart, a.actualFinish])
      .filter((d): d is Date => d !== null)

    const dateRange = {
      minDate: allDates.length > 0 ? new Date(Math.min(...allDates.map((d) => d.getTime()))) : null,
      maxDate: allDates.length > 0 ? new Date(Math.max(...allDates.map((d) => d.getTime()))) : null,
    }

    return NextResponse.json({
      activities,
      wbs,
      stats,
      dateRange,
      latestImport: latestImport
        ? {
            id: latestImport.id,
            fileName: latestImport.fileName,
            importedAt: latestImport.importedAt,
            activitiesCount: latestImport.activitiesCount,
            xerProjectName: latestImport.xerProjectName,
          }
        : null,
    })
  } catch (error) {
    console.error('Error fetching schedule:', error)
    return NextResponse.json({ error: 'Failed to fetch schedule' }, { status: 500 })
  }
}

// Update activity (for linking to tasks/milestones or updating progress)
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
    const { activityId, linkedTaskId, linkedMilestoneId, percentComplete, status } = body

    if (!activityId) {
      return NextResponse.json({ error: 'Activity ID is required' }, { status: 400 })
    }

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify activity exists in this project
    const activity = await prisma.scheduleActivity.findFirst({
      where: {
        id: activityId,
        projectId,
      },
    })

    if (!activity) {
      return NextResponse.json({ error: 'Activity not found' }, { status: 404 })
    }

    // Prepare update data
    const updateData: Record<string, unknown> = {}

    if (linkedTaskId !== undefined) {
      // If linking to a task, verify the task exists in this project
      if (linkedTaskId) {
        const task = await prisma.task.findFirst({
          where: { id: linkedTaskId, cardId: projectId },
        })
        if (!task) {
          return NextResponse.json({ error: 'Task not found' }, { status: 404 })
        }
      }
      updateData.linkedTaskId = linkedTaskId || null
    }

    if (linkedMilestoneId !== undefined) {
      // If linking to a milestone, verify the milestone exists in this project
      if (linkedMilestoneId) {
        const milestone = await prisma.projectMilestone.findFirst({
          where: { id: linkedMilestoneId, projectId },
        })
        if (!milestone) {
          return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
        }
      }
      updateData.linkedMilestoneId = linkedMilestoneId || null
    }

    if (percentComplete !== undefined) {
      updateData.percentComplete = Math.max(0, Math.min(100, percentComplete))
    }

    if (status !== undefined) {
      if (!['NOT_STARTED', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
        return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
      }
      updateData.status = status
    }

    // Update activity
    const updatedActivity = await prisma.scheduleActivity.update({
      where: { id: activityId },
      data: updateData,
      include: {
        wbs: true,
        linkedTask: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
        linkedMilestone: {
          select: {
            id: true,
            title: true,
            status: true,
          },
        },
      },
    })

    return NextResponse.json(updatedActivity)
  } catch (error) {
    console.error('Error updating activity:', error)
    return NextResponse.json({ error: 'Failed to update activity' }, { status: 500 })
  }
}

// Delete all schedule data for project
export async function DELETE(
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

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete all schedule data in a transaction
    await prisma.$transaction(async (tx) => {
      await tx.scheduleRelationship.deleteMany({ where: { projectId } })
      await tx.scheduleActivity.deleteMany({ where: { projectId } })
      await tx.scheduleWBS.deleteMany({ where: { projectId } })
      // Keep import logs for history
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'schedule_deleted',
        description: 'Deleted project schedule data',
        cardId: projectId,
        userId: user.id,
      },
    })

    return NextResponse.json({ success: true, message: 'Schedule data deleted' })
  } catch (error) {
    console.error('Error deleting schedule:', error)
    return NextResponse.json({ error: 'Failed to delete schedule' }, { status: 500 })
  }
}
