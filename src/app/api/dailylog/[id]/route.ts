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

    const { id: logId } = await params
    
    const dailyLog = await prisma.dailyLog.findFirst({
      where: { 
        id: logId,
        card: {
          companyId: user.companyId
        }
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        card: {
          select: {
            id: true,
            title: true,
            projectAddress: true
          }
        }
      }
    })

    if (!dailyLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...dailyLog,
      photos: dailyLog.photos ? JSON.parse(dailyLog.photos) : []
    })
  } catch (error) {
    console.error('Error fetching daily log:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily log' },
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

    const { id: logId } = await params
    const body = await request.json()
    
    // Verify the log exists and user has access
    const existingLog = await prisma.dailyLog.findFirst({
      where: { 
        id: logId,
        card: {
          companyId: user.companyId
        }
      },
      include: {
        card: true
      }
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    // Only allow the author or admin to edit
    if (existingLog.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to edit this log' }, { status: 403 })
    }

    // Update the daily log
    const updatedLog = await prisma.dailyLog.update({
      where: { id: logId },
      data: {
        weatherCondition: body.weatherCondition,
        temperature: body.temperature ? parseFloat(body.temperature) : null,
        weatherNotes: body.weatherNotes,
        workCompleted: body.workCompleted,
        materialsUsed: body.materialsUsed,
        equipment: body.equipment,
        workersOnSite: body.workersOnSite || 0,
        workerDetails: body.workerDetails,
        issues: body.issues,
        delays: body.delays,
        safetyIncidents: body.safetyIncidents,
        photos: body.photos ? JSON.stringify(body.photos) : null,
        notes: body.notes
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'dailylog_updated',
        description: `Updated daily log for ${new Date(existingLog.date).toLocaleDateString()}`,
        cardId: existingLog.cardId,
        userId: user.id
      }
    })

    return NextResponse.json({
      ...updatedLog,
      photos: updatedLog.photos ? JSON.parse(updatedLog.photos) : []
    })
  } catch (error) {
    console.error('Error updating daily log:', error)
    return NextResponse.json(
      { error: 'Failed to update daily log' },
      { status: 500 }
    )
  }
}

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

    const { id: logId } = await params
    
    // Verify the log exists and user has access
    const existingLog = await prisma.dailyLog.findFirst({
      where: { 
        id: logId,
        card: {
          companyId: user.companyId
        }
      }
    })

    if (!existingLog) {
      return NextResponse.json({ error: 'Daily log not found' }, { status: 404 })
    }

    // Only allow the author or admin to delete
    if (existingLog.authorId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized to delete this log' }, { status: 403 })
    }

    await prisma.dailyLog.delete({
      where: { id: logId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'dailylog_deleted',
        description: `Deleted daily log for ${new Date(existingLog.date).toLocaleDateString()}`,
        cardId: existingLog.cardId,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting daily log:', error)
    return NextResponse.json(
      { error: 'Failed to delete daily log' },
      { status: 500 }
    )
  }
}