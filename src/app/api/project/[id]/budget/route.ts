import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
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

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const budgetItems = await prisma.budgetItem.findMany({
      where: { 
        cardId: projectId
      },
      orderBy: [
        { category: 'asc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(budgetItems)
  } catch (error) {
    console.error('Error fetching budget items:', error)
    return NextResponse.json(
      { error: 'Failed to fetch budget items' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const { id: projectId } = await params
    const body = await request.json()

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: { 
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const budgetItem = await prisma.budgetItem.create({
      data: {
        name: body.name,
        description: body.description,
        category: body.category,
        amount: body.amount,
        quantity: body.quantity || 1,
        unit: body.unit,
        isExpense: body.isExpense || false,
        isPaid: body.isPaid || false,
        paidAt: body.isPaid && body.isExpense ? new Date() : null,
        cardId: projectId
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: body.isExpense ? 'expense_added' : 'budget_item_added',
        description: `Added ${body.isExpense ? 'expense' : 'budget item'}: ${budgetItem.name}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(budgetItem)
  } catch (error) {
    console.error('Error creating budget item:', error)
    return NextResponse.json(
      { error: 'Failed to create budget item' },
      { status: 500 }
    )
  }
}