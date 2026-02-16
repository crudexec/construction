'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { NotificationChannel } from '@prisma/client'
import { getEmailService } from '@/lib/email'
import { taskDueReminderTemplate } from '@/lib/email/templates/notifications'
import { getSMSService, isWithinQuietHours } from '@/lib/sms'
import { taskDueReminderSMS } from '@/lib/sms/templates/notifications'

// GET /api/cron/due-date-notifications - Send due date reminder notifications
// This should be called by a cron job daily (e.g., Vercel cron at 8am)
export async function GET(request: NextRequest) {
  try {
    // Verify cron secret for security
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // Get all companies with email configured
    const companies = await prisma.company.findMany({
      where: {
        emailConfig: {
          isActive: true,
          provider: { not: 'NONE' },
        },
      },
      select: {
        id: true,
        appName: true,
      },
    })

    const results: {
      companyId: string
      notificationsSent: number
      emailsSent: number
      smsSent: number
      errors: string[]
    }[] = []

    for (const company of companies) {
      const companyResult = {
        companyId: company.id,
        notificationsSent: 0,
        emailsSent: 0,
        smsSent: 0,
        errors: [] as string[],
      }

      try {
        const emailService = await getEmailService(company.id)
        const smsService = await getSMSService(company.id)

        // Find tasks due in 2 days, 1 day, today, or overdue
        const twoDaysFromNow = new Date(today)
        twoDaysFromNow.setDate(twoDaysFromNow.getDate() + 2)

        const oneDayFromNow = new Date(today)
        oneDayFromNow.setDate(oneDayFromNow.getDate() + 1)

        const tasks = await prisma.task.findMany({
          where: {
            card: {
              companyId: company.id,
              status: { not: 'ARCHIVED' },
            },
            status: { notIn: ['COMPLETED', 'CANCELLED'] },
            dueDate: { lte: twoDaysFromNow },
            assigneeId: { not: null },
          },
          include: {
            assignee: {
              include: {
                notificationPreference: true,
              },
            },
            card: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        })

        for (const task of tasks) {
          if (!task.assignee || !task.dueDate) continue

          const dueDate = new Date(task.dueDate)
          dueDate.setHours(0, 0, 0, 0)

          const daysUntilDue = Math.floor((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

          // Determine if we should send notification based on preferences
          const prefs = task.assignee.notificationPreference
          let shouldNotify = false

          if (daysUntilDue < 0) {
            // Overdue - send if overdueReminderDaily is enabled
            shouldNotify = prefs?.overdueReminderDaily ?? true
          } else if (daysUntilDue === 0) {
            // Due today - always notify (one day reminder)
            shouldNotify = prefs?.dueDateReminder1Day ?? true
          } else if (daysUntilDue === 1) {
            // Due tomorrow - check 1 day reminder preference
            shouldNotify = prefs?.dueDateReminder1Day ?? true
          } else if (daysUntilDue === 2) {
            // Due in 2 days - check 2 day reminder preference
            shouldNotify = prefs?.dueDateReminder2Day ?? true
          }

          if (!shouldNotify) continue

          // Check if we've already sent a notification for this task today
          const existingNotification = await prisma.notification.findFirst({
            where: {
              userId: task.assigneeId!,
              type: 'TASK_DUE_REMINDER',
              createdAt: { gte: today },
              metadata: { contains: task.id },
            },
          })

          if (existingNotification) continue

          // Create in-app notification
          const notificationData = {
            type: 'TASK_DUE_REMINDER',
            title: daysUntilDue < 0
              ? `Task Overdue: ${task.title}`
              : daysUntilDue === 0
              ? `Task Due Today: ${task.title}`
              : `Task Due Soon: ${task.title}`,
            message: daysUntilDue < 0
              ? `"${task.title}" in ${task.card.title} is ${Math.abs(daysUntilDue)} day(s) overdue.`
              : daysUntilDue === 0
              ? `"${task.title}" in ${task.card.title} is due today.`
              : `"${task.title}" in ${task.card.title} is due in ${daysUntilDue} day(s).`,
            userId: task.assigneeId!,
            channel: prefs?.emailEnabled ? NotificationChannel.EMAIL : NotificationChannel.IN_APP,
            metadata: JSON.stringify({
              taskId: task.id,
              projectId: task.cardId,
              daysUntilDue,
            }),
          }

          // Create notification
          const notification = await prisma.notification.create({
            data: notificationData,
          })

          companyResult.notificationsSent++

          // Send email if enabled
          if ((prefs?.emailEnabled ?? true) && emailService.isConfigured()) {
            try {
              const taskUrl = `${baseUrl}/dashboard/projects/${task.cardId}?task=${task.id}`

              const emailTemplate = taskDueReminderTemplate({
                recipientName: task.assignee.firstName,
                taskTitle: task.title,
                projectName: task.card.title,
                dueDate: dueDate.toLocaleDateString('en-US', {
                  weekday: 'long',
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric',
                }),
                daysUntilDue,
                taskUrl,
                companyName: company.appName,
              })

              const emailResult = await emailService.send({
                to: task.assignee.email,
                subject: emailTemplate.subject,
                html: emailTemplate.html,
                text: emailTemplate.text,
              })

              if (emailResult.success) {
                companyResult.emailsSent++

                await prisma.notification.update({
                  where: { id: notification.id },
                  data: {
                    emailSentAt: new Date(),
                  },
                })
              } else {
                await prisma.notification.update({
                  where: { id: notification.id },
                  data: {
                    emailError: emailResult.error,
                  },
                })
                companyResult.errors.push(`Failed to email ${task.assignee.email}: ${emailResult.error}`)
              }
            } catch (emailError) {
              companyResult.errors.push(`Email error for ${task.assignee.email}: ${emailError}`)
            }
          }

          // Send SMS if enabled and configured
          const shouldSendSMS = (prefs?.smsEnabled ?? false) &&
            (prefs?.smsDueDateReminder ?? false) &&
            smsService.isConfigured()

          if (shouldSendSMS) {
            // Check quiet hours
            const isQuiet = isWithinQuietHours(
              prefs?.smsQuietHoursStart ?? null,
              prefs?.smsQuietHoursEnd ?? null
            )

            if (!isQuiet) {
              try {
                // Get phone number from preferences or user profile
                const phoneNumber = prefs?.smsPhoneNumber || task.assignee.phone

                if (phoneNumber) {
                  const smsMessage = taskDueReminderSMS({
                    companyName: company.appName,
                    taskTitle: task.title,
                    projectName: task.card.title,
                    daysUntilDue,
                  })

                  const smsResult = await smsService.send({
                    to: phoneNumber,
                    message: smsMessage,
                  })

                  if (smsResult.success) {
                    companyResult.smsSent++

                    await prisma.notification.update({
                      where: { id: notification.id },
                      data: {
                        smsSentAt: new Date(),
                        smsMessageId: smsResult.messageId,
                      },
                    })
                  } else {
                    await prisma.notification.update({
                      where: { id: notification.id },
                      data: {
                        smsError: smsResult.error,
                      },
                    })
                    companyResult.errors.push(`Failed to SMS ${phoneNumber}: ${smsResult.error}`)
                  }
                }
              } catch (smsError) {
                companyResult.errors.push(`SMS error: ${smsError}`)
              }
            }
          }
        }
      } catch (companyError) {
        companyResult.errors.push(`Company error: ${companyError}`)
      }

      results.push(companyResult)
    }

    return NextResponse.json({
      success: true,
      companiesProcessed: companies.length,
      results,
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error('Error sending due date notifications:', error)
    return NextResponse.json({ error: 'Failed to process notifications' }, { status: 500 })
  }
}
