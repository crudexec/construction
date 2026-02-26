import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - List all vendor categories for the company
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const categories = await prisma.vendorCategory.findMany({
      where: {
        companyId: user.companyId,
        ...(!includeInactive && { isActive: true })
      },
      include: {
        _count: {
          select: {
            vendors: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    // Format response with vendor count
    const categoriesWithCount = categories.map(category => ({
      id: category.id,
      name: category.name,
      description: category.description,
      color: category.color,
      csiDivision: category.csiDivision,
      isActive: category.isActive,
      sortOrder: category.sortOrder,
      vendorCount: category._count.vendors,
      createdAt: category.createdAt,
      updatedAt: category.updatedAt
    }))

    return NextResponse.json(categoriesWithCount)

  } catch (error) {
    console.error('Error fetching vendor categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor categories' },
      { status: 500 }
    )
  }
}

// POST - Create a new vendor category
export async function POST(request: NextRequest) {
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

    // Only admins can create categories
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create categories' }, { status: 403 })
    }

    const body = await request.json()
    const { name, description, color, csiDivision, sortOrder } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check for duplicate
    const existing = await prisma.vendorCategory.findUnique({
      where: {
        companyId_name: {
          companyId: user.companyId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A category with this name already exists' }, { status: 409 })
    }

    // Get max sort order if not provided
    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrder = await prisma.vendorCategory.findFirst({
        where: { companyId: user.companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      })
      finalSortOrder = (maxOrder?.sortOrder ?? -1) + 1
    }

    const category = await prisma.vendorCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        color: color || '#6366f1',
        csiDivision: csiDivision?.trim() || null,
        sortOrder: finalSortOrder,
        companyId: user.companyId
      }
    })

    return NextResponse.json(category, { status: 201 })

  } catch (error) {
    console.error('Error creating vendor category:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor category' },
      { status: 500 }
    )
  }
}
