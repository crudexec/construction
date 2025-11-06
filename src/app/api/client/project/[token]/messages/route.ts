import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    // Find the project by client access token
    const projects = await prisma.card.findMany({
      where: {
        customFields: {
          contains: token
        }
      }
    })

    // Find the project that has this specific token
    const project = projects.find(p => {
      const customFields = JSON.parse(p.customFields || '{}')
      return customFields.clientAccessToken === token && customFields.clientAccessEnabled === true
    })

    if (!project) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 })
    }

    // Get messages for this project
    const messages = await prisma.message.findMany({
      where: { 
        cardId: project.id,
        isInternal: false  // Only show non-internal messages
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

    return NextResponse.json({ messages })
  } catch (error) {
    console.error('Error fetching client messages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch messages' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { content, clientName, clientEmail, parentId } = await request.json()

    if (!content?.trim()) {
      return NextResponse.json({ error: 'Message content is required' }, { status: 400 })
    }

    // Find the project by client access token
    const projects = await prisma.card.findMany({
      where: {
        customFields: {
          contains: token
        }
      }
    })

    // Find the project that has this specific token
    const project = projects.find(p => {
      const customFields = JSON.parse(p.customFields || '{}')
      return customFields.clientAccessToken === token && customFields.clientAccessEnabled === true
    })

    if (!project) {
      return NextResponse.json({ error: 'Invalid or expired access link' }, { status: 404 })
    }

    // Create the message
    const message = await prisma.message.create({
      data: {
        content: content.trim(),
        isFromClient: true,
        isInternal: false,
        clientName: clientName || project.contactName || 'Client',
        clientEmail: clientEmail || project.contactEmail,
        cardId: project.id,
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

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'client_message',
        description: `New message from ${clientName || project.contactName || 'client'}: ${content.slice(0, 100)}${content.length > 100 ? '...' : ''}`,
        cardId: project.id,
        userId: project.ownerId!,
        metadata: JSON.stringify({
          messageId: message.id,
          clientName: clientName || project.contactName,
          clientEmail: clientEmail || project.contactEmail
        })
      }
    })

    return NextResponse.json({ message })
  } catch (error) {
    console.error('Error sending client message:', error)
    return NextResponse.json(
      { error: 'Failed to send message' },
      { status: 500 }
    )
  }
}