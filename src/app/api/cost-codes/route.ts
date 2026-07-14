import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - List all cost codes for the company
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

    const costCodes = await prisma.costCode.findMany({
      where: {
        companyId: user.companyId,
        ...(!includeInactive && { isActive: true })
      },
      include: {
        _count: {
          select: {
            boqItems: true
          }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { code: 'asc' }
      ]
    })

    const costCodesWithCount = costCodes.map(costCode => ({
      id: costCode.id,
      code: costCode.code,
      name: costCode.name,
      description: costCode.description,
      csiDivision: costCode.csiDivision,
      isActive: costCode.isActive,
      sortOrder: costCode.sortOrder,
      boqItemCount: costCode._count.boqItems,
      createdAt: costCode.createdAt,
      updatedAt: costCode.updatedAt
    }))

    return NextResponse.json(costCodesWithCount)

  } catch (error) {
    console.error('Error fetching cost codes:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost codes' },
      { status: 500 }
    )
  }
}

// POST - Create a new cost code
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
      return NextResponse.json({ error: 'Only admins can create cost codes' }, { status: 403 })
    }

    const body = await request.json()
    const { code, name, description, csiDivision, sortOrder } = body

    if (!code || code.trim() === '') {
      return NextResponse.json({ error: 'Cost code is required' }, { status: 400 })
    }

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Cost code name is required' }, { status: 400 })
    }

    const existing = await prisma.costCode.findUnique({
      where: {
        companyId_code: {
          companyId: user.companyId,
          code: code.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A cost code with this code already exists' }, { status: 409 })
    }

    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrder = await prisma.costCode.findFirst({
        where: { companyId: user.companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      })
      finalSortOrder = (maxOrder?.sortOrder ?? -1) + 1
    }

    const costCode = await prisma.costCode.create({
      data: {
        code: code.trim(),
        name: name.trim(),
        description: description?.trim() || null,
        csiDivision: csiDivision?.trim() || null,
        sortOrder: finalSortOrder,
        companyId: user.companyId
      }
    })

    return NextResponse.json(costCode, { status: 201 })

  } catch (error) {
    console.error('Error creating cost code:', error)
    return NextResponse.json(
      { error: 'Failed to create cost code' },
      { status: 500 }
    )
  }
}
