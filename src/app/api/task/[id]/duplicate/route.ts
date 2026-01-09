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

    const { id: taskId } = await params

    // Fetch the original task with all its relationships
    const originalTask = await prisma.task.findFirst({
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
        },
        category: true,
        assignee: true,
        dependsOn: {
          select: {
            id: true
          }
        }
      }
    })

    if (!originalTask || originalTask.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Create a copy of the task
    const duplicatedTask = await prisma.task.create({
      data: {
        title: `${originalTask.title} (Copy)`,
        description: originalTask.description,
        status: 'TODO', // Always start new tasks as TODO
        priority: originalTask.priority,
        dueDate: originalTask.dueDate,
        cardId: originalTask.cardId,
        categoryId: originalTask.categoryId,
        assigneeId: originalTask.assigneeId,
        creatorId: user.id,
        isRecurring: originalTask.isRecurring,
        recurringPattern: originalTask.recurringPattern,
        // Note: Dependencies are not duplicated to avoid complex circular dependencies
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
        type: 'task_duplicated',
        description: `Duplicated task: ${originalTask.title}`,
        cardId: originalTask.card.id,
        userId: user.id,
        metadata: JSON.stringify({
          originalTaskId: originalTask.id,
          newTaskId: duplicatedTask.id
        })
      }
    })

    return NextResponse.json({
      message: 'Task duplicated successfully',
      task: duplicatedTask
    })
  } catch (error) {
    console.error('Error duplicating task:', error)
    return NextResponse.json(
      { error: 'Failed to duplicate task' },
      { status: 500 }
    )
  }
}