import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT']

// GET - List all asset custom field definitions for the company
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

    const definitions = await prisma.assetCustomFieldDefinition.findMany({
      where: {
        companyId: user.companyId,
        ...(!includeInactive && { isActive: true })
      },
      include: {
        _count: {
          select: { values: true }
        }
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' }
      ]
    })

    const definitionsWithCount = definitions.map(def => ({
      id: def.id,
      name: def.name,
      fieldType: def.fieldType,
      selectOptions: def.selectOptions,
      isActive: def.isActive,
      sortOrder: def.sortOrder,
      valueCount: def._count.values,
      createdAt: def.createdAt,
      updatedAt: def.updatedAt
    }))

    return NextResponse.json(definitionsWithCount)

  } catch (error) {
    console.error('Error fetching asset custom fields:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset custom fields' },
      { status: 500 }
    )
  }
}

// POST - Create a new asset custom field definition
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
      return NextResponse.json({ error: 'Only admins can create custom fields' }, { status: 403 })
    }

    const body = await request.json()
    const { name, fieldType, selectOptions, sortOrder } = body

    if (!name || name.trim() === '') {
      return NextResponse.json({ error: 'Field name is required' }, { status: 400 })
    }

    if (!fieldType || !VALID_FIELD_TYPES.includes(fieldType)) {
      return NextResponse.json({ error: 'A valid field type is required' }, { status: 400 })
    }

    if (fieldType === 'SELECT' && (!Array.isArray(selectOptions) || selectOptions.length === 0)) {
      return NextResponse.json({ error: 'Select fields require at least one option' }, { status: 400 })
    }

    const existing = await prisma.assetCustomFieldDefinition.findUnique({
      where: {
        companyId_name: {
          companyId: user.companyId,
          name: name.trim()
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'A custom field with this name already exists' }, { status: 409 })
    }

    let finalSortOrder = sortOrder
    if (finalSortOrder === undefined || finalSortOrder === null) {
      const maxOrder = await prisma.assetCustomFieldDefinition.findFirst({
        where: { companyId: user.companyId },
        orderBy: { sortOrder: 'desc' },
        select: { sortOrder: true }
      })
      finalSortOrder = (maxOrder?.sortOrder ?? -1) + 1
    }

    const definition = await prisma.assetCustomFieldDefinition.create({
      data: {
        name: name.trim(),
        fieldType,
        selectOptions: fieldType === 'SELECT' ? selectOptions : [],
        sortOrder: finalSortOrder,
        companyId: user.companyId
      }
    })

    return NextResponse.json(definition, { status: 201 })

  } catch (error) {
    console.error('Error creating asset custom field:', error)
    return NextResponse.json(
      { error: 'Failed to create asset custom field' },
      { status: 500 }
    )
  }
}
