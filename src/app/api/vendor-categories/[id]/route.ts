import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get a single vendor category
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

    const category = await prisma.vendorCategory.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            vendors: true
          }
        }
      }
    })

    if (!category) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...category,
      vendorCount: category._count.vendors
    })

  } catch (error) {
    console.error('Error fetching vendor category:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor category' },
      { status: 500 }
    )
  }
}

// PUT - Update a vendor category
export async function PUT(
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

    // Only admins can update categories
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update categories' }, { status: 403 })
    }

    // Verify category exists and belongs to user's company
    const existingCategory = await prisma.vendorCategory.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, description, color, csiDivision, sortOrder, isActive } = body

    // If name is being changed, check for duplicates
    if (name && name.trim() !== existingCategory.name) {
      const duplicate = await prisma.vendorCategory.findUnique({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name: name.trim()
          }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
      }
    }

    const category = await prisma.vendorCategory.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(color !== undefined && { color }),
        ...(csiDivision !== undefined && { csiDivision: csiDivision?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(category)

  } catch (error) {
    console.error('Error updating vendor category:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor category' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a vendor category
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

    // Only admins can delete categories
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete categories' }, { status: 403 })
    }

    // Verify category exists and belongs to user's company
    const existingCategory = await prisma.vendorCategory.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            vendors: true
          }
        }
      }
    })

    if (!existingCategory) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has vendors assigned
    if (existingCategory._count.vendors > 0) {
      return NextResponse.json({
        error: `Cannot delete category with ${existingCategory._count.vendors} vendor(s) assigned. Remove or reassign vendors first, or deactivate the category instead.`
      }, { status: 400 })
    }

    await prisma.vendorCategory.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Category deleted successfully' })

  } catch (error) {
    console.error('Error deleting vendor category:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor category' },
      { status: 500 }
    )
  }
}
