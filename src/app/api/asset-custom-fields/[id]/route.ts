import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_FIELD_TYPES = ['TEXT', 'NUMBER', 'DATE', 'BOOLEAN', 'SELECT']

// PUT - Update an asset custom field definition
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Only admins can update custom fields' }, { status: 403 })
    }

    const existing = await prisma.assetCustomFieldDefinition.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    const body = await request.json()
    const { name, fieldType, selectOptions, sortOrder, isActive } = body

    if (fieldType && !VALID_FIELD_TYPES.includes(fieldType)) {
      return NextResponse.json({ error: 'Invalid field type' }, { status: 400 })
    }

    if (name && name.trim() !== existing.name) {
      const duplicate = await prisma.assetCustomFieldDefinition.findUnique({
        where: {
          companyId_name: {
            companyId: user.companyId,
            name: name.trim()
          }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A custom field with this name already exists' }, { status: 409 })
      }
    }

    const definition = await prisma.assetCustomFieldDefinition.update({
      where: { id },
      data: {
        ...(name !== undefined && { name: name.trim() }),
        ...(fieldType !== undefined && { fieldType }),
        ...(selectOptions !== undefined && { selectOptions }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(definition)

  } catch (error) {
    console.error('Error updating asset custom field:', error)
    return NextResponse.json(
      { error: 'Failed to update asset custom field' },
      { status: 500 }
    )
  }
}

// DELETE - Delete an asset custom field definition
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
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
      return NextResponse.json({ error: 'Only admins can delete custom fields' }, { status: 403 })
    }

    const existing = await prisma.assetCustomFieldDefinition.findFirst({
      where: { id, companyId: user.companyId },
      include: {
        _count: { select: { values: true } }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Custom field not found' }, { status: 404 })
    }

    if (existing._count.values > 0) {
      return NextResponse.json({
        error: `Cannot delete a custom field with ${existing._count.values} asset value(s) set. Deactivate it instead.`
      }, { status: 400 })
    }

    await prisma.assetCustomFieldDefinition.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Custom field deleted successfully' })

  } catch (error) {
    console.error('Error deleting asset custom field:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset custom field' },
      { status: 500 }
    )
  }
}
