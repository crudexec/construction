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

    const { email, firstName, lastName, role } = await request.json()

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
      return NextResponse.json({ error: 'An active invitation already exists for this email' }, { status: 400 })
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

    // Generate invite URL
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/invite/${inviteToken}`

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
      { error: 'Failed to create team invite' },
      { status: 500 }
    )
  }
}