'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// POST /api/inventory/[id]/usage - Record usage of inventory
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
    const { quantity, usageDate, usedFor } = body

    if (!quantity || quantity <= 0) {
      return NextResponse.json(
        { error: 'Valid quantity is required' },
        { status: 400 }
      )
    }

    // Verify inventory entry belongs to user's company via project
    const inventoryEntry = await prisma.inventoryEntry.findFirst({
      where: { id: inventoryId },
      include: {
        project: true,
        item: true,
      },
    })

    if (!inventoryEntry || inventoryEntry.project.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Inventory entry not found' }, { status: 404 })
    }

    // Check if there's enough inventory
    const remainingQty = inventoryEntry.purchasedQty - inventoryEntry.usedQty
    if (quantity > remainingQty) {
      return NextResponse.json(
        { error: `Insufficient stock. Only ${remainingQty} ${inventoryEntry.item.unit}(s) remaining.` },
        { status: 400 }
      )
    }

    // Use transaction to create usage record and update inventory
    const result = await prisma.$transaction(async (tx) => {
      const usage = await tx.inventoryUsage.create({
        data: {
          inventoryId,
          quantity,
          usageDate: usageDate ? new Date(usageDate) : new Date(),
          usedFor,
          recordedById: user.id,
        },
        include: {
          recordedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
      })

      // Update inventory used quantity
      const updatedInventory = await tx.inventoryEntry.update({
        where: { id: inventoryId },
        data: {
          usedQty: {
            increment: quantity,
          },
        },
        include: {
          item: true,
        },
      })

      // Check if low stock alert should be triggered
      const newRemainingQty = updatedInventory.purchasedQty - updatedInventory.usedQty
      const minStockLevel = updatedInventory.minStockLevel

      if (minStockLevel !== null && newRemainingQty <= minStockLevel) {
        // Get stock alert config
        const alertConfig = await tx.stockAlertConfig.findFirst({
          where: {
            companyId: user.companyId,
            OR: [
              { itemId: inventoryEntry.item.id },
              { itemId: null }, // Global config
            ],
            isActive: true,
          },
          orderBy: { itemId: 'desc' }, // Prefer item-specific config
        })

        if (alertConfig) {
          const recipientIds: string[] = JSON.parse(alertConfig.recipientIds || '[]')

          // Create notifications for recipients
          for (const recipientId of recipientIds) {
            await tx.notification.create({
              data: {
                type: 'LOW_STOCK_ALERT',
                title: 'Low Stock Alert',
                message: `${updatedInventory.item.name} is running low in project "${inventoryEntry.project.title}". Only ${newRemainingQty} ${updatedInventory.item.unit}(s) remaining.`,
                userId: recipientId,
                metadata: JSON.stringify({
                  itemId: updatedInventory.item.id,
                  projectId: inventoryEntry.project.id,
                  remainingQty: newRemainingQty,
                  minStockLevel,
                }),
              },
            })
          }
        }
      }

      return usage
    })

    return NextResponse.json(result, { status: 201 })
  } catch (error) {
    console.error('Error recording usage:', error)
    return NextResponse.json({ error: 'Failed to record usage' }, { status: 500 })
  }
}
