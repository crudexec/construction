import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/procurement/items - List all procurement items
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
    const category = searchParams.get('category')
    const search = searchParams.get('search')
    const activeOnly = searchParams.get('activeOnly') !== 'false'

    const where: Record<string, unknown> = {
      companyId: user.companyId,
    }

    if (activeOnly) {
      where.isActive = true
    }

    if (category) {
      where.category = category
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    const items = await prisma.procurementItem.findMany({
      where,
      include: {
        inventoryEntries: {
          select: {
            id: true,
            purchasedQty: true,
            usedQty: true,
            projectId: true,
          },
        },
        priceComparisons: {
          include: {
            vendor: {
              select: {
                id: true,
                name: true,
                companyName: true,
              },
            },
          },
          orderBy: { unitPrice: 'asc' },
        },
      },
      orderBy: [
        { category: 'asc' },
        { name: 'asc' },
      ],
    })

    // Get unique categories for filtering
    const categories = await prisma.procurementItem.groupBy({
      by: ['category'],
      where: {
        companyId: user.companyId,
        isActive: true,
      },
      orderBy: { category: 'asc' },
    })

    return NextResponse.json({
      items,
      categories: categories.map(c => c.category),
    })
  } catch (error) {
    console.error('Error fetching procurement items:', error)
    return NextResponse.json({ error: 'Failed to fetch items' }, { status: 500 })
  }
}

// POST /api/procurement/items - Create a new procurement item
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

    // Only admins can create procurement items
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create procurement items' }, { status: 403 })
    }

    const body = await request.json()
    const {
      name,
      description,
      category,
      unit,
      defaultCost,
      sku,
      photos,
      complianceInfo,
    } = body

    if (!name || !category || !unit) {
      return NextResponse.json(
        { error: 'Name, category, and unit are required' },
        { status: 400 }
      )
    }

    // Check if SKU is unique within company if provided
    if (sku) {
      const existingSku = await prisma.procurementItem.findUnique({
        where: {
          companyId_sku: {
            companyId: user.companyId,
            sku,
          },
        },
      })

      if (existingSku) {
        return NextResponse.json(
          { error: 'An item with this SKU already exists' },
          { status: 400 }
        )
      }
    }

    const item = await prisma.procurementItem.create({
      data: {
        name,
        description,
        category,
        unit,
        defaultCost,
        sku: sku || null,
        photos: photos ? JSON.stringify(photos) : null,
        complianceInfo,
        companyId: user.companyId,
      },
      include: {
        inventoryEntries: true,
        priceComparisons: true,
      },
    })

    return NextResponse.json(item, { status: 201 })
  } catch (error) {
    console.error('Error creating procurement item:', error)
    return NextResponse.json({ error: 'Failed to create item' }, { status: 500 })
  }
}
