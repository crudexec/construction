'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/projects/[id]/inventory - Get project inventory
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

    const { id: projectId } = await params

    // Verify project belongs to user's company
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const inventory = await prisma.inventoryEntry.findMany({
      where: {
        projectId,
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
        },
      },
      orderBy: [
        { item: { category: 'asc' } },
        { item: { name: 'asc' } },
      ],
    })

    // Calculate totals
    const totals = {
      totalItems: inventory.length,
      totalPurchaseCost: inventory.reduce((sum, entry) => {
        return sum + entry.purchases.reduce((pSum, p) => pSum + p.totalCost, 0)
      }, 0),
      lowStockItems: inventory.filter(entry => {
        const remaining = entry.purchasedQty - entry.usedQty
        return entry.minStockLevel !== null && remaining <= entry.minStockLevel
      }).length,
    }

    return NextResponse.json({ inventory, totals })
  } catch (error) {
    console.error('Error fetching project inventory:', error)
    return NextResponse.json({ error: 'Failed to fetch inventory' }, { status: 500 })
  }
}

// POST /api/projects/[id]/inventory - Add an item to project inventory
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

    const { id: projectId } = await params
    const body = await request.json()
    const { itemId, minStockLevel } = body

    if (!itemId) {
      return NextResponse.json(
        { error: 'Item ID is required' },
        { status: 400 }
      )
    }

    // Verify project belongs to user's company
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId,
      },
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Verify item belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id: itemId,
        companyId: user.companyId,
      },
    })

    if (!item) {
      return NextResponse.json({ error: 'Item not found' }, { status: 404 })
    }

    // Check if entry already exists
    const existingEntry = await prisma.inventoryEntry.findUnique({
      where: {
        itemId_projectId: {
          itemId,
          projectId,
        },
      },
    })

    if (existingEntry) {
      return NextResponse.json(
        { error: 'This item is already in the project inventory' },
        { status: 400 }
      )
    }

    const inventoryEntry = await prisma.inventoryEntry.create({
      data: {
        itemId,
        projectId,
        minStockLevel: minStockLevel || null,
      },
      include: {
        item: true,
        purchases: true,
        usageRecords: true,
      },
    })

    return NextResponse.json(inventoryEntry, { status: 201 })
  } catch (error) {
    console.error('Error adding inventory entry:', error)
    return NextResponse.json({ error: 'Failed to add inventory entry' }, { status: 500 })
  }
}
