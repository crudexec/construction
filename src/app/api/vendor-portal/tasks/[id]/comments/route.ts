import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify task belongs to vendor
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { vendorId: vendor.id },
          {
            milestone: {
              vendorId: vendor.id
            }
          }
        ]
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    // Fetch comments for the task
    const comments = await prisma.taskComment.findMany({
      where: {
        taskId,
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
        replies: {
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
            }
          },
          orderBy: { createdAt: 'asc' }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Format comments to normalize author info
    const formatComment = (comment: any) => ({
      ...comment,
      author: comment.author || (comment.vendor ? {
        id: `vendor-${comment.vendor.id}`,
        firstName: comment.vendor.name,
        lastName: comment.vendor.companyName ? `(${comment.vendor.companyName})` : '',
        email: comment.vendor.email,
        avatar: null
      } : null),
      authorId: comment.authorId || (comment.vendor ? `vendor-${comment.vendor.id}` : null),
      replies: comment.replies?.map(formatComment) || []
    })

    const formattedComments = comments.map(formatComment)

    return NextResponse.json(formattedComments)

  } catch (error) {
    console.error('Vendor comments fetch error:', error)
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
    const { id: taskId } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify task belongs to vendor
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { vendorId: vendor.id },
          {
            milestone: {
              vendorId: vendor.id
            }
          }
        ]
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    const body = await request.json()
    const { content, parentId } = body

    if (!content || !content.trim()) {
      return NextResponse.json({ error: 'Comment content is required' }, { status: 400 })
    }

    // Create the comment
    const comment = await prisma.taskComment.create({
      data: {
        taskId,
        content: content.trim(),
        vendorId: vendor.id,
        parentId: parentId || null
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true
          }
        }
      }
    })

    // Format response
    const response = {
      ...comment,
      author: {
        id: `vendor-${comment.vendor?.id}`,
        firstName: comment.vendor?.name || 'Vendor',
        lastName: comment.vendor?.companyName ? `(${comment.vendor.companyName})` : '',
        email: comment.vendor?.email,
        avatar: null
      },
      authorId: `vendor-${comment.vendor?.id}`,
      replies: []
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Vendor comment create error:', error)
    return NextResponse.json(
      { error: 'Failed to create comment' },
      { status: 500 }
    )
  }
}
