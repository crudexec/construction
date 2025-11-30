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

    const { id: cardId } = await params
    
    // Verify the project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: cardId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get daily logs for this project
    const dailyLogs = await prisma.dailyLog.findMany({
      where: { cardId },
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
      },
      orderBy: { date: 'desc' }
    })

    // Parse photos from JSON string to array
    const logsWithParsedPhotos = dailyLogs.map(log => ({
      ...log,
      photos: log.photos ? JSON.parse(log.photos) : []
    }))

    return NextResponse.json(logsWithParsedPhotos)
  } catch (error) {
    console.error('Error fetching daily logs:', error)
    return NextResponse.json(
      { error: 'Failed to fetch daily logs' },
      { status: 500 }
    )
  }
}

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

    const { id: cardId } = await params
    const body = await request.json()
    
    // Verify the project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: cardId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if a log already exists for this date
    const logDate = body.date ? new Date(body.date) : new Date()
    logDate.setHours(0, 0, 0, 0) // Set to start of day
    
    const endOfDay = new Date(logDate)
    endOfDay.setHours(23, 59, 59, 999)
    
    const existingLog = await prisma.dailyLog.findFirst({
      where: {
        cardId,
        date: {
          gte: logDate,
          lte: endOfDay
        }
      }
    })

    if (existingLog) {
      return NextResponse.json(
        { error: 'A daily log already exists for this date' },
        { status: 400 }
      )
    }

    // Create the daily log
    const dailyLog = await prisma.dailyLog.create({
      data: {
        date: logDate,
        cardId,
        authorId: user.id,
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
        type: 'dailylog_created',
        description: `Created daily log for ${logDate.toLocaleDateString()}`,
        cardId,
        userId: user.id
      }
    })

    return NextResponse.json({
      ...dailyLog,
      photos: dailyLog.photos ? JSON.parse(dailyLog.photos) : []
    })
  } catch (error) {
    console.error('Error creating daily log:', error)
    return NextResponse.json(
      { error: 'Failed to create daily log' },
      { status: 500 }
    )
  }
}