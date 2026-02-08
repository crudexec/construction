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

    const { id: commentId } = await params
    const body = await request.json()

    // Verify comment exists and user is the author
    const comment = await prisma.vendorComment.findFirst({
      where: {
        id: commentId,
        authorId: user.id,
        deletedAt: null
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyId: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Verify the vendor belongs to user's company
    if (comment.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!body.content || body.content.trim() === '') {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Parse new mentions from the content
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const newMentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      newMentions.push(match[2])
    }

    // Get existing mentions
    const existingMentions = await prisma.vendorCommentMention.findMany({
      where: { commentId },
      select: { mentionedUserId: true, id: true }
    })

    const existingUserIds = existingMentions.map(m => m.mentionedUserId)

    // Find mentions to add and remove
    const mentionsToAdd = newMentions.filter(userId => !existingUserIds.includes(userId))
    const mentionsToRemove = existingMentions.filter(m => !newMentions.includes(m.mentionedUserId))

    // Update the comment
    const updatedComment = await prisma.vendorComment.update({
      where: { id: commentId },
      data: {
        content: body.content.trim(),
        isEdited: true,
        editedAt: new Date(),
        mentions: {
          // Delete removed mentions
          deleteMany: mentionsToRemove.map(m => ({ id: m.id })),
          // Create new mentions
          create: mentionsToAdd.map(mentionedUserId => ({
            mentionedUserId
          }))
        }
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

    // Create notifications for newly mentioned users
    if (mentionsToAdd.length > 0) {
      await prisma.notification.createMany({
        data: mentionsToAdd.map(mentionedUserId => ({
          type: 'mention_in_vendor_comment',
          title: 'You were mentioned in a comment',
          message: `${user.firstName} ${user.lastName} mentioned you in a comment on vendor "${comment.vendor.name}"`,
          userId: mentionedUserId,
          metadata: JSON.stringify({
            vendorId: comment.vendor.id,
            commentId: comment.id
          })
        }))
      })
    }

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating vendor comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
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

    const { id: commentId } = await params

    // Verify comment exists and user is the author
    const comment = await prisma.vendorComment.findFirst({
      where: {
        id: commentId,
        authorId: user.id,
        deletedAt: null
      },
      include: {
        vendor: {
          select: {
            companyId: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Verify the vendor belongs to user's company
    if (comment.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete the comment
    await prisma.vendorComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date()
      }
    })

    // Also soft delete all replies to this comment
    await prisma.vendorComment.updateMany({
      where: {
        parentId: commentId,
        deletedAt: null
      },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}
