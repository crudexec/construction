'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/procurement/items/[id]/prices - Get price comparisons for an item
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify item belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const prices = await prisma.priceComparison.findMany({
      where: {
        itemId: id,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            email: true,
            status: true,
          },
        },
      },
      orderBy: { unitPrice: 'asc' },
    })

    return NextResponse.json(prices)
  } catch (error) {
    console.error('Error fetching price comparisons:', error)
    return NextResponse.json({ error: 'Failed to fetch prices' }, { status: 500 })
  }
}

// POST /api/procurement/items/[id]/prices - Add a price comparison
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const {
      vendorId,
      unitPrice,
      minQuantity,
      validFrom,
      validUntil,
      notes,
    } = body

    if (!vendorId || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Vendor ID and unit price are required' },
        { status: 400 }
      )
    }

    // Verify item belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Verify vendor belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId,
      },
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const priceComparison = await prisma.priceComparison.create({
      data: {
        itemId: id,
        vendorId,
        unitPrice,
        minQuantity: minQuantity || null,
        validFrom: validFrom ? new Date(validFrom) : null,
        validUntil: validUntil ? new Date(validUntil) : null,
        notes,
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            phone: true,
            email: true,
          },
        },
      },
    })

    return NextResponse.json(priceComparison, { status: 201 })
  } catch (error) {
    console.error('Error creating price comparison:', error)
    return NextResponse.json({ error: 'Failed to create price' }, { status: 500 })
  }
}
