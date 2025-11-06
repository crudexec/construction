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

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get all messages for this project (including internal ones for admins)
    const messages = await prisma.message.findMany({
      where: { 
        cardId: projectId
      },
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        },
        replies: {
          include: {
            sender: {
              select: {
                firstName: true,
                lastName: true,
                role: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Mark client messages as read
    await prisma.message.updateMany({
      where: {
        cardId: projectId,
        isFromClient: true,
        isRead: false
      },
      data: {
        isRead: true,
        readAt: new Date()
      }
    })

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching project messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
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

    const { id: projectId } = await params
    const { content, isInternal, parentId } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        isFromClient: false,
        isInternal: isInternal || false,
        cardId: projectId,
        senderId: user.id,
        parentId: parentId || null
      },
      include: {
        sender: {
          select: {
            firstName: true,
            lastName: true,
            role: true
          }
        }
      }
    })

    // Create activity log (only for non-internal messages)
    if (!isInternal) {
      await prisma.activity.create({
        data: {
          type: 'admin_message',
          description: `${user.firstName} ${user.lastName} sent a message to client: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`,
          cardId: projectId,
          userId: user.id,
          metadata: JSON.stringify({
            messageId: message.id
          })
        }
      })
    }

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending admin message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}