import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { unlink } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

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

    const { id: documentId } = await params
    const body = await request.json()

    // Verify document exists and user has access (through vendor company)
    const document = await prisma.vendorDocument.findFirst({
      where: {
        id: documentId
      },
      include: {
        vendor: {
          select: {
            companyId: true,
            id: true,
            name: true
          }
        }
      }
    })

    if (!document || document.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // If moving to a different folder, verify the folder belongs to the same vendor
    if (body.folderId !== undefined && body.folderId !== document.folderId) {
      if (body.folderId !== null) {
        const folder = await prisma.vendorFolder.findFirst({
          where: {
            id: body.folderId,
            vendorId: document.vendorId
          }
        })
        if (!folder) {
          return NextResponse.json({ error: 'Folder not found' }, { status: 400 })
        }
      }
    }

    // Handle tag assignment if tagIds is provided
    if (body.tagIds !== undefined && Array.isArray(body.tagIds)) {
      // Delete existing tag assignments
      await prisma.vendorDocumentTagAssignment.deleteMany({
        where: { documentId }
      })

      // Create new tag assignments
      if (body.tagIds.length > 0) {
        await prisma.vendorDocumentTagAssignment.createMany({
          data: body.tagIds.map((tagId: string) => ({
            documentId,
            tagId
          }))
        })
      }
    }

    const updatedDocument = await prisma.vendorDocument.update({
      where: { id: documentId },
      data: {
        name: body.name,
        isShared: body.isShared,
        folderId: body.folderId !== undefined ? body.folderId : document.folderId,
        updatedAt: new Date()
      },
      include: {
        uploader: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        tags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true
              }
            }
          }
        }
      }
    })

    // Format tags for response
    const formattedDocument = {
      ...updatedDocument,
      tags: updatedDocument.tags.map(t => t.tag)
    }

    return NextResponse.json(formattedDocument)
  } catch (error) {
    console.error('Error updating vendor document:', error)
    return NextResponse.json(
      { error: 'Failed to update document' },
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

    const { id: documentId } = await params

    // Verify document exists and user has access (through vendor company)
    const document = await prisma.vendorDocument.findFirst({
      where: {
        id: documentId
      },
      include: {
        vendor: {
          select: {
            companyId: true,
            id: true,
            name: true
          }
        }
      }
    })

    if (!document || document.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 })
    }

    // Delete file from filesystem
    try {
      const filePath = join(process.cwd(), 'public', document.url)
      if (existsSync(filePath)) {
        await unlink(filePath)
      }
    } catch (error) {
      console.error('Error deleting file from filesystem:', error)
      // Continue with database deletion even if file deletion fails
    }

    await prisma.vendorDocument.delete({
      where: { id: documentId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor document:', error)
    return NextResponse.json(
      { error: 'Failed to delete document' },
      { status: 500 }
    )
  }
}
