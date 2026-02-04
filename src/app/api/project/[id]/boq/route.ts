import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const { id: projectId } = await params

    // Verify project exists and user has access (internal users only - no clients)
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Fetch all BOQ items with related data
    const boqItems = await prisma.bOQItem.findMany({
      where: {
        projectId
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { category: 'asc' },
        { order: 'asc' },
        { itemNumber: 'asc' }
      ]
    })

    // Calculate variance for each item
    const itemsWithVariance = boqItems.map(item => {
      // Use manual actualCost (or 0 if not provided)
      const actualCost = item.actualCost ?? 0

      const estimatedCost = item.totalCost
      const variance = actualCost - estimatedCost
      const variancePercent = estimatedCost > 0 ? (variance / estimatedCost) * 100 : 0

      return {
        ...item,
        actualCost,
        variance,
        variancePercent
      }
    })

    // Group by category and calculate totals
    const groupedItems = itemsWithVariance.reduce((acc, item) => {
      if (!acc[item.category]) {
        acc[item.category] = {
          category: item.category,
          items: [],
          estimated: 0,
          actual: 0,
          variance: 0
        }
      }
      acc[item.category].items.push(item)
      acc[item.category].estimated += item.totalCost
      acc[item.category].actual += item.actualCost
      acc[item.category].variance += item.variance
      return acc
    }, {} as Record<string, any>)

    // Calculate overall summary
    const summary = {
      totalEstimated: itemsWithVariance.reduce((sum, item) => sum + item.totalCost, 0),
      totalActual: itemsWithVariance.reduce((sum, item) => sum + item.actualCost, 0),
      totalVariance: itemsWithVariance.reduce((sum, item) => sum + item.variance, 0),
      itemCount: boqItems.length,
      byCategory: Object.values(groupedItems).map(cat => ({
        category: cat.category,
        estimated: cat.estimated,
        actual: cat.actual,
        variance: cat.variance,
        variancePercent: cat.estimated > 0 ? (cat.variance / cat.estimated) * 100 : 0,
        itemCount: cat.items.length
      }))
    }

    summary.totalVariance = summary.totalActual - summary.totalEstimated
    const variancePercent = summary.totalEstimated > 0
      ? (summary.totalVariance / summary.totalEstimated) * 100
      : 0

    // Get last revision
    const lastRevision = await prisma.bOQRevision.findFirst({
      where: { projectId },
      include: {
        createdBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: { revisionNumber: 'desc' }
    })

    return NextResponse.json({
      items: itemsWithVariance,
      groupedByCategory: Object.values(groupedItems),
      summary: {
        ...summary,
        variancePercent
      },
      lastRevision: lastRevision ? {
        revisionNumber: lastRevision.revisionNumber,
        createdAt: lastRevision.createdAt,
        description: lastRevision.description,
        totalEstimated: lastRevision.totalEstimated,
        createdBy: lastRevision.createdBy
      } : null
    })
  } catch (error) {
    console.error('Error fetching BOQ items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch BOQ items' },
      { status: 500 }
    )
  }
}

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

    // Admin-only check
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can create BOQ items' },
        { status: 403 }
      )
    }

    const { id: projectId } = await params
    const body = await request.json()

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Validate unique itemNumber
    const existingItem = await prisma.bOQItem.findUnique({
      where: {
        projectId_itemNumber: {
          projectId,
          itemNumber: body.itemNumber
        }
      }
    })

    if (existingItem) {
      return NextResponse.json(
        { error: `Item number ${body.itemNumber} already exists in this project` },
        { status: 400 }
      )
    }

    // Calculate totalCost
    const totalCost = body.quantity * body.unitRate

    const boqItem = await prisma.bOQItem.create({
      data: {
        itemNumber: body.itemNumber,
        name: body.name,
        description: body.description,
        category: body.category,
        subCategory: body.subCategory,
        unit: body.unit,
        quantity: parseFloat(body.quantity),
        unitRate: parseFloat(body.unitRate),
        totalCost,
        actualCost: body.actualCost ? parseFloat(body.actualCost) : null,
        notes: body.notes,
        specifications: body.specifications,
        order: body.order || 0,
        isContingency: body.isContingency || false,
        projectId,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'boq_item_added',
        description: `Added BOQ item: ${boqItem.itemNumber} - ${boqItem.name}`,
        metadata: JSON.stringify({
          boqItemId: boqItem.id,
          itemNumber: boqItem.itemNumber,
          category: boqItem.category,
          totalCost: boqItem.totalCost
        }),
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(boqItem, { status: 201 })
  } catch (error) {
    console.error('Error creating BOQ item:', error)
    return NextResponse.json(
      { error: 'Failed to create BOQ item' },
      { status: 500 }
    )
  }
}
