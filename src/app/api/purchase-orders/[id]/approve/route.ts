import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { poApprovedTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { poApprovedSMS } from '@/lib/sms/templates/notifications'

// POST - Approve a purchase order
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Check if PO exists and belongs to company
    const existingPO = await prisma.purchaseOrder.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingPO) {
      return NextResponse.json({ error: 'Purchase order not found' }, { status: 404 })
    }

    // Only allow approving draft or pending approval orders
    if (!['DRAFT', 'PENDING_APPROVAL'].includes(existingPO.status)) {
      return NextResponse.json(
        { error: 'Purchase order cannot be approved in current status' },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedById: user.id,
        approvedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        },
        lineItems: {
          include: {
            item: {
              select: {
                id: true,
                name: true,
                unit: true,
                category: true
              }
            }
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Send notification to PO creator (if different from approver)
    if (purchaseOrder.createdBy && purchaseOrder.createdBy.id !== user.id) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const poUrl = `${baseUrl}/dashboard/purchase-orders/${id}`

        // Get creator with notification preferences
        const creator = await prisma.user.findUnique({
          where: { id: purchaseOrder.createdBy.id },
          include: {
            notificationPreference: true,
            company: {
              select: { appName: true }
            }
          }
        })

        if (creator) {
          const prefs = creator.notificationPreference
          const companyName = creator.company?.appName || 'BuildFlow'
          const vendorName = purchaseOrder.vendor?.companyName || purchaseOrder.vendor?.name || 'Vendor'

          // Create in-app notification
          const notification = await prisma.notification.create({
            data: {
              type: 'PO_APPROVED',
              title: `PO Approved: ${purchaseOrder.orderNumber}`,
              message: `Purchase order ${purchaseOrder.orderNumber} for ${vendorName} has been approved by ${user.firstName} ${user.lastName}.`,
              userId: creator.id,
              channel: prefs?.emailEnabled ? 'EMAIL' : 'IN_APP',
              metadata: JSON.stringify({
                purchaseOrderId: id,
                approvedBy: user.id
              })
            }
          })

          // Send email if enabled
          if (prefs?.emailEnabled ?? true) {
            const emailService = await getEmailService(user.companyId)

            if (emailService.isConfigured()) {
              const emailTemplate = poApprovedTemplate({
                recipientName: creator.firstName,
                poNumber: purchaseOrder.orderNumber,
                vendorName,
                totalAmount: purchaseOrder.total?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || 'N/A',
                approvedBy: `${user.firstName} ${user.lastName}`,
                poUrl,
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
              }
            }
          }

          // Send SMS if enabled
          if (prefs?.smsEnabled && prefs?.smsPurchaseOrder) {
            const smsService = await getSMSService(user.companyId)

            if (smsService.isConfigured()) {
              const phoneNumber = prefs.smsPhoneNumber || creator.phone

              if (phoneNumber) {
                const smsMessage = poApprovedSMS({
                  companyName,
                  poNumber: purchaseOrder.orderNumber,
                  vendorName
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
        console.error('Error sending PO approval notification:', notificationError)
      }
    }

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error approving purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to approve purchase order' },
      { status: 500 }
    )
  }
}
