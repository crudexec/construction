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

    // Create test notifications
    const testNotifications = await Promise.all([
      prisma.notification.create({
        data: {
          type: 'task_due_soon',
          title: 'Task Due Date Reminder',
          message: 'Task "Fix the leak in the basement" is due in 2 days',
          userId: user.id,
          metadata: JSON.stringify({
            taskId: 'test-task-1',
            projectId: 'test-project-1',
            projectTitle: 'Basement Renovation',
            dueDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000)
          })
        }
      }),
      prisma.notification.create({
        data: {
          type: 'task_due_today',
          title: 'Task Due Date Reminder',
          message: 'Task "Install new fixtures" is due today',
          userId: user.id,
          metadata: JSON.stringify({
            taskId: 'test-task-2',
            projectId: 'test-project-2',
            projectTitle: 'Kitchen Remodel',
            dueDate: new Date()
          })
        }
      }),
      prisma.notification.create({
        data: {
          type: 'task_overdue',
          title: 'Task Due Date Reminder',
          message: 'Task "Paint the living room" is 1 day overdue',
          userId: user.id,
          metadata: JSON.stringify({
            taskId: 'test-task-3',
            projectId: 'test-project-3',
            projectTitle: 'Living Room Updates',
            dueDate: new Date(Date.now() - 24 * 60 * 60 * 1000)
          })
        }
      })
    ])

    return NextResponse.json({
      message: 'Test notifications created successfully',
      notifications: testNotifications.length
    })

  } catch (error) {
    console.error('Error creating test notifications:', error)
    return NextResponse.json(
      { error: 'Failed to create test notifications' },
      { status: 500 }
    )
  }
}