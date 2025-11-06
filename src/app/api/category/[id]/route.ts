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

    const { id: categoryId } = await params
    const body = await request.json()

    // Verify category exists and user has access through project
    const category = await prisma.taskCategory.findFirst({
      where: { 
        id: categoryId
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

    if (!category || category.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    const updatedCategory = await prisma.taskCategory.update({
      where: { id: categoryId },
      data: {
        name: body.name,
        description: body.description,
        color: body.color,
        order: body.order,
        updatedAt: new Date()
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'category_updated',
        description: `Updated task category: ${updatedCategory.name}`,
        cardId: category.card.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedCategory)
  } catch (error) {
    console.error('Error updating category:', error)
    return NextResponse.json(
      { error: 'Failed to update category' },
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

    const { id: categoryId } = await params

    // Verify category exists and user has access through project
    const category = await prisma.taskCategory.findFirst({
      where: { 
        id: categoryId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        },
        _count: {
          select: { tasks: true }
        }
      }
    })

    if (!category || category.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Category not found' }, { status: 404 })
    }

    // Check if category has tasks
    if (category._count.tasks > 0) {
      return NextResponse.json(
        { error: 'Cannot delete category with tasks. Please move or delete tasks first.' },
        { status: 400 }
      )
    }

    await prisma.taskCategory.delete({
      where: { id: categoryId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'category_deleted',
        description: `Deleted task category: ${category.name}`,
        cardId: category.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting category:', error)
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}