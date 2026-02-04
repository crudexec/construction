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

    // Fetch project milestones assigned to this vendor
    const milestones = await prisma.projectMilestone.findMany({
      where: {
        vendorId: vendorId
      },
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
      const completedCount = tasks.filter(t => t.status === 'COMPLETED').length
      const totalCount = tasks.length
      const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

      return {
        ...milestone,
        completedTasksCount: completedCount,
        totalTasksCount: totalCount,
        progress
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
