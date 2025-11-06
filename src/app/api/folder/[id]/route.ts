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

    // Verify folder exists and user has access through project
    const folder = await prisma.folder.findFirst({
      where: { 
        id: folderId
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

    if (!folder || folder.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // If changing parent, verify new parent exists and belongs to same project
    if (body.parentId && body.parentId !== folder.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: body.parentId,
          cardId: folder.cardId
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

    const updatedFolder = await prisma.folder.update({
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

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'folder_updated',
        description: `Updated folder: ${updatedFolder.name}`,
        cardId: folder.card.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedFolder)
  } catch (error) {
    console.error('Error updating folder:', error)
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

    // Verify folder exists and user has access through project
    const folder = await prisma.folder.findFirst({
      where: { 
        id: folderId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
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

    if (!folder || folder.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Folder not found' }, { status: 404 })
    }

    // Check if folder has documents or subfolders
    if (folder._count.documents > 0 || folder._count.children > 0) {
      return NextResponse.json(
        { error: 'Cannot delete folder with documents or subfolders. Please move or delete contents first.' },
        { status: 400 }
      )
    }

    await prisma.folder.delete({
      where: { id: folderId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'folder_deleted',
        description: `Deleted folder: ${folder.name}`,
        cardId: folder.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting folder:', error)
    return NextResponse.json(
      { error: 'Failed to delete folder' },
      { status: 500 }
    )
  }
}