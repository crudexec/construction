import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// PUT - Set or change preferred vendor for a procurement item
export async function PUT(
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

    const { id: itemId } = await params
    const body = await request.json()
    const { vendorId } = body

    // Verify item exists and belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id: itemId,
        companyId: user.companyId
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Procurement item not found' }, { status: 404 })
    }

    // If vendorId is provided, verify vendor exists and belongs to company
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId: user.companyId
        }
      })

      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }

      // Check if vendor has a price comparison entry for this item
      const priceEntry = await prisma.priceComparison.findUnique({
        where: {
          itemId_vendorId: {
            itemId,
            vendorId
          }
        }
      })

      if (!priceEntry) {
        return NextResponse.json(
          { error: 'Vendor does not have pricing for this item. Add to catalog first.' },
          { status: 400 }
        )
      }
    }

    // Update preferred vendor on item
    const updatedItem = await prisma.procurementItem.update({
      where: { id: itemId },
      data: { preferredVendorId: vendorId || null },
      include: {
        preferredVendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    // Update isPreferred flags in PriceComparison
    // First, unset any existing preferred flag for this item
    await prisma.priceComparison.updateMany({
      where: {
        itemId,
        isPreferred: true
      },
      data: { isPreferred: false }
    })

    // If a vendor is being set as preferred, mark their price entry as preferred
    if (vendorId) {
      await prisma.priceComparison.update({
        where: {
          itemId_vendorId: {
            itemId,
            vendorId
          }
        },
        data: { isPreferred: true }
      })
    }

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error setting preferred vendor:', error)
    return NextResponse.json(
      { error: 'Failed to set preferred vendor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove preferred vendor from procurement item
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

    const { id: itemId } = await params

    // Verify item exists and belongs to user's company
    const item = await prisma.procurementItem.findFirst({
      where: {
        id: itemId,
        companyId: user.companyId
      }
    })

    if (!item) {
      return NextResponse.json({ error: 'Procurement item not found' }, { status: 404 })
    }

    // Unset preferred flags in PriceComparison
    await prisma.priceComparison.updateMany({
      where: {
        itemId,
        isPreferred: true
      },
      data: { isPreferred: false }
    })

    // Remove preferred vendor from item
    const updatedItem = await prisma.procurementItem.update({
      where: { id: itemId },
      data: { preferredVendorId: null }
    })

    return NextResponse.json(updatedItem)

  } catch (error) {
    console.error('Error removing preferred vendor:', error)
    return NextResponse.json(
      { error: 'Failed to remove preferred vendor' },
      { status: 500 }
    )
  }
}
