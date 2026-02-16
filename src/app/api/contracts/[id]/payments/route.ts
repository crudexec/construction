import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getEmailService } from '@/lib/email'
import { paymentRecordedTemplate } from '@/lib/email/templates/notifications'
import { getSMSService } from '@/lib/sms'
import { paymentReceivedVendorSMS } from '@/lib/sms/templates/notifications'

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

    const { id: contractId } = await params
    const body = await request.json()
    const { amount, paymentDate, reference, notes } = body

    if (!amount || !paymentDate) {
      return NextResponse.json(
        { error: 'Amount and payment date are required' },
        { status: 400 }
      )
    }

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true
              }
            }
          },
          take: 1
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Create the payment
    const payment = await prisma.contractPayment.create({
      data: {
        contractId,
        amount: parseFloat(amount),
        paymentDate: new Date(paymentDate),
        reference: reference || undefined,
        notes: notes || undefined,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Send notification to vendor about the payment
    if (contract.vendor?.email) {
      try {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://localhost:3000'
        const paymentUrl = `${baseUrl}/vendor/contracts`

        // Get vendor notification preferences
        const vendorPrefs = await prisma.vendorNotificationPreference.findUnique({
          where: { vendorId: contract.vendor.id }
        })

        // Get company name
        const company = await prisma.company.findUnique({
          where: { id: user.companyId },
          select: { appName: true, currency: true }
        })

        const companyName = company?.appName || 'BuildFlow'
        const currency = company?.currency || 'USD'
        const vendorName = contract.vendor.companyName || contract.vendor.name

        // Create vendor notification
        const notification = await prisma.notification.create({
          data: {
            type: 'PAYMENT_RECORDED',
            title: `Payment Received: ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(payment.amount)}`,
            message: `A payment of ${new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(payment.amount)} has been recorded for your contract with ${companyName}.`,
            vendorId: contract.vendor.id,
            channel: 'EMAIL',
            metadata: JSON.stringify({
              contractId,
              paymentId: payment.id,
              amount: payment.amount
            })
          }
        })

        // Send email to vendor
        if (vendorPrefs?.emailEnabled ?? true) {
          const emailService = await getEmailService(user.companyId)

          if (emailService.isConfigured()) {
            const emailTemplate = paymentRecordedTemplate({
              recipientName: vendorName,
              paymentAmount: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(payment.amount),
              projectName: contract.projects?.[0]?.project?.title || `Contract ${contract.contractNumber}`,
              paymentType: 'Contract Payment',
              reference: payment.reference || undefined,
              paymentUrl,
              companyName
            })

            const emailResult = await emailService.send({
              to: contract.vendor.email,
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
        if (vendorPrefs?.smsEnabled && vendorPrefs?.paymentReceived) {
          const smsService = await getSMSService(user.companyId)

          if (smsService.isConfigured()) {
            const phoneNumber = vendorPrefs.smsPhoneNumber || contract.vendor.phone

            if (phoneNumber) {
              const smsMessage = paymentReceivedVendorSMS({
                companyName,
                amount: new Intl.NumberFormat('en-US', { style: 'currency', currency }).format(payment.amount)
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
        console.error('Error sending payment notification to vendor:', notificationError)
      }
    }

    return NextResponse.json(payment)

  } catch (error) {
    console.error('Error adding contract payment:', error)
    return NextResponse.json(
      { error: 'Failed to add payment' },
      { status: 500 }
    )
  }
}

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

    const { id: contractId } = await params

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Fetch all payments for this contract
    const payments = await prisma.contractPayment.findMany({
      where: {
        contractId
      },
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
    })

    return NextResponse.json(payments)

  } catch (error) {
    console.error('Error fetching contract payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
