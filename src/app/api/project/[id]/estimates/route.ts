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

    const estimates = await prisma.estimate.findMany({
      where: { 
        cardId: projectId
      },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(estimates)
  } catch (error) {
    console.error('Error fetching project estimates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project estimates' },
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

    // Generate estimate number
    const estimateCount = await prisma.estimate.count({
      where: {
        card: {
          companyId: user.companyId
        }
      }
    })
    const estimateNumber = `EST-${String(estimateCount + 1).padStart(4, '0')}`

    // Create estimate with items
    const estimate = await prisma.estimate.create({
      data: {
        estimateNumber,
        title: body.title,
        description: body.description,
        subtotal: body.subtotal,
        tax: body.tax,
        discount: body.discount,
        total: body.total,
        status: 'DRAFT',
        validUntil: body.validUntil ? new Date(body.validUntil) : null,
        cardId: projectId,
        items: {
          create: body.items.map((item: any) => ({
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            total: item.total,
            order: item.order
          }))
        }
      },
      include: {
        items: {
          orderBy: {
            order: 'asc'
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'estimate_created',
        description: `Created estimate: ${estimate.title}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(estimate)
  } catch (error) {
    console.error('Error creating estimate:', error)
    return NextResponse.json(
      { error: 'Failed to create estimate' },
      { status: 500 }
    )
  }
}