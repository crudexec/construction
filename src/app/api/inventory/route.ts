import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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
    const categoryId = searchParams.get('categoryId')
    const search = searchParams.get('search')

    const whereClause: any = {
      companyId: user.companyId
    }

    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    if (search) {
      whereClause.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } }
      ]
    }

    const materials = await prisma.inventoryMaterial.findMany({
      where: whereClause,
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        _count: {
          select: {
            transactions: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(materials)

  } catch (error) {
    console.error('Error fetching inventory:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory' },
      { status: 500 }
    )
  }
}

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

    const body = await request.json()

    const {
      name,
      sku,
      description,
      categoryId,
      unit,
      quantity,
      unitCost
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Material name is required' }, { status: 400 })
    }

    if (!unit) {
      return NextResponse.json({ error: 'Unit of measure is required' }, { status: 400 })
    }

    // Check for duplicate SKU if provided
    if (sku) {
      const existingSku = await prisma.inventoryMaterial.findFirst({
        where: {
          companyId: user.companyId,
          sku: sku
        }
      })

      if (existingSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 400 })
      }
    }

    const material = await prisma.inventoryMaterial.create({
      data: {
        name,
        sku: sku || null,
        description,
        categoryId: categoryId || null,
        unit,
        quantity: quantity || 0,
        unitCost: unitCost || 0,
        companyId: user.companyId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    // Create initial stock-in transaction if quantity > 0
    if (quantity && quantity > 0) {
      await prisma.inventoryTransaction.create({
        data: {
          materialId: material.id,
          type: 'STOCK_IN',
          quantity: quantity,
          previousQty: 0,
          newQty: quantity,
          reason: 'Initial stock',
          userId: user.id
        }
      })
    }

    return NextResponse.json(material, { status: 201 })

  } catch (error) {
    console.error('Error creating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to create inventory item' },
      { status: 500 }
    )
  }
}
