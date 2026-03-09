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

    const { id: folderId } = await params
    const body = await request.json()

    // Verify folder exists and user has access through vendor
    const folder = await prisma.vendorFolder.findFirst({
      where: {
        id: folderId
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

    if (!folder || folder.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // If changing parent, verify new parent exists and belongs to same vendor
    if (body.parentId && body.parentId !== folder.parentId) {
      const parentFolder = await prisma.vendorFolder.findFirst({
        where: {
          id: body.parentId,
          vendorId: folder.vendorId
        }
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 400 })
      }

      // Prevent circular references
      if (body.parentId === folderId) {
        return NextResponse.json({ error: 'Folder cannot be its own parent' }, { status: 400 })
      }
    }

    const updatedFolder = await prisma.vendorFolder.update({
      where: { id: folderId },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        parentId: body.parentId,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: {
            documents: true,
            children: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(updatedFolder)
  } catch (error) {
    console.error('Error updating vendor folder:', error)
    return NextResponse.json(
      { error: 'Failed to update folder' },
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

    const { id: folderId } = await params

    // Verify folder exists and user has access through vendor
    const folder = await prisma.vendorFolder.findFirst({
      where: {
        id: folderId
      },
      include: {
        vendor: {
          select: {
            companyId: true,
            id: true,
            name: true
          }
        },
        _count: {
          select: {
            documents: true,
            children: true
          }
        }
      }
    })

    if (!folder || folder.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check if folder has documents or subfolders
    if (folder._count.documents > 0 || folder._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with documents or subfolders. Please move or delete contents first.' },
        { status: 400 }
      )
    }

    await prisma.vendorFolder.delete({
      where: { id: folderId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}
