import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { newLeadTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { newLeadSMS } from '@/lib/sms/templates/notifications'

// GET: Get all team members for a project
export async function GET(
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

    const { id } = await params

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      assignedUsers: project.assignedUsers,
      owner: project.owner 
    })
  } catch (error) {
    console.error('Error fetching project team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project team' },
      { status: 500 }
    )
  }
}

// POST: Add user to project team
export async function POST(
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
    }

    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if target user exists in the same company
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: user.companyId
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Add user to project team
    await prisma.card.update({
      where: { id },
      data: {
        assignedUsers: {
          connect: { id: userId }
        }
      }
    })

    // Send notification to the assigned user (if not the same user adding themselves)
    if (userId !== user.id) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const leadUrl = `${baseUrl}/dashboard/projects/${id}`

        // Get target user with notification preferences
        const assignedUser = await prisma.user.findUnique({
          where: { id: userId },
          include: {
            notificationPreference: true,
            company: {
              select: { appName: true }
            }
          }
        })

        if (assignedUser) {
          const prefs = assignedUser.notificationPreference
          const companyName = assignedUser.company?.appName || 'BuildFlow'

          // Create in-app notification
          const notification = await prisma.notification.create({
            data: {
              type: 'NEW_LEAD_ASSIGNED',
              title: `Assigned to: ${project.title}`,
              message: `${user.firstName} ${user.lastName} assigned you to "${project.title}".`,
              userId: assignedUser.id,
              channel: prefs?.emailEnabled ? 'EMAIL' : 'IN_APP',
              metadata: JSON.stringify({
                projectId: id,
                assignedBy: user.id
              })
            }
          })

          // Send email if enabled
          if (prefs?.emailNewLead ?? true) {
            const emailService = await getEmailService(user.companyId)

            if (emailService.isConfigured()) {
              const emailTemplate = newLeadTemplate({
                recipientName: assignedUser.firstName,
                leadName: project.title,
                leadSource: project.contactName || undefined,
                leadValue: project.budget ? `${project.budget}` : undefined,
                leadUrl,
                companyName
              })

              const emailResult = await emailService.send({
                to: assignedUser.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
              })

              if (emailResult.success) {
                await prisma.notification.update({
                  where: { id: notification.id },
                  data: { emailSentAt: new Date() }
                })
              } else {
                await prisma.notification.update({
                  where: { id: notification.id },
                  data: { emailError: emailResult.error }
                })
              }
            }
          }

          // Send SMS if enabled
          if (prefs?.smsEnabled && prefs?.smsNewLead) {
            const smsService = await getSMSService(user.companyId)

            if (smsService.isConfigured()) {
              const phoneNumber = prefs.smsPhoneNumber || assignedUser.phone

              if (phoneNumber) {
                const smsMessage = newLeadSMS({
                  companyName,
                  projectName: project.title
                })

                const smsResult = await smsService.send({
                  to: phoneNumber,
                  message: smsMessage
                })

                if (smsResult.success) {
                  await prisma.notification.update({
                    where: { id: notification.id },
                    data: {
                      smsSentAt: new Date(),
                      smsMessageId: smsResult.messageId
                    }
                  })
                } else {
                  await prisma.notification.update({
                    where: { id: notification.id },
                    data: { smsError: smsResult.error }
                  })
                }
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending lead assignment notification:', notificationError)
      }
    }

    return NextResponse.json({ message: 'User added to project team successfully' })
  } catch (error) {
    console.error('Error adding user to project team:', error)
    return NextResponse.json(
      { error: 'Failed to add user to project team' },
      { status: 500 }
    )
  }
}

// DELETE: Remove user from project team
export async function DELETE(
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
    }

    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Remove user from project team
    await prisma.card.update({
      where: { id },
      data: {
        assignedUsers: {
          disconnect: { id: userId }
        }
      }
    })

    return NextResponse.json({ message: 'User removed from project team successfully' })
  } catch (error) {
    console.error('Error removing user from project team:', error)
    return NextResponse.json(
      { error: 'Failed to remove user from project team' },
      { status: 500 }
    )
  }
}