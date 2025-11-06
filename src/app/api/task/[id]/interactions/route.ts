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

    const { id: taskId } = await params

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            title: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get all interactions for this task
    const interactions = await prisma.taskInteraction.findMany({
      where: { taskId },
      orderBy: { timestamp: 'desc' }
    })

    // Aggregate statistics
    const stats = {
      totalViews: interactions.filter(i => i.action === 'OPENED').length,
      totalStarts: interactions.filter(i => i.action === 'STARTED').length,
      totalCompletions: interactions.filter(i => i.action === 'COMPLETED').length,
      lastViewed: interactions.find(i => i.action === 'OPENED')?.timestamp || null,
      lastStarted: interactions.find(i => i.action === 'STARTED')?.timestamp || null,
      lastCompleted: interactions.find(i => i.action === 'COMPLETED')?.timestamp || null,
      uniqueIps: [...new Set(interactions.map(i => i.ipAddress))].length
    }

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        shareToken: task.shareToken,
        isShareable: task.isShareable,
        sharedAt: task.sharedAt,
        status: task.status,
        priority: task.priority,
        project: {
          title: task.card.title || 'Untitled Project'
        }
      },
      stats,
      interactions: interactions.map(interaction => ({
        id: interaction.id,
        action: interaction.action,
        timestamp: interaction.timestamp,
        ipAddress: interaction.ipAddress,
        userAgent: interaction.userAgent,
        metadata: interaction.metadata
      }))
    })
  } catch (error) {
    console.error('Error fetching task interactions:', error)
    return NextResponse.json(
      { error: 'Failed to fetch interactions' },
      { status: 500 }
    )
  }
}