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

    const property = await prisma.property.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        units: {
          orderBy: {
            unitNumber: 'asc'
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            avatar: true
          }
        },
        sourceProject: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Calculate statistics
    const occupiedUnits = property.units.filter(u => u.status === 'OCCUPIED').length
    const vacantUnits = property.units.filter(u => u.status === 'VACANT').length
    const makeReadyUnits = property.units.filter(u => u.status === 'MAKE_READY').length
    const noticeGivenUnits = property.units.filter(u => u.status === 'NOTICE_GIVEN').length

    const totalMonthlyRent = property.units
      .filter(u => u.status === 'OCCUPIED')
      .reduce((sum, u) => sum + (u.currentRent || 0), 0)

    const potentialMonthlyRent = property.units
      .reduce((sum, u) => sum + (u.marketRent || u.currentRent || 0), 0)

    const occupancyRate = property.units.length > 0
      ? (occupiedUnits / property.units.length) * 100
      : 0

    const averageRent = property.units.length > 0
      ? potentialMonthlyRent / property.units.length
      : 0

    const stats = {
      totalUnits: property.units.length,
      occupiedUnits,
      vacantUnits,
      makeReadyUnits,
      noticeGivenUnits,
      occupancyRate: Math.round(occupancyRate * 10) / 10,
      totalMonthlyRent,
      potentialMonthlyRent,
      averageRent: Math.round(averageRent * 100) / 100,
      lostRent: potentialMonthlyRent - totalMonthlyRent
    }

    return NextResponse.json({
      ...property,
      stats
    })

  } catch (error) {
    console.error('Error fetching property:', error)
    return NextResponse.json(
      { error: 'Failed to fetch property' },
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

    // Check property exists and belongs to company
    const existingProperty = await prisma.property.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    const {
      name,
      type,
      status,
      address,
      city,
      state,
      zipCode,
      country,
      latitude,
      longitude,
      yearBuilt,
      totalUnits,
      totalSqft,
      lotSize,
      stories,
      parkingSpaces,
      purchasePrice,
      purchaseDate,
      currentValue,
      managerId,
      description,
      photos,
      amenities,
      notes
    } = body

    const property = await prisma.property.update({
      where: { id },
      data: {
        name,
        type,
        status,
        address,
        city,
        state,
        zipCode,
        country,
        latitude,
        longitude,
        yearBuilt,
        totalUnits,
        totalSqft,
        lotSize,
        stories,
        parkingSpaces,
        purchasePrice,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        currentValue,
        managerId,
        description,
        photos,
        amenities,
        notes
      },
      include: {
        units: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    return NextResponse.json(property)

  } catch (error) {
    console.error('Error updating property:', error)
    return NextResponse.json(
      { error: 'Failed to update property' },
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

    // Only admins can delete properties
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete properties' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Check property exists and belongs to company
    const existingProperty = await prisma.property.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            units: true
          }
        }
      }
    })

    if (!existingProperty) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Delete property (cascade will delete units)
    await prisma.property.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting property:', error)
    return NextResponse.json(
      { error: 'Failed to delete property' },
      { status: 500 }
    )
  }
}
