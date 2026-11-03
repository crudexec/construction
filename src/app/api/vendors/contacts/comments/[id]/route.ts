import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

 async function PATCHHandler(
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
    const comment = await prisma.vendorContactComment.findFirst({
      where: {
        id: commentId,
        authorId: user.id,
        deletedAt: null
      },
      include: {
        contact: {
          include: {
            vendor: {
              select: {
                id: true,
                companyId: true
              }
            }
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Verify the vendor belongs to user's company
    if (comment.contact.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    if (!body.content || body.content.trim() === '') {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Update the comment
    const updatedComment = await prisma.vendorContactComment.update({
      where: { id: commentId },
      data: {
        content: body.content.trim(),
        isEdited: true,
        editedAt: new Date()
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
        }
      }
    })

    return NextResponse.json(updatedComment)
  } catch (error) {
    console.error('Error updating contact comment:', error)
    return NextResponse.json(
      { error: 'Failed to update comment' },
      { status: 500 }
    )
  }
}

 async function DELETEHandler(
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
    const comment = await prisma.vendorContactComment.findFirst({
      where: {
        id: commentId,
        authorId: user.id,
        deletedAt: null
      },
      include: {
        contact: {
          include: {
            vendor: {
              select: {
                companyId: true
              }
            }
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found or unauthorized' }, { status: 404 })
    }

    // Verify the vendor belongs to user's company
    if (comment.contact.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Soft delete the comment
    await prisma.vendorContactComment.update({
      where: { id: commentId },
      data: {
        deletedAt: new Date()
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contact comment:', error)
    return NextResponse.json(
      { error: 'Failed to delete comment' },
      { status: 500 }
    )
  }
}


export const PATCH = auditedRoute('/api/vendors/contacts/comments/[id]', 'PATCH', PATCHHandler)
export const DELETE = auditedRoute('/api/vendors/contacts/comments/[id]', 'DELETE', DELETEHandler)
