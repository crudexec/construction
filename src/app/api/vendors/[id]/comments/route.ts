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

    const { id: vendorId } = await params

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Determine if user is admin (can see private comments)
    const isAdmin = user.role === 'ADMIN'

    // Fetch all comments for the vendor (top-level only, with replies nested)
    // Filter private comments for non-admin users
    const comments = await prisma.vendorComment.findMany({
      where: {
        vendorId,
        deletedAt: null,
        parentId: null,
        // Non-admins cannot see private comments
        ...(isAdmin ? {} : { isPrivate: false })
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
        pinnedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
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
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        },
        replies: {
          where: {
            deletedAt: null,
            // Non-admins cannot see private replies either
            ...(isAdmin ? {} : { isPrivate: false })
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
            },
            attachments: {
              include: {
                uploader: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true
                  }
                }
              },
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            createdAt: 'asc'
          }
        }
      },
      // Sort pinned comments first, then by creation date
      orderBy: [
        { isPinned: 'desc' },
        { pinnedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(comments)
  } catch (error) {
    console.error('Error fetching vendor comments:', error)
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

    const { id: vendorId } = await params
    const body = await request.json()

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    if (!body.content || body.content.trim() === '') {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // If parentId is provided, verify the parent comment exists
    if (body.parentId) {
      const parentComment = await prisma.vendorComment.findFirst({
        where: {
          id: body.parentId,
          vendorId,
          deletedAt: null
        }
      })

      if (!parentComment) {
        return NextResponse.json({ error: 'Parent comment not found' }, { status: 404 })
      }
    }

    // Parse mentions from the content (format: @[User Name](userId))
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const mentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      mentions.push(match[2]) // Extract userId from the mention
    }

    // Only admins can create private comments
    const isPrivate = user.role === 'ADMIN' && body.isPrivate === true

    // Create the comment
    const comment = await prisma.vendorComment.create({
      data: {
        content: body.content.trim(),
        vendorId,
        authorId: user.id,
        parentId: body.parentId || null,
        isPrivate,
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
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          }
        }
      }
    })

    // Create notifications for mentioned users
    if (mentions.length > 0) {
      await prisma.notification.createMany({
        data: mentions.map(mentionedUserId => ({
          type: 'mention_in_vendor_comment',
          title: 'You were mentioned in a comment',
          message: `${user.firstName} ${user.lastName} mentioned you in a comment on vendor "${vendor.name}"`,
          userId: mentionedUserId,
          metadata: JSON.stringify({
            vendorId,
            commentId: comment.id
          })
        }))
      })
    }

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor comment:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
