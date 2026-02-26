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

    const { id: contractId } = await params

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

    const lineItems = await prisma.contractLineItem.findMany({
      where: { contractId },
      orderBy: { order: 'asc' }
    })

    // Calculate totals
    const totalAmount = lineItems.reduce((sum, item) => sum + item.totalPrice, 0)

    return NextResponse.json({
      lineItems,
      totalAmount,
      itemCount: lineItems.length
    })

  } catch (error) {
    console.error('Error fetching contract line items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch line items' },
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

    const { id: contractId } = await params
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

    const { description, quantity, unit, unitPrice, notes, order } = body

    if (!description || quantity === undefined || !unit || unitPrice === undefined) {
      return NextResponse.json(
        { error: 'Description, quantity, unit, and unit price are required' },
        { status: 400 }
      )
    }

    const totalPrice = quantity * unitPrice

    // Get next order if not provided
    let itemOrder = order
    if (itemOrder === undefined) {
      const lastItem = await prisma.contractLineItem.findFirst({
        where: { contractId },
        orderBy: { order: 'desc' }
      })
      itemOrder = (lastItem?.order ?? -1) + 1
    }

    const lineItem = await prisma.contractLineItem.create({
      data: {
        contractId,
        description,
        quantity,
        unit,
        unitPrice,
        totalPrice,
        order: itemOrder,
        notes
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

    return NextResponse.json(lineItem, { status: 201 })

  } catch (error) {
    console.error('Error creating contract line item:', error)
    return NextResponse.json(
      { error: 'Failed to create line item' },
      { status: 500 }
    )
  }
}
