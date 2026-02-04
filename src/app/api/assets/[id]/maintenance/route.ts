import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// Get maintenance schedules and records for an asset
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

    const { id } = await params

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const [schedules, records] = await Promise.all([
      prisma.maintenanceSchedule.findMany({
        where: { assetId: id },
        orderBy: { nextDueDate: 'asc' }
      }),
      prisma.maintenanceRecord.findMany({
        where: { assetId: id },
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
        },
        orderBy: { performedDate: 'desc' },
        take: 20
      })
    ])

    return NextResponse.json({ schedules, records })

  } catch (error) {
    console.error('Error fetching maintenance data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch maintenance data' },
      { status: 500 }
    )
  }
}

// Create a new maintenance schedule
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

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, type, intervalDays, nextDueDate, alertUserIds } = body

    if (!title) {
      return NextResponse.json(
        { error: 'Title is required' },
        { status: 400 }
      )
    }

    if (!type || !['ONE_TIME', 'RECURRING'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid type is required (ONE_TIME or RECURRING)' },
        { status: 400 }
      )
    }

    if (type === 'RECURRING' && (!intervalDays || intervalDays < 1)) {
      return NextResponse.json(
        { error: 'Interval days is required for recurring schedules' },
        { status: 400 }
      )
    }

    if (!nextDueDate) {
      return NextResponse.json(
        { error: 'Next due date is required' },
        { status: 400 }
      )
    }

    // Validate alert user IDs if provided
    if (alertUserIds && alertUserIds.length > 0) {
      const validUsers = await prisma.user.findMany({
        where: {
          id: { in: alertUserIds },
          companyId: user.companyId
        },
        select: { id: true }
      })

      if (validUsers.length !== alertUserIds.length) {
        return NextResponse.json(
          { error: 'One or more alert users not found' },
          { status: 404 }
        )
      }
    }

    const schedule = await prisma.maintenanceSchedule.create({
      data: {
        assetId: id,
        title,
        description: description || null,
        type,
        intervalDays: type === 'RECURRING' ? intervalDays : null,
        nextDueDate: new Date(nextDueDate),
        alertUserIds: alertUserIds || [],
        isActive: true
      }
    })

    return NextResponse.json(schedule, { status: 201 })

  } catch (error) {
    console.error('Error creating maintenance schedule:', error)
    return NextResponse.json(
      { error: 'Failed to create maintenance schedule' },
      { status: 500 }
    )
  }
}
