import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const categories = await prisma.inventoryCategory.findMany({
      where: {
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            materials: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(categories)

  } catch (error) {
    console.error('Error fetching categories:', error)
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('[Categories POST] Starting request')

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      console.log('[Categories POST] No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      console.log('[Categories POST] Invalid user')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('[Categories POST] User validated:', user.id, 'Company:', user.companyId)

    const body = await request.json()
    const { name, description, color } = body

    console.log('[Categories POST] Request body:', { name, description, color })

    if (!name) {
      return NextResponse.json({ error: 'Category name is required' }, { status: 400 })
    }

    // Check for duplicate category name
    console.log('[Categories POST] Checking for duplicate...')
    const existingCategory = await prisma.inventoryCategory.findFirst({
      where: {
        companyId: user.companyId,
        name: name
      }
    })

    if (existingCategory) {
      console.log('[Categories POST] Category already exists')
      return NextResponse.json({ error: 'Category already exists' }, { status: 400 })
    }

    console.log('[Categories POST] Creating category...')
    const category = await prisma.inventoryCategory.create({
      data: {
        name,
        description: description || null,
        color: color || '#6366f1',
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            materials: true
          }
        }
      }
    })

    console.log('[Categories POST] Category created:', category.id)
    return NextResponse.json(category, { status: 201 })

  } catch (error: any) {
    console.error('Error creating category:', error)

    // Return more detailed error message for debugging
    const errorMessage = error?.message || 'Failed to create category'
    const errorCode = error?.code || 'UNKNOWN'

    return NextResponse.json(
      { error: errorMessage, code: errorCode },
      { status: 500 }
    )
  }
}
