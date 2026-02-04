import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function POST(
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

    const body = await request.json()
    const { quantity, reason, projectId } = body

    if (!quantity || quantity <= 0) {
      return NextResponse.json({ error: 'Quantity must be greater than 0' }, { status: 400 })
    }

    const material = await prisma.inventoryMaterial.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!material) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    if (material.quantity < quantity) {
      return NextResponse.json({ 
        error: `Insufficient stock. Available: ${material.quantity}` 
      }, { status: 400 })
    }

    const previousQty = material.quantity
    const newQty = previousQty - quantity

    // Update material quantity and create transaction in a transaction
    const [updatedMaterial, transaction] = await prisma.$transaction([
      prisma.inventoryMaterial.update({
        where: { id },
        data: { quantity: newQty },
        include: {
          category: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      }),
      prisma.inventoryTransaction.create({
        data: {
          materialId: id,
          type: 'STOCK_OUT',
          quantity,
          previousQty,
          newQty,
          reason: reason || null,
          projectId: projectId || null,
          userId: user.id
        },
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
        }
      })
    ])

    return NextResponse.json({
      material: updatedMaterial,
      transaction
    })

  } catch (error) {
    console.error('Error stocking out:', error)
    return NextResponse.json(
      { error: 'Failed to remove stock' },
      { status: 500 }
    )
  }
}
