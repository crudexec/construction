import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get single purchase order
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

    const { id } = await params

    const purchaseOrder = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
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
                category: true,
                sku: true
              }
            }
          },
          orderBy: {
            item: {
              name: 'asc'
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!purchaseOrder) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error fetching purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to fetch purchase order' },
      { status: 500 }
    )
  }
}

// PATCH - Update purchase order
export async function PATCH(
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

    const { id } = await params
    const body = await request.json()

    // Check if PO exists and belongs to company
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Only allow editing draft or pending approval orders
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existingPO.status)) {
      return NextResponse.json(
        { error: 'Cannot edit purchase order in current status' },
        { status: 400 }
      )
    }

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

    // Build update data
    const updateData: Record<string, unknown> = {}

    if (vendorId !== undefined) {
      // Verify vendor
      const vendor = await prisma.vendor.findFirst({
        where: { id: vendorId, companyId: user.companyId }
      })
      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
      updateData.vendorId = vendorId
    }

    if (projectId !== undefined) {
      if (projectId) {
        const project = await prisma.card.findFirst({
          where: { id: projectId, companyId: user.companyId }
        })
        if (!project) {
          return NextResponse.json({ error: 'Project not found' }, { status: 404 })
        }
      }
      updateData.projectId = projectId || null
    }

    if (expectedDeliveryDate !== undefined) {
      updateData.expectedDeliveryDate = expectedDeliveryDate ? new Date(expectedDeliveryDate) : null
    }

    if (notes !== undefined) {
      updateData.notes = notes
    }

    if (terms !== undefined) {
      updateData.terms = terms
    }

    // Handle line items update
    if (lineItems && Array.isArray(lineItems)) {
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

      // Calculate new totals
      const subtotal = lineItems.reduce(
        (sum: number, item: { quantity: number; unitPrice: number }) => sum + (item.quantity * item.unitPrice),
        0
      )
      const taxAmount = tax !== undefined ? tax : existingPO.tax
      const shippingAmount = shipping !== undefined ? shipping : existingPO.shipping
      const total = subtotal + taxAmount + shippingAmount

      updateData.subtotal = subtotal
      updateData.tax = taxAmount
      updateData.shipping = shippingAmount
      updateData.total = total

      // Delete existing line items and create new ones
      await prisma.purchaseOrderItem.deleteMany({
        where: { purchaseOrderId: id }
      })

      await prisma.purchaseOrderItem.createMany({
        data: lineItems.map((item: { itemId: string; quantity: number; unitPrice: number; notes?: string }) => ({
          purchaseOrderId: id,
          itemId: item.itemId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
          notes: item.notes || null
        }))
      })
    } else if (tax !== undefined || shipping !== undefined) {
      // Just update tax/shipping without changing line items
      const taxAmount = tax !== undefined ? tax : existingPO.tax
      const shippingAmount = shipping !== undefined ? shipping : existingPO.shipping
      updateData.tax = taxAmount
      updateData.shipping = shippingAmount
      updateData.total = existingPO.subtotal + taxAmount + shippingAmount
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: updateData,
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
    console.error('Error updating purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to update purchase order' },
      { status: 500 }
    )
  }
}

// DELETE - Delete purchase order
export async function DELETE(
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

    const { id } = await params

    // Check if PO exists and belongs to company
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Only allow deleting draft orders
    if (existingPO.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete draft purchase orders' },
        { status: 400 }
      )
    }

    // Delete the purchase order (line items cascade delete)
    await prisma.purchaseOrder.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Purchase order deleted successfully' })

  } catch (error) {
    console.error('Error deleting purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to delete purchase order' },
      { status: 500 }
    )
  }
}
