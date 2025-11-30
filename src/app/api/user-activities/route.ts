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
    const { type, description, metadata } = body

    // Create a general activity log for the user's most recent project or a default one
    let cardId = body.cardId
    
    if (!cardId) {
      // Get user's most recent project
      const recentProject = await prisma.card.findFirst({
        where: { 
          companyId: user.companyId,
          OR: [
            { ownerId: user.id },
            { assignedUsers: { some: { id: user.id } } }
          ]
        },
        orderBy: { updatedAt: 'desc' }
      })
      
      if (recentProject) {
        cardId = recentProject.id
      } else {
        // If no projects found, create a general company activity
        // For now, we'll skip creating the activity if no project context
        return NextResponse.json({ message: 'No project context available' })
      }
    }

    await prisma.activity.create({
      data: {
        type,
        description,
        cardId,
        userId: user.id,
        metadata: metadata ? JSON.stringify(metadata) : null
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error creating user activity:', error)
    return NextResponse.json(
      { error: 'Failed to create activity' },
      { status: 500 }
    )
  }
}