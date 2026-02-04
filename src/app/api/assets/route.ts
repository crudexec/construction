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

    const whereClause: any = {
      companyId: user.companyId
    }

    if (type) {
      whereClause.type = type
    }

    if (status) {
      whereClause.status = status
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            requests: true,
            maintenanceRecords: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Parse photos from JSON string to array for each asset
    const assetsWithParsedPhotos = assets.map(asset => ({
      ...asset,
      photos: asset.photos ? JSON.parse(asset.photos) : []
    }))

    return NextResponse.json(assetsWithParsedPhotos)

  } catch (error) {
    console.error('Error fetching assets:', error)
    return NextResponse.json(
      { error: 'Failed to fetch assets' },
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
      description,
      type,
      serialNumber,
      currentLocation,
      purchaseCost,
      purchaseDate,
      warrantyExpiry,
      notes
    } = body

    if (!name) {
      return NextResponse.json({ error: 'Asset name is required' }, { status: 400 })
    }

    if (!type || !['VEHICLE', 'EQUIPMENT', 'TOOL'].includes(type)) {
      return NextResponse.json(
        { error: 'Valid asset type is required (VEHICLE, EQUIPMENT, or TOOL)' },
        { status: 400 }
      )
    }

    const asset = await prisma.asset.create({
      data: {
        name,
        description,
        type,
        serialNumber,
        currentLocation,
        purchaseCost,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        photos: JSON.stringify([]),
        notes,
        status: 'AVAILABLE',
        companyId: user.companyId
      },
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Parse photos for response
    const assetWithParsedPhotos = {
      ...asset,
      photos: []
    }

    return NextResponse.json(assetWithParsedPhotos, { status: 201 })

  } catch (error) {
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}
