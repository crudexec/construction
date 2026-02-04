import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    // Find milestones that are directly assigned to this vendor
    const whereClause: any = {
      vendorId: vendor.id
    }

    if (status) {
      whereClause.status = status
    }

    const milestones = await prisma.projectMilestone.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        amount: true,
        targetDate: true,
        status: true,
        project: {
          select: {
            id: true,
            title: true
          }
        },
        // Get ALL tasks under this milestone (not just vendor-assigned tasks)
        tasks: {
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            priority: true,
            dueDate: true
          },
          orderBy: [
            { order: 'asc' },
            { createdAt: 'asc' }
          ]
        }
      },
      orderBy: [
        { order: 'asc' },
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
    console.error('Vendor milestones error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestones' },
      { status: 500 }
    )
  }
}
