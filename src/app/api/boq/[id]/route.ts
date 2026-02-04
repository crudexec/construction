import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Admin-only check
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can update BOQ items' },
        { status: 403 }
      )
    }

    const { id: boqItemId } = await params
    const body = await request.json()

    // Verify BOQ item exists and user has access
    const existingItem = await prisma.bOQItem.findFirst({
      where: {
        id: boqItemId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        project: true
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'BOQ item not found' }, { status: 404 })
    }

    // If itemNumber is being changed, check uniqueness
    if (body.itemNumber && body.itemNumber !== existingItem.itemNumber) {
      const duplicateItem = await prisma.bOQItem.findUnique({
        where: {
          projectId_itemNumber: {
            projectId: existingItem.projectId,
            itemNumber: body.itemNumber
          }
        }
      })

      if (duplicateItem) {
        return NextResponse.json(
          { error: `Item number ${body.itemNumber} already exists in this project` },
          { status: 400 }
        )
      }
    }

    // Prepare update data
    const updateData: any = {}

    if (body.itemNumber !== undefined) updateData.itemNumber = body.itemNumber
    if (body.name !== undefined) updateData.name = body.name
    if (body.description !== undefined) updateData.description = body.description
    if (body.category !== undefined) updateData.category = body.category
    if (body.subCategory !== undefined) updateData.subCategory = body.subCategory
    if (body.unit !== undefined) updateData.unit = body.unit
    if (body.quantity !== undefined) updateData.quantity = parseFloat(body.quantity)
    if (body.unitRate !== undefined) updateData.unitRate = parseFloat(body.unitRate)
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.specifications !== undefined) updateData.specifications = body.specifications
    if (body.order !== undefined) updateData.order = body.order
    if (body.isContingency !== undefined) updateData.isContingency = body.isContingency
    if (body.actualCost !== undefined) updateData.actualCost = body.actualCost ? parseFloat(body.actualCost) : null

    // Recalculate totalCost if quantity or unitRate changed
    const newQuantity = updateData.quantity !== undefined ? updateData.quantity : existingItem.quantity
    const newUnitRate = updateData.unitRate !== undefined ? updateData.unitRate : existingItem.unitRate
    updateData.totalCost = newQuantity * newUnitRate

    const updatedItem = await prisma.bOQItem.update({
      where: { id: boqItemId },
      data: updateData,
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'boq_item_updated',
        description: `Updated BOQ item: ${updatedItem.itemNumber} - ${updatedItem.name}`,
        metadata: JSON.stringify({
          boqItemId: updatedItem.id,
          itemNumber: updatedItem.itemNumber,
          changes: Object.keys(updateData)
        }),
        cardId: existingItem.projectId,
        userId: user.id
      }
    })

    return NextResponse.json(updatedItem)
  } catch (error) {
    console.error('Error updating BOQ item:', error)
    return NextResponse.json(
      { error: 'Failed to update BOQ item' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    // Admin-only check
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can delete BOQ items' },
        { status: 403 }
      )
    }

    const { id: boqItemId } = await params

    // Verify BOQ item exists and user has access
    const existingItem = await prisma.bOQItem.findFirst({
      where: {
        id: boqItemId,
        project: {
          companyId: user.companyId
        }
      }
    })

    if (!existingItem) {
      return NextResponse.json({ error: 'BOQ item not found' }, { status: 404 })
    }

    // Delete the BOQ item (cascade will delete related BOQPurchaseOrder records)
    await prisma.bOQItem.delete({
      where: { id: boqItemId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'boq_item_deleted',
        description: `Deleted BOQ item: ${existingItem.itemNumber} - ${existingItem.name}`,
        metadata: JSON.stringify({
          itemNumber: existingItem.itemNumber,
          name: existingItem.name,
          category: existingItem.category,
          totalCost: existingItem.totalCost
        }),
        cardId: existingItem.projectId,
        userId: user.id
      }
    })

    return NextResponse.json({ message: 'BOQ item deleted successfully' })
  } catch (error) {
    console.error('Error deleting BOQ item:', error)
    return NextResponse.json(
      { error: 'Failed to delete BOQ item' },
      { status: 500 }
    )
  }
}
