import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get a single tag with its vendors
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

    const tag = await prisma.vendorServiceTag.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        vendors: {
          include: {
            vendor: {
              select: {
                id: true,
                companyName: true,
                isActive: true
              }
            }
          }
        }
      }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...tag,
      vendors: tag.vendors.map(v => v.vendor)
    })

  } catch (error) {
    console.error('Error fetching vendor tag:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor tag' },
      { status: 500 }
    )
  }
}

// PATCH - Update a tag
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
    const existingTag = await prisma.vendorServiceTag.findFirst({
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
      const duplicate = await prisma.vendorServiceTag.findUnique({
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

    const tag = await prisma.vendorServiceTag.update({
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
    console.error('Error updating vendor tag:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor tag' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a tag
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
    const existingTag = await prisma.vendorServiceTag.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingTag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    await prisma.vendorServiceTag.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting vendor tag:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor tag' },
      { status: 500 }
    )
  }
}
