import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function POST(
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

    const { id } = await params

    // Verify schedule exists and belongs to user's company
    const schedule = await prisma.maintenanceSchedule.findFirst({
      where: {
        id,
        asset: {
          companyId: user.companyId
        }
      },
      include: {
        asset: true
      }
    })

    if (!schedule) {
      return NextResponse.json({ error: 'Maintenance schedule not found' }, { status: 404 })
    }

    const body = await request.json()
    const { performedDate, cost, description, notes, performedById } = body

    // Validate performed by user if provided
    const actualPerformerId = performedById || user.id
    if (performedById && performedById !== user.id) {
      const performer = await prisma.user.findFirst({
        where: {
          id: performedById,
          companyId: user.companyId
        }
      })

      if (!performer) {
        return NextResponse.json(
          { error: 'Performer not found' },
          { status: 404 }
        )
      }
    }

    // Create maintenance record
    const record = await prisma.maintenanceRecord.create({
      data: {
        assetId: schedule.assetId,
        scheduleId: id,
        title: schedule.title,
        performedDate: performedDate ? new Date(performedDate) : new Date(),
        cost: cost || null,
        description: description || null,
        notes: notes || null,
        performedById: actualPerformerId
      },
      include: {
        performedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        schedule: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    // Update schedule's last completed date and calculate next due date
    let nextDueDate = schedule.nextDueDate
    if (schedule.type === 'RECURRING' && schedule.intervalDays) {
      // Calculate next due date based on the interval
      const lastPerformed = performedDate ? new Date(performedDate) : new Date()
      nextDueDate = new Date(lastPerformed)
      nextDueDate.setDate(nextDueDate.getDate() + schedule.intervalDays)
    }

    // For one-time schedules, mark as inactive
    const updateData: any = {
      lastCompletedDate: performedDate ? new Date(performedDate) : new Date()
    }

    if (schedule.type === 'ONE_TIME') {
      updateData.isActive = false
    } else {
      updateData.nextDueDate = nextDueDate
    }

    await prisma.maintenanceSchedule.update({
      where: { id },
      data: updateData
    })

    // If asset was under maintenance, update status
    if (schedule.asset.status === 'UNDER_MAINTENANCE') {
      await prisma.asset.update({
        where: { id: schedule.assetId },
        data: {
          status: schedule.asset.currentAssigneeId ? 'IN_USE' : 'AVAILABLE'
        }
      })
    }

    return NextResponse.json({
      message: 'Maintenance completed successfully',
      record,
      nextDueDate: schedule.type === 'RECURRING' ? nextDueDate : null
    })

  } catch (error) {
    console.error('Error completing maintenance:', error)
    return NextResponse.json(
      { error: 'Failed to complete maintenance' },
      { status: 500 }
    )
  }
}
