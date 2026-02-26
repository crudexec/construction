import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id: contractId, itemId } = await params
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

    // Verify line item exists
    const existingItem = await prisma.contractLineItem.findFirst({
      where: {
        id: itemId,
        contractId
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

    const updatedItem = await prisma.contractLineItem.update({
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

    // Update contract totalSum
    const allLineItems = await prisma.contractLineItem.findMany({
      where: { contractId }
    })
    const newTotalSum = allLineItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await prisma.vendorContract.update({
      where: { id: contractId },
      data: { totalSum: newTotalSum }
    })

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error updating contract line item:', error)
    return NextResponse.json(
      { error: 'Failed to update line item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
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

    const { id: contractId, itemId } = await params

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

    // Verify line item exists
    const existingItem = await prisma.contractLineItem.findFirst({
      where: {
        id: itemId,
        contractId
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'Line item not found' }, { status: 404 })
    }

    await prisma.contractLineItem.delete({
      where: { id: itemId }
    })

    // Update contract totalSum
    const allLineItems = await prisma.contractLineItem.findMany({
      where: { contractId }
    })
    const newTotalSum = allLineItems.reduce((sum, item) => sum + item.totalPrice, 0)

    await prisma.vendorContract.update({
      where: { id: contractId },
      data: { totalSum: newTotalSum }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting contract line item:', error)
    return NextResponse.json(
      { error: 'Failed to delete line item' },
      { status: 500 }
    )
  }
}
