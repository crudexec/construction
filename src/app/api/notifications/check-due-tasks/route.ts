import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

    const now = new Date()
    const threeDaysFromNow = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000)
    const yesterday = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    
    // Find tasks that need notifications
    const tasksNeedingNotification = await prisma.task.findMany({
      where: {
        AND: [
          { dueDate: { not: null } },
          { status: { not: 'COMPLETED' } },
          { isArchived: false },
          {
            OR: [
              // Due in 3 days
              {
                dueDate: {
                  gte: new Date(threeDaysFromNow.getTime() - 24 * 60 * 60 * 1000),
                  lt: new Date(threeDaysFromNow.getTime() + 24 * 60 * 60 * 1000)
                }
              },
              // Due today
              {
                dueDate: {
                  gte: new Date(now.setHours(0, 0, 0, 0)),
                  lt: new Date(now.setHours(23, 59, 59, 999))
                }
              },
              // Overdue (past due date)
              {
                dueDate: {
                  lt: yesterday
                }
              }
            ]
          },
          // Only tasks from user's company
          {
            card: {
              companyId: user.companyId
            }
          },
          // Only notify assignee or creator
          {
            OR: [
              { assigneeId: user.id },
              { creatorId: user.id }
            ]
          }
        ]
      },
      include: {
        card: {
          select: {
            id: true,
            title: true
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
        }
      }
    })

    const notifications = []

    for (const task of tasksNeedingNotification) {
      const dueDate = new Date(task.dueDate!)
      const diffTime = dueDate.getTime() - now.getTime()
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
      
      let notificationType = ''
      let message = ''
      
      if (diffDays <= -1) {
        notificationType = 'task_overdue'
        const overdueDays = Math.abs(diffDays)
        message = `Task "${task.title}" is ${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`
      } else if (diffDays === 0) {
        notificationType = 'task_due_today'
        message = `Task "${task.title}" is due today`
      } else if (diffDays <= 3) {
        notificationType = 'task_due_soon'
        message = `Task "${task.title}" is due in ${diffDays} day${diffDays > 1 ? 's' : ''}`
      }

      if (notificationType) {
        // Check if we already sent this notification today
        const existingNotification = await prisma.notification.findFirst({
          where: {
            userId: user.id,
            type: notificationType,
            metadata: {
              contains: task.id
            },
            createdAt: {
              gte: new Date(now.setHours(0, 0, 0, 0))
            }
          }
        })

        if (!existingNotification) {
          // Create notification
          const notification = await prisma.notification.create({
            data: {
              type: notificationType,
              title: 'Task Due Date Reminder',
              message,
              userId: user.id,
              metadata: JSON.stringify({
                taskId: task.id,
                projectId: task.card.id,
                projectTitle: task.card.title,
                dueDate: task.dueDate
              })
            }
          })
          
          notifications.push(notification)
        }
      }
    }

    return NextResponse.json({
      message: `Created ${notifications.length} notifications`,
      notifications: notifications.length,
      tasksChecked: tasksNeedingNotification.length
    })

  } catch (error) {
    console.error('Error checking due tasks:', error)
    return NextResponse.json(
      { error: 'Failed to check due tasks' },
      { status: 500 }
    )
  }
}