import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// Generate unique order number
async function generateOrderNumber(companyId: string): Promise<string> {
  const today = new Date()
  const year = today.getFullYear().toString().slice(-2)
  const month = (today.getMonth() + 1).toString().padStart(2, '0')

  // Get count of POs this month for this company
  const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1)
  const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0)

  const count = await prisma.purchaseOrder.count({
    where: {
      companyId,
      createdAt: {
        gte: startOfMonth,
        lte: endOfMonth
      }
    }
  })

  const sequence = (count + 1).toString().padStart(4, '0')
  return `PO-${year}${month}-${sequence}`
}

// GET - List purchase orders
export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const vendorId = searchParams.get('vendorId')
    const projectId = searchParams.get('projectId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: Record<string, unknown> = {
      companyId: user.companyId
    }

    if (status) {
      where.status = status
    }
    if (vendorId) {
      where.vendorId = vendorId
    }
    if (projectId) {
      where.projectId = projectId
    }

    const [purchaseOrders, total] = await Promise.all([
      prisma.purchaseOrder.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              companyName: true,
              email: true
            }
          },
          project: {
            select: {
              id: true,
              title: true
            }
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          approvedBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          _count: {
            select: {
              lineItems: true
            }
          }
        },
        orderBy: {
          createdAt: 'desc'
        },
        skip,
        take: limit
      }),
      prisma.purchaseOrder.count({ where })
    ])

    return NextResponse.json({
      data: purchaseOrders,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Error fetching purchase orders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase orders' },
      { status: 500 }
    )
  }
}

// POST - Create purchase order
export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      vendorId,
      projectId,
      expectedDeliveryDate,
      notes,
      terms,
      tax,
      shipping,
      lineItems
    } = body

    if (!vendorId) {
      return NextResponse.json({ error: 'vendorId is required' }, { status: 400 })
    }

    if (!lineItems || !Array.isArray(lineItems) || lineItems.length === 0) {
      return NextResponse.json({ error: 'At least one line item is required' }, { status: 400 })
    }

    // Verify vendor exists and belongs to company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Verify project if provided
    if (projectId) {
      const project = await prisma.card.findFirst({
        where: {
          id: projectId,
          companyId: user.companyId
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Verify all items exist
    const itemIds = lineItems.map((item: { itemId: string }) => item.itemId)
    const items = await prisma.procurementItem.findMany({
      where: {
        id: { in: itemIds },
        companyId: user.companyId
      }
    })

    if (items.length !== itemIds.length) {
      return NextResponse.json({ error: 'One or more items not found' }, { status: 400 })
    }

    // Calculate totals
    const subtotal = lineItems.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) => sum + (item.quantity * item.unitPrice),
      0
    )
    const taxAmount = tax || 0
    const shippingAmount = shipping || 0
    const total = subtotal + taxAmount + shippingAmount

    // Generate order number
    const orderNumber = await generateOrderNumber(user.companyId)

    // Create purchase order with line items
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        vendorId,
        projectId: projectId || null,
        status: 'DRAFT',
        subtotal,
        tax: taxAmount,
        shipping: shippingAmount,
        total,
        expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
        notes: notes || null,
        terms: terms || null,
        companyId: user.companyId,
        createdById: user.id,
        lineItems: {
          create: lineItems.map((item: { itemId: string; quantity: number; unitPrice: number; notes?: string }) => ({
            itemId: item.itemId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
            notes: item.notes || null
          }))
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        },
        lineItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error creating purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to create purchase order' },
      { status: 500 }
    )
  }
}
