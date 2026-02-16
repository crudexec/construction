import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { poSentToVendorTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { poSentToVendorSMS } from '@/lib/sms/templates/notifications'

// POST - Mark purchase order as sent to vendor
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

    // Only allow sending approved orders
    if (existingPO.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Purchase order must be approved before sending' },
        { status: 400 }
      )
    }

    const purchaseOrder = await prisma.purchaseOrder.update({
      where: { id },
      data: {
        status: 'SENT',
        sentAt: new Date()
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

    // Send notification to vendor
    if (purchaseOrder.vendor?.email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const poUrl = `${baseUrl}/vendor/purchase-orders/${id}` // Vendor portal URL

        // Get vendor notification preferences
        const vendorPrefs = await prisma.vendorNotificationPreference.findUnique({
          where: { vendorId: purchaseOrder.vendor.id }
        })

        // Get company name
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { appName: true }
        })

        const companyName = company?.appName || 'BuildFlow'
        const vendorName = purchaseOrder.vendor.companyName || purchaseOrder.vendor.name

        // Create vendor notification
        const notification = await prisma.notification.create({
          data: {
            type: 'PO_SENT_TO_VENDOR',
            title: `New Purchase Order: ${purchaseOrder.orderNumber}`,
            message: `You have received a new purchase order (${purchaseOrder.orderNumber}) from ${companyName}.`,
            vendorId: purchaseOrder.vendor.id,
            channel: 'EMAIL',
            metadata: JSON.stringify({
              purchaseOrderId: id,
              sentBy: user.id
            })
          }
        })

        // Send email to vendor
        if (vendorPrefs?.emailEnabled ?? true) {
          const emailService = await getEmailService(user.companyId)

          if (emailService.isConfigured()) {
            const itemNames = purchaseOrder.lineItems.map(li =>
              `${li.item?.name || 'Item'} x ${li.quantity}`
            )

            const emailTemplate = poSentToVendorTemplate({
              recipientName: vendorName,
              poNumber: purchaseOrder.orderNumber,
              projectName: purchaseOrder.project?.title || 'Project',
              totalAmount: purchaseOrder.total?.toLocaleString('en-US', { style: 'currency', currency: 'USD' }) || 'N/A',
              items: itemNames,
              poUrl,
              companyName
            })

            const emailResult = await emailService.send({
              to: purchaseOrder.vendor.email,
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

        // Send SMS to vendor if enabled
        if (vendorPrefs?.smsEnabled && vendorPrefs?.purchaseOrderReceived) {
          const smsService = await getSMSService(user.companyId)

          if (smsService.isConfigured()) {
            // Get vendor phone from preferences or vendor record
            const vendor = await prisma.vendor.findUnique({
              where: { id: purchaseOrder.vendor.id },
              select: { phone: true }
            })

            const phoneNumber = vendorPrefs.smsPhoneNumber || vendor?.phone

            if (phoneNumber) {
              const smsMessage = poSentToVendorSMS({
                companyName,
                poNumber: purchaseOrder.orderNumber
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
      } catch (notificationError) {
        console.error('Error sending PO notification to vendor:', notificationError)
      }
    }

    return NextResponse.json(purchaseOrder)

  } catch (error) {
    console.error('Error sending purchase order:', error)
    return NextResponse.json(
      { error: 'Failed to send purchase order' },
      { status: 500 }
    )
  }
}
