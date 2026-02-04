'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

// GET /api/cron/check-stock-levels - Check for low stock and send alerts
// This should be called by a cron job (e.g., Vercel cron)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Find all inventory entries that are below their minimum stock level
    const lowStockItems = await prisma.inventoryEntry.findMany({
      where: {
        minStockLevel: { not: null },
      },
      include: {
        item: true,
        project: {
          include: {
            company: true,
          },
        },
      },
    })

    // Filter to only those actually below threshold
    const alertItems = lowStockItems.filter(entry => {
      const remaining = entry.purchasedQty - entry.usedQty
      return entry.minStockLevel !== null && remaining <= entry.minStockLevel
    })

    const notificationsCreated: string[] = []

    // Group by company and process
    const byCompany = new Map<string, typeof alertItems>()
    for (const item of alertItems) {
      const companyId = item.project.companyId
      if (!byCompany.has(companyId)) {
        byCompany.set(companyId, [])
      }
      byCompany.get(companyId)!.push(item)
    }

    // Process each company's low stock items
    for (const [companyId, items] of byCompany) {
      // Get alert configs for this company
      const configs = await prisma.stockAlertConfig.findMany({
        where: {
          companyId,
          isActive: true,
        },
      })

      for (const inventoryEntry of items) {
        // Find applicable config (item-specific > project-specific > global)
        let config = configs.find(c => c.itemId === inventoryEntry.item.id)
        if (!config) {
          config = configs.find(c => c.projectId === inventoryEntry.projectId && !c.itemId)
        }
        if (!config) {
          config = configs.find(c => !c.itemId && !c.projectId) // Global config
        }

        if (!config) continue

        // Check if we've already sent an alert for this item today
        const today = new Date()
        today.setHours(0, 0, 0, 0)

        const existingAlert = await prisma.notification.findFirst({
          where: {
            type: 'LOW_STOCK_ALERT',
            createdAt: { gte: today },
            metadata: {
              contains: inventoryEntry.id,
            },
          },
        })

        if (existingAlert) continue // Skip if already alerted today

        const recipientIds: string[] = JSON.parse(config.recipientIds || '[]')
        const remaining = inventoryEntry.purchasedQty - inventoryEntry.usedQty

        // Create notifications for each recipient
        for (const recipientId of recipientIds) {
          await prisma.notification.create({
            data: {
              type: 'LOW_STOCK_ALERT',
              title: 'Low Stock Alert',
              message: `${inventoryEntry.item.name} is running low in project "${inventoryEntry.project.title}". Only ${remaining.toFixed(2)} ${inventoryEntry.item.unit}(s) remaining (min: ${inventoryEntry.minStockLevel}).`,
              userId: recipientId,
              metadata: JSON.stringify({
                inventoryId: inventoryEntry.id,
                itemId: inventoryEntry.item.id,
                itemName: inventoryEntry.item.name,
                projectId: inventoryEntry.projectId,
                projectName: inventoryEntry.project.title,
                remainingQty: remaining,
                minStockLevel: inventoryEntry.minStockLevel,
              }),
            },
          })

          notificationsCreated.push(`${inventoryEntry.item.name} (${inventoryEntry.project.title}) -> ${recipientId}`)
        }
      }
    }

    return NextResponse.json({
      success: true,
      lowStockCount: alertItems.length,
      notificationsCreated: notificationsCreated.length,
      details: notificationsCreated,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error checking stock levels:', error)
    return NextResponse.json({ error: 'Failed to check stock levels' }, { status: 500 })
  }
}
