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

async function getUser(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
  if (!token) return null
  return validateUser(token)
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update asset statuses' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.assetStatusDefinition.findFirst({
      where: { id, companyId: user.companyId },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asset status not found' }, { status: 404 })
    }

    const body = await request.json()
    const name = typeof body.name === 'string' ? body.name.trim() : undefined
    const baseStatus = body.baseStatus as AssetStatus | undefined

    if (name !== undefined && !name) {
      return NextResponse.json({ error: 'Status name is required' }, { status: 400 })
    }

    if (baseStatus && !VALID_BASE_STATUSES.has(baseStatus)) {
      return NextResponse.json({ error: 'Valid base status is required' }, { status: 400 })
    }

    if (name && name !== existing.name) {
      const duplicate = await prisma.assetStatusDefinition.findUnique({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name,
          },
        },
      })

      if (duplicate) {
        return NextResponse.json({ error: 'An asset status with this name already exists' }, { status: 409 })
      }
    }

    const status = await prisma.assetStatusDefinition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(baseStatus && { baseStatus }),
        ...(body.color !== undefined && { color: typeof body.color === 'string' && body.color.trim() ? body.color.trim() : null }),
        ...(parseOptionalBoolean(body.isActive) !== undefined && { isActive: parseOptionalBoolean(body.isActive) }),
        ...(parseOptionalInteger(body.sortOrder) !== undefined && { sortOrder: parseOptionalInteger(body.sortOrder) }),
      } satisfies Prisma.AssetStatusDefinitionUpdateInput,
    })

    return NextResponse.json(status)
  } catch (error) {
    console.error('Error updating asset status:', error)
    return NextResponse.json({ error: 'Failed to update asset status' }, { status: 500 })
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUser(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can delete asset statuses' }, { status: 403 })
    }

    const { id } = await params
    const existing = await prisma.assetStatusDefinition.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        _count: {
          select: { assets: true },
        },
      },
    })

    if (!existing) {
      return NextResponse.json({ error: 'Asset status not found' }, { status: 404 })
    }

    if (existing._count.assets > 0) {
      const status = await prisma.assetStatusDefinition.update({
        where: { id },
        data: { isActive: false },
      })
      return NextResponse.json(status)
    }

    await prisma.assetStatusDefinition.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting asset status:', error)
    return NextResponse.json({ error: 'Failed to delete asset status' }, { status: 500 })
  }
}
