import { AssetStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_BASE_STATUSES = new Set(Object.values(AssetStatus))

function parseOptionalBoolean(value: unknown) {
  return typeof value === 'boolean' ? value : undefined
}

function parseOptionalInteger(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = Number(value)
  return Number.isInteger(parsed) ? parsed : undefined
}

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
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const statuses = await prisma.assetStatusDefinition.findMany({
      where: {
        companyId: user.companyId,
        ...(!includeInactive && { isActive: true }),
      },
      include: {
        _count: {
          select: { assets: true },
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    })

    return NextResponse.json(statuses.map((status) => ({
      id: status.id,
      name: status.name,
      baseStatus: status.baseStatus,
      color: status.color,
      isActive: status.isActive,
      sortOrder: status.sortOrder,
      assetCount: status._count.assets,
      createdAt: status.createdAt,
      updatedAt: status.updatedAt,
    })))
  } catch (error) {
    console.error('Error fetching asset statuses:', error)
    return NextResponse.json({ error: 'Failed to fetch asset statuses' }, { status: 500 })
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can create asset statuses' }, { status: 403 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : ''
    const baseStatus = (body.baseStatus as AssetStatus | undefined) || AssetStatus.AVAILABLE
    const color = typeof body.color === 'string' ? body.color.trim() : undefined
    const isActive = parseOptionalBoolean(body.isActive)
    let sortOrder = parseOptionalInteger(body.sortOrder)

    if (!name) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 })
    }

    if (!VALID_BASE_STATUSES.has(baseStatus)) {
      return NextResponse.json({ error: 'Valid base status is required' }, { status: 400 })
    }

    const existing = await prisma.assetStatusDefinition.findUnique({
      where: {
        companyId_name: {
          companyId: user.companyId,
          name,
        },
      },
    })

    if (existing) {
      return NextResponse.json({ error: 'An asset status with this name already exists' }, { status: 409 })
    }

    if (sortOrder === undefined) {
      const maxOrder = await prisma.assetStatusDefinition.findFirst({
        where: { companyId: user.companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true },
      })
      sortOrder = (maxOrder?.sortOrder ?? -1) + 1
    }

    const status = await prisma.assetStatusDefinition.create({
      data: {
        companyId: user.companyId,
        name,
        baseStatus,
        color: color || null,
        isActive: isActive ?? true,
        sortOrder,
      } satisfies Prisma.AssetStatusDefinitionUncheckedCreateInput,
    })

    return NextResponse.json(status, { status: 201 })
  } catch (error) {
    console.error('Error creating asset status:', error)
    return NextResponse.json({ error: 'Failed to create asset status' }, { status: 500 })
  }
}
