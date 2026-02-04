'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// POST /api/inventory/[id]/purchase - Record a purchase
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

    const { id: inventoryId } = await params
    const body = await request.json()
    const {
      quantity,
      unitCost,
      supplierId,
      invoiceNumber,
      purchaseDate,
      notes,
    } = body

    if (!quantity || quantity <= 0 || !unitCost || unitCost <= 0) {
      return NextResponse.json(
        { error: 'Valid quantity and unit cost are required' },
        { status: 400 }
      )
    }

    // Verify inventory entry belongs to user's company via project
    const inventoryEntry = await prisma.inventoryEntry.findFirst({
      where: { id: inventoryId },
      include: {
        project: true,
      },
    })

    if (!inventoryEntry || inventoryEntry.project.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    }

    // If supplier specified, verify it belongs to user's company
    if (supplierId) {
      const supplier = await prisma.vendor.findFirst({
        where: {
          id: supplierId,
          companyId: user.companyId,
        },
      })

      if (!supplier) {
        return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
      }
    }

    const totalCost = quantity * unitCost

    // Use transaction to create purchase and update inventory
    const result = await prisma.$transaction(async (tx) => {
      const purchase = await tx.inventoryPurchase.create({
        data: {
          inventoryId,
          quantity,
          unitCost,
          totalCost,
          supplierId: supplierId || null,
          invoiceNumber: invoiceNumber || null,
          purchaseDate: purchaseDate ? new Date(purchaseDate) : new Date(),
          notes,
          recordedById: user.id,
        },
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
      })

      // Update inventory purchased quantity
      await tx.inventoryEntry.update({
        where: { id: inventoryId },
        data: {
          purchasedQty: {
            increment: quantity,
          },
        },
      })

      return purchase
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error recording purchase:', error)
    return NextResponse.json({ error: 'Failed to record purchase' }, { status: 500 })
  }
}
