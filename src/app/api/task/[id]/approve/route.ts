import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// Approve task completion
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

    // Only ADMIN and STAFF can approve task completions
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Only admin or staff can approve task completions' }, { status: 403 })
    }

    const { id: taskId } = await params
    const body = await request.json()
    const { action } = body // 'approve' or 'reject'

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        card: {
          companyId: user.companyId
        }
      },
      include: {
        card: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    if (!task.completionPendingApproval) {
      return NextResponse.json({ error: 'Task does not have pending completion approval' }, { status: 400 })
    }

    if (action === 'approve') {
      // Approve the completion
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'COMPLETED',
          completedAt: new Date(),
          completionPendingApproval: false,
          completionApprovedAt: new Date(),
          completionApprovedById: user.id,
          updatedAt: new Date()
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          completionApprover: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          type: 'task_completion_approved',
          description: `Approved completion of task: ${task.title}`,
          cardId: task.card.id,
          userId: user.id
        }
      })

      return NextResponse.json(updatedTask)

    } else if (action === 'reject') {
      // Reject the completion - task goes back to IN_PROGRESS
      const updatedTask = await prisma.task.update({
        where: { id: taskId },
        data: {
          status: 'IN_PROGRESS',
          completionPendingApproval: false,
          completionRequestedAt: null,
          updatedAt: new Date()
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          assignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          }
        }
      })

      // Create activity log
      await prisma.activity.create({
        data: {
          type: 'task_completion_rejected',
          description: `Rejected completion of task: ${task.title}`,
          cardId: task.card.id,
          userId: user.id
        }
      })

      return NextResponse.json(updatedTask)

    } else {
      return NextResponse.json({ error: 'Invalid action. Use "approve" or "reject"' }, { status: 400 })
    }

  } catch (error) {
    console.error('Error processing task approval:', error)
    return NextResponse.json(
      { error: 'Failed to process task approval' },
      { status: 500 }
    )
  }
}
