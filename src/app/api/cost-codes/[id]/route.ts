import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get a single cost code
export async function GET(
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

    const costCode = await prisma.costCode.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            boqItems: true
          }
        }
      }
    })

    if (!costCode) {
      return NextResponse.json({ error: 'Cost code not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...costCode,
      boqItemCount: costCode._count.boqItems
    })

  } catch (error) {
    console.error('Error fetching cost code:', error)
    return NextResponse.json(
      { error: 'Failed to fetch cost code' },
      { status: 500 }
    )
  }
}

// PUT - Update a cost code
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
      return NextResponse.json({ error: 'Only admins can update cost codes' }, { status: 403 })
    }

    const existingCostCode = await prisma.costCode.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingCostCode) {
      return NextResponse.json({ error: 'Cost code not found' }, { status: 404 })
    }

    const body = await request.json()
    const { code, name, description, csiDivision, sortOrder, isActive } = body

    if (code && code.trim() !== existingCostCode.code) {
      const duplicate = await prisma.costCode.findUnique({
        where: {
          companyId_code: {
            companyId: user.companyId,
            code: code.trim()
          }
        }
      })

      if (duplicate) {
        return NextResponse.json({ error: 'A cost code with this code already exists' }, { status: 409 })
      }
    }

    const costCode = await prisma.costCode.update({
      where: { id },
      data: {
        ...(code !== undefined && { code: code.trim() }),
        ...(name !== undefined && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(csiDivision !== undefined && { csiDivision: csiDivision?.trim() || null }),
        ...(sortOrder !== undefined && { sortOrder }),
        ...(isActive !== undefined && { isActive })
      }
    })

    return NextResponse.json(costCode)

  } catch (error) {
    console.error('Error updating cost code:', error)
    return NextResponse.json(
      { error: 'Failed to update cost code' },
      { status: 500 }
    )
  }
}

// DELETE - Delete a cost code
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
      return NextResponse.json({ error: 'Only admins can delete cost codes' }, { status: 403 })
    }

    const existingCostCode = await prisma.costCode.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            boqItems: true
          }
        }
      }
    })

    if (!existingCostCode) {
      return NextResponse.json({ error: 'Cost code not found' }, { status: 404 })
    }

    if (existingCostCode._count.boqItems > 0) {
      return NextResponse.json({
        error: `Cannot delete cost code with ${existingCostCode._count.boqItems} BOQ item(s) assigned. Remove or reassign those items first, or deactivate the cost code instead.`
      }, { status: 400 })
    }

    await prisma.costCode.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Cost code deleted successfully' })

  } catch (error) {
    console.error('Error deleting cost code:', error)
    return NextResponse.json(
      { error: 'Failed to delete cost code' },
      { status: 500 }
    )
  }
}
