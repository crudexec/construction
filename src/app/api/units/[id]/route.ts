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

    const { id } = await params

    const unit = await prisma.unit.findFirst({
      where: {
        id,
        property: {
          companyId: user.companyId
        }
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true
          }
        }
      }
    })

    if (!unit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    return NextResponse.json(unit)

  } catch (error) {
    console.error('Error fetching unit:', error)
    return NextResponse.json(
      { error: 'Failed to fetch unit' },
      { status: 500 }
    )
  }
}

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

    const { id } = await params
    const body = await request.json()

    // Check unit exists and belongs to company
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id,
        property: {
          companyId: user.companyId
        }
      }
    })

    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    const {
      unitNumber,
      type,
      status,
      bedrooms,
      bathrooms,
      sqft,
      floor,
      marketRent,
      currentRent,
      depositAmount,
      features,
      currentLeaseId,
      currentTenantId,
      description,
      photos,
      notes
    } = body

    // If changing unit number, check for duplicates
    if (unitNumber && unitNumber !== existingUnit.unitNumber) {
      const duplicate = await prisma.unit.findFirst({
        where: {
          propertyId: existingUnit.propertyId,
          unitNumber,
          NOT: { id }
        }
      })

      if (duplicate) {
        return NextResponse.json(
          { error: 'A unit with this number already exists' },
          { status: 400 }
        )
      }
    }

    const unit = await prisma.unit.update({
      where: { id },
      data: {
        unitNumber,
        type,
        status,
        bedrooms,
        bathrooms,
        sqft,
        floor,
        marketRent,
        currentRent,
        depositAmount,
        features,
        currentLeaseId,
        currentTenantId,
        description,
        photos,
        notes
      },
      include: {
        property: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    return NextResponse.json(unit)

  } catch (error) {
    console.error('Error updating unit:', error)
    return NextResponse.json(
      { error: 'Failed to update unit' },
      { status: 500 }
    )
  }
}

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

    // Check unit exists and belongs to company
    const existingUnit = await prisma.unit.findFirst({
      where: {
        id,
        property: {
          companyId: user.companyId
        }
      }
    })

    if (!existingUnit) {
      return NextResponse.json(
        { error: 'Unit not found' },
        { status: 404 }
      )
    }

    // Check if unit has active lease
    if (existingUnit.currentLeaseId) {
      return NextResponse.json(
        { error: 'Cannot delete unit with active lease' },
        { status: 400 }
      )
    }

    // Delete unit
    await prisma.unit.delete({
      where: { id }
    })

    // Update property total units count
    await prisma.property.update({
      where: { id: existingUnit.propertyId },
      data: {
        totalUnits: {
          decrement: 1
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting unit:', error)
    return NextResponse.json(
      { error: 'Failed to delete unit' },
      { status: 500 }
    )
  }
}
