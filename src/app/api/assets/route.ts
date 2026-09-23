import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { AssetIdentityValidationError, parseAssetIdentity } from '@/lib/assets/identity'
import { applyAssetContext, AssetContextError } from '@/lib/assets/context'

function getRequestToken(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const bearerToken = authHeader?.startsWith('Bearer ')
    ? authHeader.replace('Bearer ', '').trim()
    : undefined
  const normalizedBearerToken = bearerToken && !['undefined', 'null'].includes(bearerToken.toLowerCase())
    ? bearerToken
    : undefined

  return normalizedBearerToken || request.cookies.get('auth-token')?.value
}

export async function GET(request: NextRequest) {
  try {
    const token = getRequestToken(request)

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
    const category = searchParams.get('category')?.trim()

    const whereClause: any = {
      companyId: user.companyId
    }

    if (type) {
      whereClause.type = type
    }

    if (status) {
      whereClause.status = status
    }
    if (category) {
      whereClause.category = { equals: category, mode: 'insensitive' }
    }

    const assets = await prisma.asset.findMany({
      where: whereClause,
      include: {
        currentProject: { select: { id: true, title: true } },
        currentYard: { select: { id: true, name: true } },
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        attachments: {
          where: { category: 'PHOTO' },
          orderBy: { createdAt: 'asc' },
          take: 1
        },
        statusDefinition: {
          select: {
            id: true,
            name: true,
            baseStatus: true,
            color: true
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

    return NextResponse.json(assets)

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
    const token = getRequestToken(request)

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const identity = parseAssetIdentity(body)

    const {
      name,
      description,
      type,
      serialNumber,
      status,
      statusDefinitionId,
      currentLocation,
      make,
      model,
      year,
      vin,
      licensePlate,
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

    if (status && !['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid asset status' },
        { status: 400 }
      )
    }

    let resolvedStatusDefinition: { id: string; baseStatus: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED' } | null = null
    if (statusDefinitionId) {
      resolvedStatusDefinition = await prisma.assetStatusDefinition.findFirst({
        where: {
          id: statusDefinitionId,
          companyId: user.companyId,
          isActive: true
        },
        select: {
          id: true,
          baseStatus: true
        }
      })

      if (!resolvedStatusDefinition) {
        return NextResponse.json(
          { error: 'Asset status option not found' },
          { status: 404 }
        )
      }
    }

    const asset = await prisma.$transaction(async tx => {
    const created = await tx.asset.create({
      data: {
        ...identity,
        name,
        description,
        type,
        serialNumber,
        currentLocation,
        make,
        model,
        year: year ? parseInt(year) : null,
        vin,
        licensePlate,
        purchaseCost,
        purchaseDate: purchaseDate ? new Date(purchaseDate) : null,
        warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null,
        notes,
        status: resolvedStatusDefinition?.baseStatus || status || 'AVAILABLE',
        statusDefinitionId: resolvedStatusDefinition?.id || null,
        companyId: user.companyId
      },
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        statusDefinition: {
          select: {
            id: true,
            name: true,
            baseStatus: true,
            color: true
          }
        }
      }
    })
    await applyAssetContext(tx, created.id, user, body)
    return tx.asset.findUniqueOrThrow({ where: { id: created.id }, include: { currentAssignee: { select: { id: true, firstName: true, lastName: true } }, statusDefinition: true } })
    })

    return NextResponse.json(asset, { status: 201 })

  } catch (error) {
    if (error instanceof AssetContextError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof AssetIdentityValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This Equipment ID is already in use in your company' }, { status: 409 })
    }
    console.error('Error creating asset:', error)
    return NextResponse.json(
      { error: 'Failed to create asset' },
      { status: 500 }
    )
  }
}
