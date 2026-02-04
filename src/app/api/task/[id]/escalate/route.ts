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

    // Verify task exists and belongs to user's company
    const task = await prisma.task.findFirst({
      where: {
        id,
        card: {
          companyId: user.companyId
        }
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            ownerId: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (task.isEscalated) {
      return NextResponse.json(
        { error: 'Task is already escalated' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { reason } = body

    // Update task as escalated
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        isEscalated: true,
        escalatedAt: new Date(),
        escalatedBy: user.id,
        escalationReason: reason || null
      }
    })

    // Create notification for project owner
    if (task.card.ownerId) {
      await prisma.notification.create({
        data: {
          type: 'task_escalated',
          title: 'Task Escalated',
          message: `Task "${task.title}" in project "${task.card.title}" has been escalated${reason ? `: ${reason}` : ''}`,
          userId: task.card.ownerId,
          metadata: JSON.stringify({
            taskId: id,
            projectId: task.card.id,
            escalatedBy: user.id
          })
        }
      })
    }

    // Create notification for task assignee if different from escalator
    if (task.assignee && task.assignee.id !== user.id) {
      await prisma.notification.create({
        data: {
          type: 'task_escalated',
          title: 'Task Escalated',
          message: `Task "${task.title}" assigned to you has been escalated${reason ? `: ${reason}` : ''}`,
          userId: task.assignee.id,
          metadata: JSON.stringify({
            taskId: id,
            projectId: task.card.id,
            escalatedBy: user.id
          })
        }
      })
    }

    // Log activity
    await prisma.activity.create({
      data: {
        type: 'task_escalated',
        description: `Task "${task.title}" was escalated by ${user.firstName} ${user.lastName}`,
        cardId: task.card.id,
        userId: user.id,
        metadata: JSON.stringify({
          taskId: id,
          reason
        })
      }
    })

    return NextResponse.json({
      message: 'Task escalated successfully',
      task: updatedTask
    })

  } catch (error) {
    console.error('Error escalating task:', error)
    return NextResponse.json(
      { error: 'Failed to escalate task' },
      { status: 500 }
    )
  }
}

// De-escalate task
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

    const { id } = await params

    // Verify task exists and belongs to user's company
    const task = await prisma.task.findFirst({
      where: {
        id,
        card: {
          companyId: user.companyId
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.isEscalated) {
      return NextResponse.json(
        { error: 'Task is not escalated' },
        { status: 400 }
      )
    }

    // Remove escalation
    const updatedTask = await prisma.task.update({
      where: { id },
      data: {
        isEscalated: false,
        escalatedAt: null,
        escalatedBy: null,
        escalationReason: null
      }
    })

    return NextResponse.json({
      message: 'Task de-escalated successfully',
      task: updatedTask
    })

  } catch (error) {
    console.error('Error de-escalating task:', error)
    return NextResponse.json(
      { error: 'Failed to de-escalate task' },
      { status: 500 }
    )
  }
}
