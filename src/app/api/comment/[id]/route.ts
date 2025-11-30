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
    const comment = await prisma.taskComment.findFirst({
      where: { 
        id: commentId,
        authorId: user.id,
        deletedAt: null
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Parse new mentions from the content
    const mentionRegex = /@\[([^\]]+)\]\(([^)]+)\)/g
    const newMentions: string[] = []
    let match
    while ((match = mentionRegex.exec(body.content)) !== null) {
      newMentions.push(match[2])
    }

    // Get existing mentions
    const existingMentions = await prisma.taskCommentMention.findMany({
      where: { commentId },
      select: { mentionedUserId: true, id: true }
    })

    const existingUserIds = existingMentions.map(m => m.mentionedUserId)
    
    // Find mentions to add and remove
    const mentionsToAdd = newMentions.filter(userId => !existingUserIds.includes(userId))
    const mentionsToRemove = existingMentions.filter(m => !newMentions.includes(m.mentionedUserId))

    // Update the comment
    const updatedComment = await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        content: body.content,
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
      const task = await prisma.task.findUnique({
        where: { id: comment.taskId },
        select: { title: true, cardId: true }
      })

      await prisma.notification.createMany({
        data: mentionsToAdd.map(mentionedUserId => ({
          type: 'mention_in_comment',
          title: 'You were mentioned in a comment',
          message: `${user.firstName} ${user.lastName} mentioned you in a comment on task "${task?.title}"`,
          userId: mentionedUserId,
          metadata: JSON.stringify({
            taskId: comment.taskId,
            commentId: comment.id,
            projectId: task?.cardId
          })
        }))
      })
    }

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating comment:', error)
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
    const comment = await prisma.taskComment.findFirst({
      where: { 
        id: commentId,
        authorId: user.id,
        deletedAt: null
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Soft delete the comment
    await prisma.taskComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date()
      }
    })

    // Also soft delete all replies to this comment
    await prisma.taskComment.updateMany({
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
    console.error('Error deleting comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}