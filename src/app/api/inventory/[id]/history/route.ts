'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/inventory/[id]/history - Get transaction history for an inventory entry
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

    const { id: inventoryId } = await params
    const { searchParams } = new URL(request.url)
    const limit = parseInt(searchParams.get('limit') || '50')
    const offset = parseInt(searchParams.get('offset') || '0')

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

    // Fetch purchases and usages
    const [purchases, usages] = await Promise.all([
      prisma.inventoryPurchase.findMany({
        where: { inventoryId },
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
      }),
      prisma.inventoryUsage.findMany({
        where: { inventoryId },
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
      }),
    ])

    // Combine and sort by date
    const transactions = [
      ...purchases.map(p => ({
        id: p.id,
        type: 'PURCHASE' as const,
        quantity: p.quantity,
        unitCost: p.unitCost,
        totalCost: p.totalCost,
        date: p.purchaseDate,
        supplier: p.supplier,
        invoiceNumber: p.invoiceNumber,
        notes: p.notes,
        recordedBy: p.recordedBy,
        createdAt: p.createdAt,
      })),
      ...usages.map(u => ({
        id: u.id,
        type: 'USAGE' as const,
        quantity: -u.quantity, // Negative for usage
        date: u.usageDate,
        usedFor: u.usedFor,
        recordedBy: u.recordedBy,
        createdAt: u.createdAt,
      })),
    ]
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
      .slice(offset, offset + limit)

    // Calculate running balance
    let balance = inventoryEntry.purchasedQty - inventoryEntry.usedQty
    const transactionsWithBalance = transactions.map(t => {
      const txBalance = balance
      balance -= t.quantity // Go backwards in time
      return {
        ...t,
        runningBalance: txBalance,
      }
    })

    // Get summary stats
    const summary = {
      item: inventoryEntry.item,
      totalPurchased: inventoryEntry.purchasedQty,
      totalUsed: inventoryEntry.usedQty,
      remaining: inventoryEntry.purchasedQty - inventoryEntry.usedQty,
      minStockLevel: inventoryEntry.minStockLevel,
      totalPurchaseCost: purchases.reduce((sum, p) => sum + p.totalCost, 0),
      averageUnitCost: purchases.length > 0
        ? purchases.reduce((sum, p) => sum + p.unitCost * p.quantity, 0) /
          purchases.reduce((sum, p) => sum + p.quantity, 0)
        : null,
      purchaseCount: purchases.length,
      usageCount: usages.length,
    }

    return NextResponse.json({
      transactions: transactionsWithBalance,
      summary,
      pagination: {
        total: purchases.length + usages.length,
        limit,
        offset,
      },
    })
  } catch (error) {
    console.error('Error fetching inventory history:', error)
    return NextResponse.json({ error: 'Failed to fetch history' }, { status: 500 })
  }
}
