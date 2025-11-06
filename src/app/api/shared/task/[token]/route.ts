import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the task by share token
    const task = await prisma.task.findFirst({
      where: {
        shareToken: token,
        isShareable: true
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        card: {
          select: {
            id: true,
            title: true,
            contactName: true,
            projectAddress: true,
            projectCity: true,
            projectState: true,
            company: {
              select: {
                name: true,
                logo: true,
                website: true
              }
            }
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or sharing disabled' }, { status: 404 })
    }

    // Track that the task was opened
    await prisma.taskInteraction.create({
      data: {
        taskId: task.id,
        action: 'OPENED',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date()
      }
    })

    return NextResponse.json({
      task: {
        id: task.id,
        title: task.title,
        description: task.description,
        status: task.status,
        priority: task.priority,
        dueDate: task.dueDate,
        createdAt: task.createdAt,
        category: task.category,
        assignee: task.assignee,
        creator: task.creator
      },
      project: {
        id: task.card.id,
        title: task.card.title,
        contactName: task.card.contactName,
        location: [
          task.card.projectAddress,
          task.card.projectCity,
          task.card.projectState
        ].filter(Boolean).join(', ')
      },
      company: task.card.company
    })
  } catch (error) {
    console.error('Error fetching shared task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const body = await request.json()

    // Find the task by share token
    const task = await prisma.task.findFirst({
      where: {
        shareToken: token,
        isShareable: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or sharing disabled' }, { status: 404 })
    }

    // Only allow updating status
    if (!body.status || !['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(body.status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Update task status
    const updatedTask = await prisma.task.update({
      where: { id: task.id },
      data: {
        status: body.status,
        completedAt: body.status === 'COMPLETED' ? new Date() : null,
        updatedAt: new Date()
      }
    })

    // Track the interaction
    await prisma.taskInteraction.create({
      data: {
        taskId: task.id,
        action: body.status === 'IN_PROGRESS' ? 'STARTED' : body.status === 'COMPLETED' ? 'COMPLETED' : 'UPDATED',
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers.get('user-agent') || 'unknown',
        timestamp: new Date(),
        metadata: JSON.stringify({ status: body.status })
      }
    })

    return NextResponse.json({ 
      success: true, 
      status: updatedTask.status,
      completedAt: updatedTask.completedAt 
    })
  } catch (error) {
    console.error('Error updating shared task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}