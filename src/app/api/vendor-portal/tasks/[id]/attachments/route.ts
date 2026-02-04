import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'

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
      },
      include: {
        card: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    // Check file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      return NextResponse.json({ error: 'File size must be less than 10MB' }, { status: 400 })
    }

    // Create upload directory
    const uploadDir = path.join(process.cwd(), 'public', 'uploads', 'tasks', task.cardId)
    await mkdir(uploadDir, { recursive: true })

    // Generate unique filename
    const timestamp = Date.now()
    const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_')
    const fileName = `${timestamp}-${sanitizedName}`
    const filePath = path.join(uploadDir, fileName)

    // Write file
    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)
    await writeFile(filePath, buffer)

    // Create attachment record
    const attachment = await prisma.taskAttachment.create({
      data: {
        taskId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || 'application/octet-stream',
        url: `/uploads/tasks/${task.cardId}/${fileName}`,
        uploadedByVendorId: vendor.id
      },
      include: {
        uploadedByVendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    })

    // Format response with uploader info
    const response = {
      ...attachment,
      uploader: {
        id: attachment.uploadedByVendor?.id,
        firstName: attachment.uploadedByVendor?.name || 'Vendor',
        lastName: attachment.uploadedByVendor?.companyName ? `(${attachment.uploadedByVendor.companyName})` : ''
      }
    }

    return NextResponse.json(response)

  } catch (error) {
    console.error('Vendor attachment upload error:', error)
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
    const { id: attachmentId } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify attachment was uploaded by this vendor
    const attachment = await prisma.taskAttachment.findFirst({
      where: {
        id: attachmentId,
        uploadedByVendorId: vendor.id
      }
    })

    if (!attachment) {
      return NextResponse.json({ error: 'Attachment not found or you do not have permission to delete it' }, { status: 404 })
    }

    // Delete file from filesystem
    const filePath = path.join(process.cwd(), 'public', attachment.url)
    try {
      const fs = await import('fs/promises')
      await fs.unlink(filePath)
    } catch (e) {
      // File might not exist, continue with deletion
      console.warn('Could not delete file:', e)
    }

    // Delete attachment record
    await prisma.taskAttachment.delete({
      where: { id: attachmentId }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Vendor attachment delete error:', error)
    return NextResponse.json(
      { error: 'Failed to delete attachment' },
      { status: 500 }
    )
  }
}
