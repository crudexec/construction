import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// POST - Record receipt of items from purchase order
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

    const { id } = await params
    const body = await request.json()
    const { receivedItems } = body

    // receivedItems: [{ lineItemId: string, receivedQuantity: number }]

    if (!receivedItems || !Array.isArray(receivedItems) || receivedItems.length === 0) {
      return NextResponse.json({ error: 'receivedItems array is required' }, { status: 400 })
    }

    // Check if PO exists and belongs to company
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        lineItems: true
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Only allow receiving sent or partially received orders
    if (!['SENT', 'PARTIALLY_RECEIVED'].includes(existingPO.status)) {
      return NextResponse.json(
        { error: 'Purchase order must be sent before receiving items' },
        { status: 400 }
      )
    }

    // Verify all line item IDs belong to this PO
    const lineItemIds = existingPO.lineItems.map(li => li.id)
    const invalidItems = receivedItems.filter(
      (item: { lineItemId: string }) => !lineItemIds.includes(item.lineItemId)
    )

    if (invalidItems.length > 0) {
      return NextResponse.json(
        { error: 'One or more line items do not belong to this purchase order' },
        { status: 400 }
      )
    }

    // Update received quantities
    for (const item of receivedItems) {
      const lineItem = existingPO.lineItems.find(li => li.id === item.lineItemId)
      if (lineItem) {
        const newReceivedQty = lineItem.receivedQuantity + item.receivedQuantity

        // Don't allow receiving more than ordered
        if (newReceivedQty > lineItem.quantity) {
          return NextResponse.json(
            { error: `Cannot receive more than ordered quantity for item ${lineItem.id}` },
            { status: 400 }
          )
        }

        await prisma.purchaseOrderItem.update({
          where: { id: item.lineItemId },
          data: { receivedQuantity: newReceivedQty }
        })
      }
    }

    // Refetch to get updated line items
    const updatedPO = await prisma.purchaseOrder.findFirst({
      where: { id },
      include: {
        lineItems: true
      }
    })

    if (!updatedPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Check if all items are fully received
    const allReceived = updatedPO.lineItems.every(
      li => li.receivedQuantity >= li.quantity
    )
    const someReceived = updatedPO.lineItems.some(
      li => li.receivedQuantity > 0
    )

    // Update PO status
    let newStatus = updatedPO.status
    if (allReceived) {
      newStatus = 'RECEIVED'
    } else if (someReceived) {
      newStatus = 'PARTIALLY_RECEIVED'
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: newStatus,
        deliveredDate: allReceived ? new Date() : null
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
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Update PriceComparison stats for received items
    for (const lineItem of purchaseOrder.lineItems) {
      const receivedItem = receivedItems.find(
        (ri: { lineItemId: string }) => ri.lineItemId === lineItem.id
      )
      if (receivedItem && receivedItem.receivedQuantity > 0) {
        // Update price comparison stats
        await prisma.priceComparison.upsert({
          where: {
            itemId_vendorId: {
              itemId: lineItem.itemId,
              vendorId: purchaseOrder.vendorId
            }
          },
          update: {
            lastPurchaseDate: new Date(),
            totalPurchasedQty: {
              increment: receivedItem.receivedQuantity
            },
            totalPurchasedValue: {
              increment: receivedItem.receivedQuantity * lineItem.unitPrice
            }
          },
          create: {
            itemId: lineItem.itemId,
            vendorId: purchaseOrder.vendorId,
            unitPrice: lineItem.unitPrice,
            lastPurchaseDate: new Date(),
            totalPurchasedQty: receivedItem.receivedQuantity,
            totalPurchasedValue: receivedItem.receivedQuantity * lineItem.unitPrice
          }
        })
      }
    }

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error receiving purchase order items:', error)
    return NextResponse.json(
      { error: 'Failed to receive purchase order items' },
      { status: 500 }
    )
  }
}
