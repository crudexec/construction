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
    const projectId = searchParams.get('projectId')

    // Show tasks that are either:
    // 1. Directly assigned to this vendor (task.vendorId), OR
    // 2. Under a milestone assigned to this vendor (milestone.vendorId)
    const whereClause: any = {
      OR: [
        { vendorId: vendor.id },
        {
          milestone: {
            vendorId: vendor.id
          }
        }
      ]
    }

    if (status) {
      whereClause.status = status
    }

    if (projectId) {
      whereClause.cardId = projectId
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        createdAt: true,
        card: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        milestone: {
          select: {
            id: true,
            title: true,
            status: true,
            targetDate: true
          }
        },
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
        // Note: budgetAmount and approvedAmount are NOT included (internal only)
      },
      orderBy: [
        { status: 'asc' },
        { dueDate: 'asc' }
      ]
    })

    return NextResponse.json(tasks)

  } catch (error) {
    console.error('Vendor tasks error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tasks' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const body = await request.json()
    const { taskId, status } = body

    if (!taskId) {
      return NextResponse.json({ error: 'Task ID is required' }, { status: 400 })
    }

    // Verify task belongs to vendor (either directly or through milestone)
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { vendorId: vendor.id },
          {
            milestone: {
              vendorId: vendor.id
            }
          }
        ]
      },
      include: {
        milestone: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    // Vendors can only update status
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    if (!['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        card: {
          select: {
            id: true,
            title: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error('Vendor task update error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
