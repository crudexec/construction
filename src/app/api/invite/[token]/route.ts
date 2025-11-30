import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const invite = await prisma.teamInvite.findFirst({
      where: {
        token,
        isAccepted: false,
        expiresAt: {
          gte: new Date()
        }
      },
      include: {
        company: {
          select: {
            name: true,
            appName: true
          }
        },
        invitedBy: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    return NextResponse.json({ invite })
  } catch (error) {
    console.error('Error fetching invite:', error)
    return NextResponse.json(
      { error: 'Failed to fetch invitation' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params
    const { password } = await request.json()

    if (!password || password.length < 6) {
      return NextResponse.json({ error: 'Password must be at least 6 characters long' }, { status: 400 })
    }

    const invite = await prisma.teamInvite.findFirst({
      where: {
        token,
        isAccepted: false,
        expiresAt: {
          gte: new Date()
        }
      }
    })

    if (!invite) {
      return NextResponse.json({ error: 'Invalid or expired invitation' }, { status: 404 })
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: invite.email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    const bcrypt = require('bcryptjs')
    const hashedPassword = await bcrypt.hash(password, 10)

    // Create new user
    const newUser = await prisma.user.create({
      data: {
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        password: hashedPassword,
        role: invite.role,
        companyId: invite.companyId,
        isActive: true
      }
    })

    // Mark invite as accepted
    await prisma.teamInvite.update({
      where: { id: invite.id },
      data: {
        isAccepted: true,
        acceptedAt: new Date()
      }
    })

    // Create activity log for invitation acceptance
    try {
      // Get a recent project for activity context
      const recentProject = await prisma.card.findFirst({
        where: { 
          companyId: invite.companyId
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (recentProject) {
        await prisma.activity.create({
          data: {
            type: 'user_joined',
            description: `${invite.firstName} ${invite.lastName} joined the team`,
            cardId: recentProject.id,
            userId: newUser.id
          }
        })
      }
    } catch (activityError) {
      // Don't fail user creation if activity logging fails
      console.error('Failed to log user join activity:', activityError)
    }

    return NextResponse.json({
      user: {
        id: newUser.id,
        email: newUser.email,
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        role: newUser.role
      }
    })
  } catch (error) {
    console.error('Error accepting invite:', error)
    return NextResponse.json(
      { error: 'Failed to accept invitation' },
      { status: 500 }
    )
  }
}