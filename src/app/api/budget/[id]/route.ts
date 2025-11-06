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

    const { id: budgetItemId } = await params
    const body = await request.json()

    // Verify budget item exists and user has access through project
    const budgetItem = await prisma.budgetItem.findFirst({
      where: { 
        id: budgetItemId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!budgetItem || budgetItem.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Budget item not found' }, { status: 404 })
    }

    const updatedBudgetItem = await prisma.budgetItem.update({
      where: { id: budgetItemId },
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        amount: body.amount,
        quantity: body.quantity,
        unit: body.unit,
        isExpense: body.isExpense,
        isPaid: body.isPaid,
        paidAt: body.isPaid && body.isExpense && !budgetItem.isPaid ? new Date() : 
                !body.isPaid ? null : budgetItem.paidAt,
        updatedAt: new Date()
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: body.isExpense ? 'expense_updated' : 'budget_item_updated',
        description: `Updated ${body.isExpense ? 'expense' : 'budget item'}: ${updatedBudgetItem.name}`,
        cardId: budgetItem.card.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedBudgetItem)
  } catch (error) {
    console.error('Error updating budget item:', error)
    return NextResponse.json(
      { error: 'Failed to update budget item' },
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

    const { id: budgetItemId } = await params

    // Verify budget item exists and user has access through project
    const budgetItem = await prisma.budgetItem.findFirst({
      where: { 
        id: budgetItemId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!budgetItem || budgetItem.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Budget item not found' }, { status: 404 })
    }

    await prisma.budgetItem.delete({
      where: { id: budgetItemId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: budgetItem.isExpense ? 'expense_deleted' : 'budget_item_deleted',
        description: `Deleted ${budgetItem.isExpense ? 'expense' : 'budget item'}: ${budgetItem.name}`,
        cardId: budgetItem.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting budget item:', error)
    return NextResponse.json(
      { error: 'Failed to delete budget item' },
      { status: 500 }
    )
  }
}