import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { taskCompletedTemplate, taskAssignedTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { taskCompletedSMS, taskAssignedSMS } from '@/lib/sms/templates/notifications'

// Get task details
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

    const { id: taskId } = await params

    const task = await prisma.task.findFirst({
      where: {
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        },
        category: {
          select: {
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        payments: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            paymentDate: 'desc'
          }
        },
        attachments: {
          include: {
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            uploadedByVendor: {
              select: {
                id: true,
                name: true,
                companyName: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    return NextResponse.json(task)

  } catch (error) {
    console.error('Failed to fetch task:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task' },
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

    const { id: taskId } = await params
    const body = await request.json()

    // Verify task exists and user has access (through project company)
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // If assigneeId is provided, verify the assignee exists and belongs to the same company
    if (body.assigneeId && body.assigneeId.trim() !== '') {
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assigneeId,
          companyId: user.companyId
        }
      })

      if (!assignee) {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }
    }

    // If milestoneId is provided, verify it exists and belongs to the same project
    if (body.milestoneId && body.milestoneId.trim() !== '') {
      const milestone = await prisma.projectMilestone.findFirst({
        where: {
          id: body.milestoneId,
          projectId: task.cardId
        }
      })

      if (!milestone) {
        return NextResponse.json({ error: 'Invalid milestone' }, { status: 400 })
      }
    }

    // If dependencyIds are provided, verify they exist and belong to the same project
    if (body.dependencyIds && Array.isArray(body.dependencyIds) && body.dependencyIds.length > 0) {
      // Filter out self-dependency
      const validDependencyIds = body.dependencyIds.filter((id: string) => id !== taskId)

      const dependencies = await prisma.task.findMany({
        where: {
          id: { in: validDependencyIds },
          cardId: task.cardId
        }
      })

      if (dependencies.length !== validDependencyIds.length) {
        return NextResponse.json({ error: 'One or more dependency tasks not found or invalid' }, { status: 400 })
      }
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: body.title,
        description: body.description,
        status: body.status,
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : undefined,
        categoryId: body.categoryId || null,
        milestoneId: body.milestoneId !== undefined ? (body.milestoneId || null) : undefined,
        assigneeId: body.assigneeId || null,
        completedAt: body.completedAt ? new Date(body.completedAt) : body.status === 'COMPLETED' ? new Date() : null,
        updatedAt: new Date(),
        // Budget fields
        ...(body.budgetAmount !== undefined && { budgetAmount: body.budgetAmount }),
        ...(body.approvedAmount !== undefined && { approvedAmount: body.approvedAmount }),
        // Vendor assignment
        ...(body.vendorId !== undefined && { vendorId: body.vendorId || null }),
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        }
        // dependsOn: {
        //   select: {
        //     id: true,
        //     title: true,
        //     status: true
        //   }
        // }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_updated',
        description: `Updated task: ${updatedTask.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    // Send task assignment notification if assignee changed
    if (body.assigneeId && body.assigneeId !== task.assigneeId && body.assigneeId !== user.id) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const taskUrl = `${baseUrl}/dashboard/projects/${task.cardId}?task=${task.id}`

        // Get the new assignee with notification preferences
        const newAssignee = await prisma.user.findUnique({
          where: { id: body.assigneeId },
          include: {
            notificationPreference: true,
            company: {
              select: { appName: true }
            }
          }
        })

        if (newAssignee) {
          const prefs = newAssignee.notificationPreference
          const companyName = newAssignee.company?.appName || 'BuildFlow'

          // Create in-app notification
          const notification = await prisma.notification.create({
            data: {
              type: 'TASK_ASSIGNED',
              title: `Task Assigned: ${updatedTask.title}`,
              message: `${user.firstName} ${user.lastName} assigned you a task "${updatedTask.title}" in ${task.card.title}.`,
              userId: newAssignee.id,
              channel: prefs?.emailEnabled ? 'EMAIL' : 'IN_APP',
              metadata: JSON.stringify({
                taskId: task.id,
                projectId: task.cardId,
                assignedBy: user.id
              })
            }
          })

          // Send email if enabled
          if (prefs?.emailTaskAssigned ?? true) {
            const emailService = await getEmailService(user.companyId)

            if (emailService.isConfigured()) {
              const emailTemplate = taskAssignedTemplate({
                recipientName: newAssignee.firstName,
                taskTitle: updatedTask.title,
                projectName: task.card.title,
                assignedBy: `${user.firstName} ${user.lastName}`,
                dueDate: updatedTask.dueDate ? new Date(updatedTask.dueDate).toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                }) : undefined,
                taskUrl,
                companyName
              })

              const emailResult = await emailService.send({
                to: newAssignee.email,
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
          if (prefs?.smsEnabled && prefs?.smsTaskAssigned) {
            const smsService = await getSMSService(user.companyId)

            if (smsService.isConfigured()) {
              const phoneNumber = prefs.smsPhoneNumber || newAssignee.phone

              if (phoneNumber) {
                const smsMessage = taskAssignedSMS({
                  companyName,
                  taskTitle: updatedTask.title,
                  projectName: task.card.title,
                  assignedBy: `${user.firstName} ${user.lastName}`
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
        console.error('Error sending task assignment notification:', notificationError)
      }
    }

    // Send task completion notification if status changed to COMPLETED
    if (body.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const taskUrl = `${baseUrl}/dashboard/projects/${task.cardId}?task=${task.id}`

        // Get the task creator and their notification preferences
        const creator = await prisma.user.findUnique({
          where: { id: task.creatorId },
          include: {
            notificationPreference: true,
            company: {
              select: {
                appName: true
              }
            }
          }
        })

        if (creator && creator.id !== user.id) {
          const prefs = creator.notificationPreference
          const companyName = creator.company?.appName || 'BuildFlow'

          // Create in-app notification
          const notification = await prisma.notification.create({
            data: {
              type: 'TASK_COMPLETED',
              title: `Task Completed: ${updatedTask.title}`,
              message: `"${updatedTask.title}" in ${task.card.title} has been marked as completed by ${user.firstName} ${user.lastName}.`,
              userId: creator.id,
              channel: prefs?.emailEnabled ? 'EMAIL' : 'IN_APP',
              metadata: JSON.stringify({
                taskId: task.id,
                projectId: task.cardId,
                completedBy: user.id
              })
            }
          })

          // Send email if enabled
          if (prefs?.emailEnabled ?? true) {
            const emailService = await getEmailService(user.companyId)

            if (emailService.isConfigured()) {
              const emailTemplate = taskCompletedTemplate({
                recipientName: creator.firstName,
                taskTitle: updatedTask.title,
                projectName: task.card.title,
                completedBy: `${user.firstName} ${user.lastName}`,
                taskUrl,
                companyName
              })

              const emailResult = await emailService.send({
                to: creator.email,
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
                console.error('Failed to send task completion email:', emailResult.error)
              }
            }
          }

          // Send SMS if enabled
          if (prefs?.smsEnabled && prefs?.smsTaskCompleted) {
            const smsService = await getSMSService(user.companyId)

            if (smsService.isConfigured()) {
              const phoneNumber = prefs.smsPhoneNumber || creator.phone

              if (phoneNumber) {
                const smsMessage = taskCompletedSMS({
                  companyName,
                  taskTitle: updatedTask.title,
                  projectName: task.card.title,
                  completedBy: `${user.firstName} ${user.lastName}`
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
                  console.error('Failed to send task completion SMS:', smsResult.error)
                }
              }
            }
          }
        }
      } catch (notificationError) {
        // Don't fail the request if notification sending fails
        console.error('Error sending task completion notification:', notificationError)
      }
    }

    return NextResponse.json(updatedTask)
  } catch (error) {
    console.error('Error updating task:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
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

    const { id: taskId } = await params

    // Verify task exists and user has access (through project company)
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId
      },
      include: {
        card: {
          select: {
            companyId: true,
            id: true,
            title: true
          }
        }
      }
    })

    if (!task || task.card.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: taskId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_deleted',
        description: `Deleted task: ${task.title}`,
        cardId: task.card.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting task:', error)
    return NextResponse.json(
      { error: 'Failed to delete task' },
      { status: 500 }
    )
  }
}