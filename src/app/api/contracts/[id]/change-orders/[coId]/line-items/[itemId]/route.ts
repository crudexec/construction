import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string; itemId: string }> }
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

    const { id: contractId, coId, itemId } = await params
    const body = await request.json()

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Verify change order exists and is in DRAFT status
    const changeOrder = await prisma.changeOrder.findFirst({
      where: {
        id: coId,
        contractId
      }
    })

    if (!changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    if (changeOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only modify line items in draft change orders' },
        { status: 400 }
      )
    }

    // Verify line item exists
    const existingItem = await prisma.changeOrderLineItem.findFirst({
      where: {
        id: itemId,
        changeOrderId: coId
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    const { description, quantity, unit, unitPrice, notes, order } = body

    // Calculate new total if quantity or unitPrice changed
    const newQuantity = quantity !== undefined ? quantity : existingItem.quantity
    const newUnitPrice = unitPrice !== undefined ? unitPrice : existingItem.unitPrice
    const totalPrice = newQuantity * newUnitPrice

    const updatedItem = await prisma.changeOrderLineItem.update({
      where: { id: itemId },
      data: {
        ...(description !== undefined && { description }),
        ...(quantity !== undefined && { quantity }),
        ...(unit !== undefined && { unit }),
        ...(unitPrice !== undefined && { unitPrice }),
        totalPrice,
        ...(notes !== undefined && { notes }),
        ...(order !== undefined && { order }),
        updatedAt: new Date()
      }
    })

    // Update change order total amount
    const allLineItems = await prisma.changeOrderLineItem.findMany({
      where: { changeOrderId: coId }
    })
    const newTotalAmount = allLineItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await prisma.changeOrder.update({
      where: { id: coId },
      data: { totalAmount: newTotalAmount }
    })

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error updating change order line item:', error)
    return NextResponse.json(
      { error: 'Failed to update line item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string; itemId: string }> }
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

    const { id: contractId, coId, itemId } = await params

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Verify change order exists and is in DRAFT status
    const changeOrder = await prisma.changeOrder.findFirst({
      where: {
        id: coId,
        contractId
      }
    })

    if (!changeOrder) {
      return NextResponse.json({ error: 'Change order not found' }, { status: 404 })
    }

    if (changeOrder.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Can only delete line items from draft change orders' },
        { status: 400 }
      )
    }

    // Verify line item exists
    const existingItem = await prisma.changeOrderLineItem.findFirst({
      where: {
        id: itemId,
        changeOrderId: coId
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    await prisma.changeOrderLineItem.delete({
      where: { id: itemId }
    })

    // Update change order total amount
    const allLineItems = await prisma.changeOrderLineItem.findMany({
      where: { changeOrderId: coId }
    })
    const newTotalAmount = allLineItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await prisma.changeOrder.update({
      where: { id: coId },
      data: { totalAmount: newTotalAmount }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting change order line item:', error)
    return NextResponse.json(
      { error: 'Failed to delete line item' },
      { status: 500 }
    )
  }
}
