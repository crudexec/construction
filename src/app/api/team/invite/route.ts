import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import crypto from 'crypto'

export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const body = await request.json()
    const { email, firstName, lastName, role } = body
    
    console.log('Creating invite for:', { email, firstName, lastName, role, companyId: user.companyId })

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email }
    })

    if (existingUser) {
      return NextResponse.json({ error: 'User with this email already exists' }, { status: 400 })
    }

    // Check if there's already a pending invite for this email
    const existingInvite = await prisma.teamInvite.findFirst({
      where: {
        email,
        companyId: user.companyId,
        isAccepted: false,
        expiresAt: {
          gte: new Date()
        }
      }
    })

    if (existingInvite) {
      // Return the existing invite URL instead of error
      const host = request.headers.get('host') || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`}/invite/${existingInvite.token}`
      
      return NextResponse.json({
        invite: {
          id: existingInvite.id,
          email: existingInvite.email,
          firstName: existingInvite.firstName,
          lastName: existingInvite.lastName,
          role: existingInvite.role,
          token: existingInvite.token,
          expiresAt: existingInvite.expiresAt
        },
        inviteUrl
      })
    }

    // Generate unique invite token
    const inviteToken = crypto.randomBytes(32).toString('hex')
    
    // Set expiry to 7 days from now
    const expiresAt = new Date()
    expiresAt.setDate(expiresAt.getDate() + 7)

    // Create team invite
    const invite = await prisma.teamInvite.create({
      data: {
        email,
        firstName,
        lastName,
        role: role || 'STAFF',
        token: inviteToken,
        companyId: user.companyId,
        invitedById: user.id,
        expiresAt
      }
    })

    // Generate invite URL - using the host from the request if NEXT_PUBLIC_APP_URL is not set
    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`}/invite/${inviteToken}`

    // Create activity log for invitation creation
    try {
      // Get a recent project for activity context
      const recentProject = await prisma.card.findFirst({
        where: { 
          companyId: user.companyId
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (recentProject) {
        await prisma.activity.create({
          data: {
            type: 'user_invited',
            description: `Invited ${firstName} ${lastName} (${email}) to join as ${role}`,
            cardId: recentProject.id,
            userId: user.id
          }
        })
      }
    } catch (activityError) {
      // Don't fail invitation if activity logging fails
      console.error('Failed to log invitation activity:', activityError)
    }

    return NextResponse.json({
      invite: {
        id: invite.id,
        email: invite.email,
        firstName: invite.firstName,
        lastName: invite.lastName,
        role: invite.role,
        token: invite.token,
        expiresAt: invite.expiresAt
      },
      inviteUrl
    })
  } catch (error) {
    console.error('Error creating team invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team invite' },
      { status: 500 }
    )
  }
}