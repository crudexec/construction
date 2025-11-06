import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      title,
      description,
      contactName,
      contactEmail,
      contactPhone,
      projectAddress,
      budget,
      priority,
      timeline,
      stageId
    } = body

    if (!title || !stageId) {
      return NextResponse.json(
        { error: 'Title and stage are required' },
        { status: 400 }
      )
    }

    const stage = await prisma.stage.findFirst({
      where: { id: stageId, companyId: user.companyId }
    })

    if (!stage) {
      return NextResponse.json(
        { error: 'Invalid stage' },
        { status: 400 }
      )
    }

    const card = await prisma.card.create({
      data: {
        title,
        description,
        contactName,
        contactEmail,
        contactPhone,
        projectAddress,
        budget: budget ? parseFloat(budget) : null,
        priority: priority || 'MEDIUM',
        timeline,
        stageId,
        companyId: user.companyId,
        ownerId: user.id
      }
    })

    await prisma.activity.create({
      data: {
        type: 'card_created',
        description: `Created new lead: ${title}`,
        cardId: card.id,
        userId: user.id
      }
    })

    return NextResponse.json(card)
  } catch (error) {
    console.error('Error creating card:', error)
    return NextResponse.json(
      { error: 'Failed to create card' },
      { status: 500 }
    )
  }
}