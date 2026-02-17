import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type')
    const status = searchParams.get('status')
    const search = searchParams.get('search')

    // Build where clause
    const where: any = {
      companyId: user.companyId
    }

    if (type) {
      where.type = type
    }

    if (status) {
      where.status = status
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { city: { contains: search, mode: 'insensitive' } }
      ]
    }

    const properties = await prisma.property.findMany({
      where,
      include: {
        units: {
          select: {
            id: true,
            unitNumber: true,
            type: true,
            status: true,
            currentRent: true,
            marketRent: true
          }
        },
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        sourceProject: {
          select: {
            id: true,
            title: true
          }
        },
        _count: {
          select: {
            units: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate stats for each property
    const propertiesWithStats = properties.map(property => {
      const occupiedUnits = property.units.filter(u => u.status === 'OCCUPIED').length
      const vacantUnits = property.units.filter(u => u.status === 'VACANT').length
      const totalMonthlyRent = property.units
        .filter(u => u.status === 'OCCUPIED')
        .reduce((sum, u) => sum + (u.currentRent || 0), 0)
      const potentialMonthlyRent = property.units
        .reduce((sum, u) => sum + (u.marketRent || u.currentRent || 0), 0)
      const occupancyRate = property.units.length > 0
        ? (occupiedUnits / property.units.length) * 100
        : 0

      return {
        id: property.id,
        name: property.name,
        type: property.type,
        status: property.status,
        address: property.address,
        city: property.city,
        state: property.state,
        zipCode: property.zipCode,
        country: property.country,
        totalUnits: property._count.units,
        occupiedUnits,
        vacantUnits,
        occupancyRate: Math.round(occupancyRate * 10) / 10,
        totalMonthlyRent,
        potentialMonthlyRent,
        yearBuilt: property.yearBuilt,
        totalSqft: property.totalSqft,
        manager: property.manager,
        sourceProject: property.sourceProject,
        createdAt: property.createdAt,
        updatedAt: property.updatedAt
      }
    })

    return NextResponse.json(propertiesWithStats)

  } catch (error) {
    console.error('Error fetching properties:', error)
    return NextResponse.json(
      { error: 'Failed to fetch properties' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()

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
      notes,
      units = []
    } = body

    // Validate required fields
    if (!name || !type || !address || !city || !state || !zipCode) {
      return NextResponse.json(
        { error: 'Missing required fields: name, type, address, city, state, zipCode' },
        { status: 400 }
      )
    }

    // Create property with units
    const property = await prisma.property.create({
      data: {
        name,
        type,
        status: status || 'ACTIVE',
        address,
        city,
        state,
        zipCode,
        country: country || 'Kenya',
        latitude,
        longitude,
        yearBuilt,
        totalUnits: totalUnits || units.length || 1,
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
        amenities: amenities || [],
        notes,
        companyId: user.companyId,
        units: {
          create: units.map((unit: any) => ({
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
            photos: unit.photos,
            notes: unit.notes
          }))
        }
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

    return NextResponse.json(property, { status: 201 })

  } catch (error) {
    console.error('Error creating property:', error)
    return NextResponse.json(
      { error: 'Failed to create property' },
      { status: 500 }
    )
  }
}
