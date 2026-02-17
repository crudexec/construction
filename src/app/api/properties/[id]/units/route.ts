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

    const { id: propertyId } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Verify property belongs to company
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: user.companyId
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    // Build where clause for units
    const where: any = {
      propertyId
    }

    if (status) {
      where.status = status
    }

    if (type) {
      where.type = type
    }

    const units = await prisma.unit.findMany({
      where,
      orderBy: {
        unitNumber: 'asc'
      }
    })

    return NextResponse.json(units)

  } catch (error) {
    console.error('Error fetching units:', error)
    return NextResponse.json(
      { error: 'Failed to fetch units' },
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

    const { id: propertyId } = await params
    const body = await request.json()

    // Verify property belongs to company
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: user.companyId
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
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
      description,
      photos,
      notes
    } = body

    // Validate required fields
    if (!unitNumber) {
      return NextResponse.json(
        { error: 'Unit number is required' },
        { status: 400 }
      )
    }

    // Check for duplicate unit number
    const existingUnit = await prisma.unit.findFirst({
      where: {
        propertyId,
        unitNumber
      }
    })

    if (existingUnit) {
      return NextResponse.json(
        { error: 'A unit with this number already exists' },
        { status: 400 }
      )
    }

    const unit = await prisma.unit.create({
      data: {
        propertyId,
        unitNumber,
        type: type || 'OTHER',
        status: status || 'VACANT',
        bedrooms,
        bathrooms,
        sqft,
        floor,
        marketRent,
        currentRent,
        depositAmount,
        features: features || [],
        description,
        photos,
        notes
      }
    })

    // Update property total units count
    await prisma.property.update({
      where: { id: propertyId },
      data: {
        totalUnits: {
          increment: 1
        }
      }
    })

    return NextResponse.json(unit, { status: 201 })

  } catch (error) {
    console.error('Error creating unit:', error)
    return NextResponse.json(
      { error: 'Failed to create unit' },
      { status: 500 }
    )
  }
}

// Bulk create units
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

    const { id: propertyId } = await params
    const body = await request.json()
    const { units } = body

    // Verify property belongs to company
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: user.companyId
      }
    })

    if (!property) {
      return NextResponse.json(
        { error: 'Property not found' },
        { status: 404 }
      )
    }

    if (!Array.isArray(units) || units.length === 0) {
      return NextResponse.json(
        { error: 'Units array is required' },
        { status: 400 }
      )
    }

    // Create units in transaction
    const createdUnits = await prisma.$transaction(async (tx) => {
      const created = []

      for (const unit of units) {
        // Check for duplicate
        const existing = await tx.unit.findFirst({
          where: {
            propertyId,
            unitNumber: unit.unitNumber
          }
        })

        if (!existing) {
          const newUnit = await tx.unit.create({
            data: {
              propertyId,
              unitNumber: unit.unitNumber,
              type: unit.type || 'OTHER',
              status: unit.status || 'VACANT',
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms,
              sqft: unit.sqft,
              floor: unit.floor,
              marketRent: unit.marketRent,
              currentRent: unit.currentRent,
              depositAmount: unit.depositAmount,
              features: unit.features || [],
              description: unit.description,
              notes: unit.notes
            }
          })
          created.push(newUnit)
        }
      }

      // Update total units count
      const totalUnits = await tx.unit.count({
        where: { propertyId }
      })

      await tx.property.update({
        where: { id: propertyId },
        data: { totalUnits }
      })

      return created
    })

    return NextResponse.json({
      created: createdUnits.length,
      units: createdUnits
    })

  } catch (error) {
    console.error('Error bulk creating units:', error)
    return NextResponse.json(
      { error: 'Failed to create units' },
      { status: 500 }
    )
  }
}
