import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { teamInviteTemplate } from '@/lib/email/templates/notifications'
import crypto from 'crypto'

// Invitations are separate from users until the recipient accepts.
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    const user = token ? await validateUser(token) : null
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const [invites, members] = await Promise.all([
      prisma.teamInvite.findMany({
        where: { companyId: user.companyId, isAccepted: false },
        select: { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, expiresAt: true },
        orderBy: { createdAt: 'desc' }
      }),
      prisma.user.findMany({
        where: { companyId: user.companyId, isActive: true },
        select: { email: true }
      })
    ])
    // Hide invitations already resolved by an administrator and older duplicates.
    const seen = new Set(members.map(member => member.email.trim().toLowerCase()))
    return NextResponse.json(invites.filter(invite => {
      const email = invite.email.trim().toLowerCase()
      if (seen.has(email)) return false
      seen.add(email)
      return true
    }))
  } catch (error) {
    console.error('Error fetching team invitations:', error)
    return NextResponse.json({ error: 'Failed to fetch invitations' }, { status: 500 })
  }
}

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
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : ''
    const firstName = typeof body.firstName === 'string' ? body.firstName.trim() : ''
    const lastName = typeof body.lastName === 'string' ? body.lastName.trim() : ''
    const role = body.role || 'STAFF'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !firstName || !lastName ||
        !['ADMIN', 'STAFF', 'SUBCONTRACTOR', 'CLIENT'].includes(role)) {
      return NextResponse.json({ error: 'Enter a valid email, name, and role' }, { status: 400 })
    }
    
    console.log('Creating invite for:', { email, firstName, lastName, role, companyId: user.companyId })

    // Check if user already exists
    const existingUser = await prisma.user.findFirst({
      where: { email: { equals: email, mode: 'insensitive' } }
    })

    if (existingUser) {
      // If user exists but is inactive AND belongs to the same company, reactivate them
      if (!existingUser.isActive && existingUser.companyId === user.companyId) {
        const reactivatedUser = await prisma.user.update({
          where: { id: existingUser.id },
          data: {
            isActive: true,
            firstName: firstName || existingUser.firstName,
            lastName: lastName || existingUser.lastName,
            role: role || existingUser.role
          },
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            role: true
          }
        })

        return NextResponse.json({
          user: reactivatedUser,
          reactivated: true,
          message: 'User has been reactivated'
        })
      }

      // User exists and is active, or belongs to different company
      return NextResponse.json({
        error: existingUser.companyId === user.companyId
          ? 'This person is already an active member of your team.'
          : 'This email belongs to an account in another company. Contact support to resolve the company association before inviting them.',
        code: existingUser.companyId === user.companyId ? 'ALREADY_ON_TEAM' : 'ACCOUNT_COMPANY_CONFLICT'
      }, { status: 409 })
    }

    // Reuse the latest unaccepted invitation, renewing expired links on resend.
    const existingInvite = await prisma.teamInvite.findFirst({
      where: { email: { equals: email, mode: 'insensitive' }, companyId: user.companyId, isAccepted: false },
      orderBy: { createdAt: 'desc' }
    })
    const now = new Date()
    const renewed = !!existingInvite && existingInvite.expiresAt <= now
    const invite = existingInvite
      ? renewed
        ? await prisma.teamInvite.update({
            where: { id: existingInvite.id },
            data: { token: crypto.randomBytes(32).toString('hex'), expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000) }
          })
        : existingInvite
      : await prisma.teamInvite.create({
          data: {
            email, firstName, lastName, role,
            token: crypto.randomBytes(32).toString('hex'),
            companyId: user.companyId, invitedById: user.id,
            expiresAt: new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
          }
        })

    const host = request.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') ? 'http' : 'https'
    const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`}/invite/${invite.token}`

    // Create activity log for invitation creation
    try {
      // Get a recent project for activity context
      const recentProject = await prisma.card.findFirst({
        where: { 
          companyId: user.companyId
        },
        orderBy: { updatedAt: 'desc' }
      })

      if (recentProject && !existingInvite) {
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

    // Send invitation email to the invited user
    let emailSent = false
    try {
      // Get company info
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { appName: true }
      })
      const companyName = company?.appName || 'BuildFlow'

      const emailService = await getEmailService(user.companyId)

      if (emailService.isConfigured()) {
        const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email

        const emailTemplate = teamInviteTemplate({
          recipientName: invite.firstName || 'Team Member',
          recipientEmail: invite.email,
          invitedBy: inviterName,
          role: invite.role,
          inviteUrl,
          expiresAt: invite.expiresAt.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          companyName
        })

        const emailResult = await emailService.send({
          to: invite.email,
          subject: emailTemplate.subject,
          html: emailTemplate.html,
          text: emailTemplate.text
        })

        emailSent = emailResult.success
        if (!emailResult.success) {
          console.error('Failed to send invite email:', emailResult.error)
        } else {
          console.log('Invite email sent successfully to:', email)
        }
      } else {
        console.warn('Email service not configured for company:', user.companyId)
      }
    } catch (emailError) {
      // Don't fail invitation if email sending fails
      console.error('Failed to send invitation email:', emailError)
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
      inviteUrl,
      emailSent,
      resent: !!existingInvite,
      renewed,
      message: emailSent ? 'Invitation sent successfully' : 'Invitation created but email could not be sent'
    })
  } catch (error) {
    console.error('Error creating team invite:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to create team invite' },
      { status: 500 }
    )
  }
}