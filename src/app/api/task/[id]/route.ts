import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const { id: taskId } = await params
    const body = await request.json()

    // Verify task exists and user has access (through project company)
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // If assigneeId is provided, verify the assignee exists and belongs to the same company
    if (body.assigneeId && body.assigneeId.trim() !== '') {
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assigneeId,
          companyId: user.companyId
        }
      })

      if (!assignee) {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        categoryId: body.categoryId || null,
        assigneeId: body.assigneeId || null,
        completedAt: body.completedAt ? new Date(body.completedAt) : body.status === 'COMPLETED' ? new Date() : null,
        updatedAt: new Date()
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
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_updated',
        description: `Updated task: ${updatedTask.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
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

    const { id: taskId } = await params

    // Verify task exists and user has access (through project company)
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: taskId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_deleted',
        description: `Deleted task: ${task.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}