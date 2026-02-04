import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get procurement statistics for a vendor
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

    // Get catalog item count
    const catalogItemCount = await prisma.priceComparison.count({
      where: { vendorId }
    })

    // Get preferred items count
    const preferredItemsCount = await prisma.procurementItem.count({
      where: {
        preferredVendorId: vendorId,
        companyId: user.companyId
      }
    })

    // Get purchase history from InventoryPurchase
    const purchases = await prisma.inventoryPurchase.findMany({
      where: {
        supplierId: vendorId,
        inventory: {
          project: {
            companyId: user.companyId
          }
        }
      },
      include: {
        inventory: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                category: true
              }
            },
            project: {
              select: {
                id: true,
                title: true
              }
            }
          }
        }
      },
      orderBy: {
        purchaseDate: 'desc'
      }
    })

    // Calculate totals
    const totalPurchaseValue = purchases.reduce((sum, p) => sum + p.totalCost, 0)
    const totalPurchaseCount = purchases.length
    const totalQuantityPurchased = purchases.reduce((sum, p) => sum + p.quantity, 0)

    // Average order value
    const averageOrderValue = totalPurchaseCount > 0 ? totalPurchaseValue / totalPurchaseCount : 0

    // Get unique items purchased
    const uniqueItemIds = new Set(purchases.map(p => p.inventory.itemId))
    const uniqueItemCount = uniqueItemIds.size

    // Get unique projects purchased for
    const uniqueProjectIds = new Set(purchases.map(p => p.inventory.projectId))
    const uniqueProjectCount = uniqueProjectIds.size

    // Monthly trends (last 12 months)
    const twelveMonthsAgo = new Date()
    twelveMonthsAgo.setMonth(twelveMonthsAgo.getMonth() - 12)

    const monthlyPurchases = purchases.filter(p => new Date(p.purchaseDate) >= twelveMonthsAgo)
    const monthlyTrends: { [key: string]: { count: number; value: number } } = {}

    monthlyPurchases.forEach(p => {
      const monthKey = new Date(p.purchaseDate).toISOString().slice(0, 7) // YYYY-MM
      if (!monthlyTrends[monthKey]) {
        monthlyTrends[monthKey] = { count: 0, value: 0 }
      }
      monthlyTrends[monthKey].count++
      monthlyTrends[monthKey].value += p.totalCost
    })

    // Sort monthly trends by date
    const sortedMonthlyTrends = Object.entries(monthlyTrends)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({
        month,
        count: data.count,
        value: data.value
      }))

    // Top purchased items
    const itemPurchases: { [key: string]: { itemId: string; itemName: string; category: string; quantity: number; value: number } } = {}
    purchases.forEach(p => {
      const itemId = p.inventory.itemId
      if (!itemPurchases[itemId]) {
        itemPurchases[itemId] = {
          itemId,
          itemName: p.inventory.item.name,
          category: p.inventory.item.category,
          quantity: 0,
          value: 0
        }
      }
      itemPurchases[itemId].quantity += p.quantity
      itemPurchases[itemId].value += p.totalCost
    })

    const topItems = Object.values(itemPurchases)
      .sort((a, b) => b.value - a.value)
      .slice(0, 10)

    // Recent purchases (last 10)
    const recentPurchases = purchases.slice(0, 10).map(p => ({
      id: p.id,
      itemName: p.inventory.item.name,
      itemCategory: p.inventory.item.category,
      projectName: p.inventory.project.title,
      projectId: p.inventory.projectId,
      quantity: p.quantity,
      unitCost: p.unitCost,
      totalCost: p.totalCost,
      purchaseDate: p.purchaseDate,
      invoiceNumber: p.invoiceNumber
    }))

    // Get purchase orders count if they exist
    const purchaseOrderStats = await prisma.purchaseOrder.aggregate({
      where: {
        vendorId,
        companyId: user.companyId
      },
      _count: true,
      _sum: {
        total: true
      }
    })

    return NextResponse.json({
      summary: {
        catalogItemCount,
        preferredItemsCount,
        totalPurchaseValue,
        totalPurchaseCount,
        totalQuantityPurchased,
        averageOrderValue,
        uniqueItemCount,
        uniqueProjectCount,
        purchaseOrderCount: purchaseOrderStats._count || 0,
        purchaseOrderTotalValue: purchaseOrderStats._sum?.total || 0
      },
      monthlyTrends: sortedMonthlyTrends,
      topItems,
      recentPurchases
    })

  } catch (error) {
    console.error('Error fetching vendor procurement stats:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor procurement stats' },
      { status: 500 }
    )
  }
}
