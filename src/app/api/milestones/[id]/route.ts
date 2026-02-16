import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { milestoneTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { milestoneCompletedSMS } from '@/lib/sms/templates/notifications'

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

    const { id: milestoneId } = await params

    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    return NextResponse.json(milestone)

  } catch (error) {
    console.error('Error fetching milestone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestone' },
      { status: 500 }
    )
  }
}

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

    const { id: milestoneId } = await params
    const body = await request.json()

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            ownerId: true,
            assignedUsers: {
              select: { id: true }
            }
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const { title, description, amount, targetDate, completedDate, status, vendorId, order } = body

    // If vendorId is provided, verify vendor exists and belongs to the company
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId: user.companyId
        }
      })

      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
    }

    const updatedMilestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: amount ? parseFloat(amount) : null }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(completedDate !== undefined && { completedDate: completedDate ? new Date(completedDate) : null }),
        ...(status !== undefined && { status }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(order !== undefined && { order }),
        updatedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'milestone_updated',
        description: `Updated milestone: ${updatedMilestone.title}`,
        cardId: milestone.project.id,
        userId: user.id
      }
    })

    // Send milestone completion notification if status changed to COMPLETED
    if (status === 'COMPLETED' && milestone.status !== 'COMPLETED') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const milestoneUrl = `${baseUrl}/dashboard/projects/${milestone.project.id}?tab=milestones`

        // Get company info
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { appName: true }
        })
        const companyName = company?.appName || 'BuildFlow'

        // Notify project owner if different from person completing
        if (milestone.project.ownerId && milestone.project.ownerId !== user.id) {
          const owner = await prisma.user.findUnique({
            where: { id: milestone.project.ownerId },
            include: {
              notificationPreference: true
            }
          })

          if (owner) {
            const prefs = owner.notificationPreference

            // Create notification
            const notification = await prisma.notification.create({
              data: {
                type: 'MILESTONE_COMPLETED',
                title: `Milestone Completed: ${updatedMilestone.title}`,
                message: `Milestone "${updatedMilestone.title}" in ${milestone.project.title} has been completed.`,
                userId: owner.id,
                channel: prefs?.emailEnabled ? 'EMAIL' : 'IN_APP',
                metadata: JSON.stringify({
                  milestoneId,
                  projectId: milestone.project.id
                })
              }
            })

            // Send email if enabled
            if (prefs?.emailEnabled ?? true) {
              const emailService = await getEmailService(user.companyId)

              if (emailService.isConfigured()) {
                const emailTemplate = milestoneTemplate({
                  recipientName: owner.firstName,
                  milestoneName: updatedMilestone.title,
                  projectName: milestone.project.title,
                  status: 'completed',
                  milestoneUrl,
                  companyName
                })

                const emailResult = await emailService.send({
                  to: owner.email,
                  subject: emailTemplate.subject,
                  html: emailTemplate.html,
                  text: emailTemplate.text
                })

                if (emailResult.success) {
                  await prisma.notification.update({
                    where: { id: notification.id },
                    data: { emailSentAt: new Date() }
                  })
                }
              }
            }

            // Send SMS if enabled
            if (prefs?.smsEnabled && prefs?.smsMilestoneReached) {
              const smsService = await getSMSService(user.companyId)

              if (smsService.isConfigured()) {
                const phoneNumber = prefs.smsPhoneNumber || owner.phone

                if (phoneNumber) {
                  const smsMessage = milestoneCompletedSMS({
                    companyName,
                    milestoneTitle: updatedMilestone.title,
                    projectName: milestone.project.title
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
                  }
                }
              }
            }
          }
        }

        // Notify vendor if milestone has a vendor assigned
        if (milestone.vendor?.email) {
          const vendorPrefs = await prisma.vendorNotificationPreference.findUnique({
            where: { vendorId: milestone.vendor.id }
          })

          const vendorMilestoneUrl = `${baseUrl}/vendor/dashboard`

          const notification = await prisma.notification.create({
            data: {
              type: 'MILESTONE_COMPLETED',
              title: `Milestone Completed: ${updatedMilestone.title}`,
              message: `Milestone "${updatedMilestone.title}" in ${milestone.project.title} has been marked as completed.`,
              vendorId: milestone.vendor.id,
              channel: 'EMAIL',
              metadata: JSON.stringify({
                milestoneId,
                projectId: milestone.project.id
              })
            }
          })

          if (vendorPrefs?.emailEnabled ?? true) {
            const emailService = await getEmailService(user.companyId)

            if (emailService.isConfigured()) {
              const emailTemplate = milestoneTemplate({
                recipientName: milestone.vendor.companyName || milestone.vendor.name,
                milestoneName: updatedMilestone.title,
                projectName: milestone.project.title,
                status: 'completed',
                milestoneUrl: vendorMilestoneUrl,
                companyName
              })

              const emailResult = await emailService.send({
                to: milestone.vendor.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text
              })

              if (emailResult.success) {
                await prisma.notification.update({
                  where: { id: notification.id },
                  data: { emailSentAt: new Date() }
                })
              }
            }
          }

          // Send SMS to vendor if enabled
          if (vendorPrefs?.smsEnabled && vendorPrefs?.milestoneUpdate) {
            const smsService = await getSMSService(user.companyId)

            if (smsService.isConfigured()) {
              const phoneNumber = vendorPrefs.smsPhoneNumber || milestone.vendor.phone

              if (phoneNumber) {
                const smsMessage = milestoneCompletedSMS({
                  companyName,
                  milestoneTitle: updatedMilestone.title,
                  projectName: milestone.project.title
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
                }
              }
            }
          }
        }
      } catch (notificationError) {
        console.error('Error sending milestone completion notification:', notificationError)
      }
    }

    return NextResponse.json(updatedMilestone)

  } catch (error) {
    console.error('Error updating milestone:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: milestoneId } = await params

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    await prisma.projectMilestone.delete({
      where: { id: milestoneId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'milestone_deleted',
        description: `Deleted milestone: ${milestone.title}`,
        cardId: milestone.project.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
