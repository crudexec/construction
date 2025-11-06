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

    // Get or create notification preferences
    let preferences = await prisma.notificationPreference.findUnique({
      where: { userId: user.id }
    })

    if (!preferences) {
      preferences = await prisma.notificationPreference.create({
        data: {
          userId: user.id,
          emailNewLead: true,
          emailProjectUpdate: true,
          emailTaskAssigned: true,
          emailTaskCompleted: true,
          emailBidReceived: true,
          emailBidStatusChange: true,
          pushNewLead: false,
          pushProjectUpdate: true,
          pushTaskAssigned: true,
          pushTaskCompleted: false,
          pushBidReceived: true,
          pushBidStatusChange: true
        }
      })
    }

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error fetching notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: NextRequest) {
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

    const updates = await request.json()

    const preferences = await prisma.notificationPreference.upsert({
      where: { userId: user.id },
      update: updates,
      create: {
        userId: user.id,
        ...updates
      }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}