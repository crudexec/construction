import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { randomBytes } from 'crypto'

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

    // Generate a unique share token
    const shareToken = randomBytes(32).toString('hex')

    // Update task with share token and enable sharing
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        shareToken,
        isShareable: true,
        sharedAt: new Date(),
        sharedBy: user.id,
        updatedAt: new Date()
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_shared',
        description: `Shared task: ${task.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    // Generate the shareable URL
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const shareUrl = `${baseUrl}/shared/task/${shareToken}`

    return NextResponse.json({ 
      shareUrl,
      shareToken,
      sharedAt: updatedTask.sharedAt 
    })
  } catch (error) {
    console.error('Error sharing task:', error)
    return NextResponse.json(
      { error: 'Failed to share task' },
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

    // Verify task exists and user has access
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

    // Disable sharing
    await prisma.task.update({
      where: { id: taskId },
      data: {
        shareToken: null,
        isShareable: false,
        updatedAt: new Date()
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_unshared',
        description: `Disabled sharing for task: ${task.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error disabling task sharing:', error)
    return NextResponse.json(
      { error: 'Failed to disable task sharing' },
      { status: 500 }
    )
  }
}