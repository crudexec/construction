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

    const body = await request.json()
    const { stageId } = body
    const { id: cardId } = await params

    if (!stageId) {
      return NextResponse.json(
        { error: 'Stage ID is required' },
        { status: 400 }
      )
    }

    const card = await prisma.card.findFirst({
      where: { id: cardId, companyId: user.companyId }
    })

    if (!card) {
      return NextResponse.json(
        { error: 'Card not found' },
        { status: 404 }
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

    const oldStage = await prisma.stage.findUnique({
      where: { id: card.stageId }
    })

    const updatedCard = await prisma.card.update({
      where: { id: cardId },
      data: { stageId }
    })

    await prisma.activity.create({
      data: {
        type: 'card_moved',
        description: `Moved card from ${oldStage?.name} to ${stage.name}`,
        cardId,
        userId: user.id
      }
    })

    return NextResponse.json(updatedCard)
  } catch (error) {
    console.error('Error moving card:', error)
    return NextResponse.json(
      { error: 'Failed to move card' },
      { status: 500 }
    )
  }
}