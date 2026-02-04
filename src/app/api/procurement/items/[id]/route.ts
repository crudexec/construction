'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/procurement/items/[id] - Get a single procurement item
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

    const item = await prisma.procurementItem.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        inventoryEntries: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
              },
            },
            purchases: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                    companyName: true,
                  },
                },
                recordedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { purchaseDate: 'desc' },
              take: 10,
            },
            usageRecords: {
              include: {
                recordedBy: {
                  select: {
                    id: true,
                    firstName: true,
                    lastName: true,
                  },
                },
              },
              orderBy: { usageDate: 'desc' },
              take: 10,
            },
          },
        },
        priceComparisons: {
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
          orderBy: { unitPrice: 'asc' },
        },
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error fetching procurement item:', error)
    return NextResponse.json({ error: 'Failed to fetch item' }, { status: 500 })
  }
}

// PATCH /api/procurement/items/[id] - Update a procurement item
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update procurement items
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update procurement items' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()

    const existingItem = await prisma.procurementItem.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    const {
      name,
      description,
      category,
      unit,
      defaultCost,
      sku,
      photos,
      complianceInfo,
      isActive,
    } = body

    // Check if SKU is unique within company if changed
    if (sku && sku !== existingItem.sku) {
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

    const item = await prisma.procurementItem.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(category !== undefined && { category }),
        ...(unit !== undefined && { unit }),
        ...(defaultCost !== undefined && { defaultCost }),
        ...(sku !== undefined && { sku: sku || null }),
        ...(photos !== undefined && { photos: photos ? JSON.stringify(photos) : null }),
        ...(complianceInfo !== undefined && { complianceInfo }),
        ...(isActive !== undefined && { isActive }),
      },
      include: {
        inventoryEntries: true,
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
        },
      },
    })

    return NextResponse.json(item)
  } catch (error) {
    console.error('Error updating procurement item:', error)
    return NextResponse.json({ error: 'Failed to update item' }, { status: 500 })
  }
}

// DELETE /api/procurement/items/[id] - Soft delete (deactivate) a procurement item
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can delete procurement items
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete procurement items' }, { status: 403 })
    }

    const { id } = await params

    const existingItem = await prisma.procurementItem.findFirst({
      where: {
        id,
        companyId: user.companyId,
      },
      include: {
        inventoryEntries: true,
      },
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // If item has inventory entries, soft delete (deactivate) instead of hard delete
    if (existingItem.inventoryEntries.length > 0) {
      await prisma.procurementItem.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json({ message: 'Item deactivated (has inventory records)' })
    }

    // Hard delete if no inventory entries
    await prisma.procurementItem.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Item deleted successfully' })
  } catch (error) {
    console.error('Error deleting procurement item:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
