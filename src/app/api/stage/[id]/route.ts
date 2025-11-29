import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PUT(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const { name, color } = body

    if (!name) {
      return NextResponse.json(
        { error: 'Name is required' },
        { status: 400 }
      )
    }

    // Verify stage belongs to user's company
    const existingStage = await prisma.stage.findFirst({
      where: { 
        id,
        companyId: user.companyId 
      }
    })

    if (!existingStage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    const stage = await prisma.stage.update({
      where: { id },
      data: {
        name: name.trim(),
        ...(color && { color })
      }
    })

    return NextResponse.json(stage)
  } catch (error) {
    console.error('Error updating stage:', error)
    return NextResponse.json(
      { error: 'Failed to update stage' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Verify stage belongs to user's company and check for cards
    const existingStage = await prisma.stage.findFirst({
      where: { 
        id,
        companyId: user.companyId 
      },
      include: {
        cards: {
          where: { status: 'ACTIVE' }
        }
      }
    })

    if (!existingStage) {
      return NextResponse.json({ error: 'Stage not found' }, { status: 404 })
    }

    if (existingStage.cards.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete stage with active cards. Move cards first.' },
        { status: 400 }
      )
    }

    await prisma.stage.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Stage deleted successfully' })
  } catch (error) {
    console.error('Error deleting stage:', error)
    return NextResponse.json(
      { error: 'Failed to delete stage' },
      { status: 500 }
    )
  }
}