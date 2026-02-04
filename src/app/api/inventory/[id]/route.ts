import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const material = await prisma.inventoryMaterial.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        transactions: {
          include: {
            user: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            project: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 50
        }
      }
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    return NextResponse.json(material)

  } catch (error) {
    console.error('Error fetching inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inventory item' },
      { status: 500 }
    )
  }
}

export async function PATCH(
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

    const existingMaterial = await prisma.inventoryMaterial.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const body = await request.json()

    const {
      name,
      sku,
      description,
      categoryId,
      unit,
      unitCost
    } = body

    if (sku && sku !== existingMaterial.sku) {
      const existingSku = await prisma.inventoryMaterial.findFirst({
        where: {
          companyId: user.companyId,
          sku: sku,
          id: { not: id }
        }
      })

      if (existingSku) {
        return NextResponse.json({ error: 'SKU already exists' }, { status: 400 })
      }
    }

    const material = await prisma.inventoryMaterial.update({
      where: { id },
      data: {
        name: name ?? existingMaterial.name,
        sku: sku !== undefined ? (sku || null) : existingMaterial.sku,
        description: description !== undefined ? description : existingMaterial.description,
        categoryId: categoryId !== undefined ? (categoryId || null) : existingMaterial.categoryId,
        unit: unit ?? existingMaterial.unit,
        unitCost: unitCost !== undefined ? unitCost : existingMaterial.unitCost
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      }
    })

    return NextResponse.json(material)

  } catch (error) {
    console.error('Error updating inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to update inventory item' },
      { status: 500 }
    )
  }
}

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

    const existingMaterial = await prisma.inventoryMaterial.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingMaterial) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    await prisma.inventoryMaterial.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting inventory item:', error)
    return NextResponse.json(
      { error: 'Failed to delete inventory item' },
      { status: 500 }
    )
  }
}
