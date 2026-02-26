import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB

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

    const { id: commentId } = await params

    // Verify comment exists and belongs to user's company
    const comment = await prisma.vendorComment.findFirst({
      where: {
        id: commentId,
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
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Get all attachments for this comment
    const attachments = await prisma.vendorCommentAttachment.findMany({
      where: { commentId },
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
    })

    return NextResponse.json(attachments)
  } catch (error) {
    console.error('Error fetching comment attachments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch attachments' },
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

    const { id: commentId } = await params

    // Verify comment exists and belongs to user's company
    const comment = await prisma.vendorComment.findFirst({
      where: {
        id: commentId,
        deletedAt: null
      },
      include: {
        vendor: {
          select: {
            id: true,
            companyId: true
          }
        }
      }
    })

    if (!comment) {
      return NextResponse.json({ error: 'Comment not found' }, { status: 404 })
    }

    if (comment.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds 10MB limit' },
        { status: 400 }
      )
    }

    // Sanitize filename
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const timestamp = Date.now()
    const fileName = `${timestamp}-${sanitizedName}`

    // Create directory structure
    const uploadDir = path.join(
      process.cwd(),
      'public',
      'uploads',
      'vendor-comments',
      comment.vendor.id
    )
    await mkdir(uploadDir, { recursive: true })

    // Write file to disk
    const filePath = path.join(uploadDir, fileName)
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Store metadata in database
    const attachment = await prisma.vendorCommentAttachment.create({
      data: {
        commentId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type,
        url: `/uploads/vendor-comments/${comment.vendor.id}/${fileName}`,
        uploaderId: user.id
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (error) {
    console.error('Error uploading comment attachment:', error)
    return NextResponse.json(
      { error: 'Failed to upload attachment' },
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
    const { searchParams } = new URL(request.url)
    const attachmentId = searchParams.get('attachmentId')

    if (!attachmentId) {
      return NextResponse.json({ error: 'Attachment ID required' }, { status: 400 })
    }

    // Verify attachment exists and user has permission to delete
    const attachment = await prisma.vendorCommentAttachment.findFirst({
      where: {
        id: attachmentId,
        commentId
      },
      include: {
        comment: {
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

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found' }, { status: 404 })
    }

    if (attachment.comment.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only allow deletion by uploader or admin
    if (attachment.uploaderId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized to delete this attachment' }, { status: 403 })
    }

    // Delete from database (file remains on disk for now)
    await prisma.vendorCommentAttachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting comment attachment:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}
