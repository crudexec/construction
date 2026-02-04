import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - List items this vendor supplies (via PriceComparison)
export async function GET(
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

    const { id: vendorId } = await params

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Get all items this vendor supplies via PriceComparison
    const catalogItems = await prisma.priceComparison.findMany({
      where: {
        vendorId: vendorId
      },
      include: {
        item: {
          select: {
            id: true,
            name: true,
            description: true,
            category: true,
            unit: true,
            defaultCost: true,
            sku: true,
            photos: true,
            isActive: true
          }
        }
      },
      orderBy: [
        { isPreferred: 'desc' },
        { item: { name: 'asc' } }
      ]
    })

    // Transform to include item details at top level
    const transformedItems = catalogItems.map(entry => ({
      id: entry.id,
      itemId: entry.itemId,
      vendorId: entry.vendorId,
      unitPrice: entry.unitPrice,
      minQuantity: entry.minQuantity,
      validFrom: entry.validFrom,
      validUntil: entry.validUntil,
      notes: entry.notes,
      isPreferred: entry.isPreferred,
      leadTimeDays: entry.leadTimeDays,
      vendorSku: entry.vendorSku,
      lastPurchaseDate: entry.lastPurchaseDate,
      totalPurchasedQty: entry.totalPurchasedQty,
      totalPurchasedValue: entry.totalPurchasedValue,
      createdAt: entry.createdAt,
      updatedAt: entry.updatedAt,
      // Item details
      itemName: entry.item.name,
      itemDescription: entry.item.description,
      itemCategory: entry.item.category,
      itemUnit: entry.item.unit,
      itemDefaultCost: entry.item.defaultCost,
      itemSku: entry.item.sku,
      itemPhotos: entry.item.photos,
      itemIsActive: entry.item.isActive
    }))

    return NextResponse.json(transformedItems)

  } catch (error) {
    console.error('Error fetching vendor catalog:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor catalog' },
      { status: 500 }
    )
  }
}

// POST - Add item to vendor's catalog
export async function POST(
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

    const { id: vendorId } = await params
    const body = await request.json()
    const { itemId, unitPrice, minQuantity, validFrom, validUntil, notes, leadTimeDays, vendorSku, isPreferred } = body

    if (!itemId || unitPrice === undefined) {
      return NextResponse.json({ error: 'itemId and unitPrice are required' }, { status: 400 })
    }

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Verify item exists and belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id: itemId,
        companyId: user.companyId
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Procurement item not found' }, { status: 404 })
    }

    // Check if entry already exists (upsert)
    const existingEntry = await prisma.priceComparison.findUnique({
      where: {
        itemId_vendorId: {
          itemId,
          vendorId
        }
      }
    })

    let catalogEntry
    if (existingEntry) {
      // Update existing entry
      catalogEntry = await prisma.priceComparison.update({
        where: {
          itemId_vendorId: {
            itemId,
            vendorId
          }
        },
        data: {
          unitPrice,
          minQuantity: minQuantity || null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes: notes || null,
          leadTimeDays: leadTimeDays || null,
          vendorSku: vendorSku || null,
          isPreferred: isPreferred || false
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true
            }
          }
        }
      })
    } else {
      // Create new entry
      catalogEntry = await prisma.priceComparison.create({
        data: {
          itemId,
          vendorId,
          unitPrice,
          minQuantity: minQuantity || null,
          validFrom: validFrom ? new Date(validFrom) : null,
          validUntil: validUntil ? new Date(validUntil) : null,
          notes: notes || null,
          leadTimeDays: leadTimeDays || null,
          vendorSku: vendorSku || null,
          isPreferred: isPreferred || false
        },
        include: {
          item: {
            select: {
              id: true,
              name: true,
              category: true,
              unit: true
            }
          }
        }
      })
    }

    // If this is set as preferred, update the item's preferredVendorId
    if (isPreferred) {
      await prisma.procurementItem.update({
        where: { id: itemId },
        data: { preferredVendorId: vendorId }
      })
    }

    return NextResponse.json(catalogEntry)

  } catch (error) {
    console.error('Error adding item to vendor catalog:', error)
    return NextResponse.json(
      { error: 'Failed to add item to vendor catalog' },
      { status: 500 }
    )
  }
}

// DELETE - Remove item from vendor's catalog
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

    const { id: vendorId } = await params
    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')

    if (!itemId) {
      return NextResponse.json({ error: 'itemId query parameter is required' }, { status: 400 })
    }

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Check if the entry exists
    const entry = await prisma.priceComparison.findUnique({
      where: {
        itemId_vendorId: {
          itemId,
          vendorId
        }
      }
    })

    if (!entry) {
      return NextResponse.json({ error: 'Catalog entry not found' }, { status: 404 })
    }

    // Delete the entry
    await prisma.priceComparison.delete({
      where: {
        itemId_vendorId: {
          itemId,
          vendorId
        }
      }
    })

    // If this was the preferred vendor, clear that relationship
    await prisma.procurementItem.updateMany({
      where: {
        id: itemId,
        preferredVendorId: vendorId
      },
      data: {
        preferredVendorId: null
      }
    })

    return NextResponse.json({ message: 'Item removed from vendor catalog' })

  } catch (error) {
    console.error('Error removing item from vendor catalog:', error)
    return NextResponse.json(
      { error: 'Failed to remove item from vendor catalog' },
      { status: 500 }
    )
  }
}
