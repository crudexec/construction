import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { teamInviteTemplate } from '@/lib/email/templates/notifications'
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
      // Return the existing invite URL and resend the email
      const host = request.headers.get('host') || 'localhost:3000'
      const protocol = host.includes('localhost') ? 'http' : 'https'
      const inviteUrl = `${process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`}/invite/${existingInvite.token}`

      // Resend the invitation email
      let emailSent = false
      try {
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { appName: true }
        })
        const companyName = company?.appName || 'BuildFlow'
        const emailService = await getEmailService(user.companyId)

        if (emailService.isConfigured()) {
          const inviterName = `${user.firstName} ${user.lastName}`.trim() || user.email

          const emailTemplate = teamInviteTemplate({
            recipientName: existingInvite.firstName || 'Team Member',
            recipientEmail: existingInvite.email,
            invitedBy: inviterName,
            role: existingInvite.role,
            inviteUrl,
            expiresAt: existingInvite.expiresAt.toLocaleDateString('en-US', {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric'
            }),
            companyName
          })

          const emailResult = await emailService.send({
            to: existingInvite.email,
            subject: emailTemplate.subject,
            html: emailTemplate.html,
            text: emailTemplate.text
          })

          emailSent = emailResult.success
          if (!emailResult.success) {
            console.error('Failed to resend invite email:', emailResult.error)
          }
        }
      } catch (emailError) {
        console.error('Error resending invite email:', emailError)
      }

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
        inviteUrl,
        emailResent: emailSent,
        message: emailSent ? 'Invitation email resent successfully' : 'Existing invite found (email may not have been sent)'
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
          recipientName: firstName || 'Team Member',
          recipientEmail: email,
          invitedBy: inviterName,
          role: role || 'STAFF',
          inviteUrl,
          expiresAt: expiresAt.toLocaleDateString('en-US', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          companyName
        })

        const emailResult = await emailService.send({
          to: email,
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