import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get a single file tag with document counts
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const tag = await prisma.fileTag.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            vendorDocuments: true,
            documents: true,
            bidDocuments: true,
            contractDocuments: true
          }
        }
      }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...tag,
      documentCount: tag._count.vendorDocuments + tag._count.documents + tag._count.bidDocuments + tag._count.contractDocuments
    })

  } catch (error) {
    console.error('Error fetching file tag:', error)
    return NextResponse.json(
      { error: 'Failed to fetch file tag' },
      { status: 500 }
    )
  }
}

// PATCH - Update a file tag
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update tags
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update tags' }, { status: 403 })
    }

    // Verify tag belongs to user's company
    const existingTag = await prisma.fileTag.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, color, category, isActive } = body

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== existingTag.name) {
      const duplicate = await prisma.fileTag.findUnique({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name: name.trim()
          }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A tag with this name already exists' }, { status: 409 })
      }
    }

    const tag = await prisma.fileTag.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(category !== undefined && { category: category?.trim() || null }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(tag)

  } catch (error) {
    console.error('Error updating file tag:', error)
    return NextResponse.json(
      { error: 'Failed to update file tag' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a file tag
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete tags
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete tags' }, { status: 403 })
    }

    // Verify tag belongs to user's company
    const existingTag = await prisma.fileTag.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            vendorDocuments: true,
            documents: true,
            bidDocuments: true,
            contractDocuments: true
          }
        }
      }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if tag has documents assigned
    const totalDocuments = existingTag._count.vendorDocuments +
                          existingTag._count.documents +
                          existingTag._count.bidDocuments +
                          existingTag._count.contractDocuments

    if (totalDocuments > 0) {
      return NextResponse.json(
        { error: `Cannot delete tag with ${totalDocuments} document(s) assigned. Remove tag from documents first.` },
        { status: 400 }
      )
    }

    await prisma.fileTag.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting file tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete file tag' },
      { status: 500 }
    )
  }
}
