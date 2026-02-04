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

    const { id: taskId } = await params

    // Verify task exists and user has access
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Fetch all comments for the task
    const comments = await prisma.taskComment.findMany({
      where: {
        taskId,
        deletedAt: null, // Don't show deleted comments
        parentId: null // Only top-level comments
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true
          }
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        },
        replies: {
          where: {
            deletedAt: null
          },
          include: {
            author: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                avatar: true
              }
            },
            vendor: {
              select: {
                id: true,
                name: true,
                companyName: true,
                email: true
              }
            },
            mentions: {
              include: {
                mentionedUser: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                    email: true
                  }
                }
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

    // Normalize comments to include author info from either user or vendor
    const normalizedComments = comments.map(comment => ({
      ...comment,
      author: comment.author || (comment.vendor ? {
        id: `vendor-${comment.vendor.id}`,
        firstName: comment.vendor.name,
        lastName: `(Vendor)`,
        email: comment.vendor.email,
        avatar: null
      } : null),
      authorId: comment.authorId || (comment.vendor ? `vendor-${comment.vendor.id}` : null),
      replies: comment.replies?.map(reply => ({
        ...reply,
        author: reply.author || (reply.vendor ? {
          id: `vendor-${reply.vendor.id}`,
          firstName: reply.vendor.name,
          lastName: `(Vendor)`,
          email: reply.vendor.email,
          avatar: null
        } : null),
        authorId: reply.authorId || (reply.vendor ? `vendor-${reply.vendor.id}` : null)
      })) || []
    }))

    return NextResponse.json(normalizedComments)
  } catch (error) {
    console.error('Error fetching task comments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch comments' },
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

    const { id: taskId } = await params
    const body = await request.json()

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

    // Parse mentions from the content (format: @[User Name](userId))
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      mentions.push(match[2]) // Extract userId from the mention
    }

    // Create the comment
    const comment = await prisma.taskComment.create({
      data: {
        content: body.content,
        taskId,
        authorId: user.id,
        parentId: body.parentId || null,
        mentions: mentions.length > 0 ? {
          create: mentions.map(mentionedUserId => ({
            mentionedUserId
          }))
        } : undefined
      },
      include: {
        author: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            avatar: true
          }
        },
        mentions: {
          include: {
            mentionedUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true
              }
            }
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'comment_added',
        description: `Added comment to task: ${task.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      await prisma.notification.createMany({
        data: mentions.map(mentionedUserId => ({
          type: 'mention_in_comment',
          title: 'You were mentioned in a comment',
          message: `${user.firstName} ${user.lastName} mentioned you in a comment on task "${task.title}"`,
          userId: mentionedUserId,
          metadata: JSON.stringify({
            taskId,
            commentId: comment.id,
            projectId: task.card.id
          })
        }))
      })
    }

    return NextResponse.json(comment)
  } catch (error) {
    console.error('Error creating comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}