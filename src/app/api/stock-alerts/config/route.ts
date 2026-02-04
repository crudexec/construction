'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/stock-alerts/config - Get stock alert configurations
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const itemId = searchParams.get('itemId')
    const projectId = searchParams.get('projectId')

    const where: Record<string, unknown> = {
      companyId: user.companyId,
    }

    if (itemId) {
      where.itemId = itemId
    }

    if (projectId) {
      where.projectId = projectId
    }

    const configs = await prisma.stockAlertConfig.findMany({
      where,
      orderBy: [
        { itemId: 'asc' },
        { projectId: 'asc' },
      ],
    })

    // Parse recipientIds for each config
    const configsWithRecipients = configs.map(config => ({
      ...config,
      recipientIds: JSON.parse(config.recipientIds || '[]'),
    }))

    // Get user details for recipients
    const allRecipientIds = [...new Set(configsWithRecipients.flatMap(c => c.recipientIds))]
    const users = await prisma.user.findMany({
      where: {
        id: { in: allRecipientIds },
        companyId: user.companyId,
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        email: true,
      },
    })

    const userMap = new Map(users.map(u => [u.id, u]))

    const enrichedConfigs = configsWithRecipients.map(config => ({
      ...config,
      recipients: config.recipientIds.map((id: string) => userMap.get(id)).filter(Boolean),
    }))

    return NextResponse.json(enrichedConfigs)
  } catch (error) {
    console.error('Error fetching stock alert configs:', error)
    return NextResponse.json({ error: 'Failed to fetch configs' }, { status: 500 })
  }
}

// POST /api/stock-alerts/config - Create or update stock alert config
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can configure stock alerts
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can configure stock alerts' }, { status: 403 })
    }

    const body = await request.json()
    const {
      itemId,
      projectId,
      recipientIds,
      threshold,
      isActive = true,
    } = body

    if (!recipientIds || !Array.isArray(recipientIds) || recipientIds.length === 0) {
      return NextResponse.json(
        { error: 'At least one recipient is required' },
        { status: 400 }
      )
    }

    // Verify recipients belong to user's company
    const validRecipients = await prisma.user.count({
      where: {
        id: { in: recipientIds },
        companyId: user.companyId,
      },
    })

    if (validRecipients !== recipientIds.length) {
      return NextResponse.json(
        { error: 'One or more recipients are invalid' },
        { status: 400 }
      )
    }

    // If itemId provided, verify it belongs to user's company
    if (itemId) {
      const item = await prisma.procurementItem.findFirst({
        where: {
          id: itemId,
          companyId: user.companyId,
        },
      })

      if (!item) {
        return NextResponse.json({ error: 'Item not found' }, { status: 404 })
      }
    }

    // If projectId provided, verify it belongs to user's company
    if (projectId) {
      const project = await prisma.card.findFirst({
        where: {
          id: projectId,
          companyId: user.companyId,
        },
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Check if config already exists
    const existingConfig = await prisma.stockAlertConfig.findFirst({
      where: {
        companyId: user.companyId,
        itemId: itemId || null,
        projectId: projectId || null,
      },
    })

    let config
    if (existingConfig) {
      // Update existing config
      config = await prisma.stockAlertConfig.update({
        where: { id: existingConfig.id },
        data: {
          recipientIds: JSON.stringify(recipientIds),
          threshold: threshold || null,
          isActive,
        },
      })
    } else {
      // Create new config
      config = await prisma.stockAlertConfig.create({
        data: {
          companyId: user.companyId,
          itemId: itemId || null,
          projectId: projectId || null,
          recipientIds: JSON.stringify(recipientIds),
          threshold: threshold || null,
          isActive,
        },
      })
    }

    return NextResponse.json({
      ...config,
      recipientIds: JSON.parse(config.recipientIds),
    }, { status: existingConfig ? 200 : 201 })
  } catch (error) {
    console.error('Error creating stock alert config:', error)
    return NextResponse.json({ error: 'Failed to create config' }, { status: 500 })
  }
}
