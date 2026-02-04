'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// PATCH /api/procurement/prices/[id] - Update a price comparison
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()

    // Verify price comparison belongs to user's company via item
    const priceComparison = await prisma.priceComparison.findFirst({
      where: { id },
      include: {
        item: true,
      },
    })

    if (!priceComparison || priceComparison.item.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Price comparison not found' }, { status: 404 })
    }

    const {
      unitPrice,
      minQuantity,
      validFrom,
      validUntil,
      notes,
    } = body

    const updated = await prisma.priceComparison.update({
      where: { id },
      data: {
        ...(unitPrice !== undefined && { unitPrice }),
        ...(minQuantity !== undefined && { minQuantity }),
        ...(validFrom !== undefined && { validFrom: validFrom ? new Date(validFrom) : null }),
        ...(validUntil !== undefined && { validUntil: validUntil ? new Date(validUntil) : null }),
        ...(notes !== undefined && { notes }),
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
          },
        },
      },
    })

    return NextResponse.json(updated)
  } catch (error) {
    console.error('Error updating price comparison:', error)
    return NextResponse.json({ error: 'Failed to update price' }, { status: 500 })
  }
}

// DELETE /api/procurement/prices/[id] - Delete a price comparison
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Verify price comparison belongs to user's company via item
    const priceComparison = await prisma.priceComparison.findFirst({
      where: { id },
      include: {
        item: true,
      },
    })

    if (!priceComparison || priceComparison.item.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Price comparison not found' }, { status: 404 })
    }

    await prisma.priceComparison.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Price comparison deleted' })
  } catch (error) {
    console.error('Error deleting price comparison:', error)
    return NextResponse.json({ error: 'Failed to delete price' }, { status: 500 })
  }
}
