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

    const categories = await prisma.taskCategory.findMany({
      where: { 
        cardId: projectId
      },
      include: {
        _count: {
          select: { tasks: true }
        }
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(categories)
  } catch (error) {
    console.error('Error fetching task categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task categories' },
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

    // Get max order for new category
    const maxOrder = await prisma.taskCategory.findFirst({
      where: { cardId: projectId },
      orderBy: { order: 'desc' },
      select: { order: true }
    })

    const category = await prisma.taskCategory.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color || '#6366f1',
        order: (maxOrder?.order || 0) + 1,
        cardId: projectId
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
        type: 'category_created',
        description: `Created task category: ${category.name}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error('Error creating task category:', error)
    return NextResponse.json(
      { error: 'Failed to create task category' },
      { status: 500 }
    )
  }
}