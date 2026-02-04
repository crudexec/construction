'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { EmailService } from '@/lib/email'

// POST /api/company/email-config/test - Test email configuration
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can test email config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can test email configuration' }, { status: 403 })
    }

    const config = await prisma.emailConfig.findUnique({
      where: { companyId: user.companyId },
    })

    if (!config) {
      return NextResponse.json({ error: 'Email configuration not found' }, { status: 404 })
    }

    if (config.provider === 'NONE') {
      return NextResponse.json({ error: 'Email provider is not configured' }, { status: 400 })
    }

    // Create email service instance
    const emailService = new EmailService({
      provider: config.provider,
      apiKey: config.apiKey,
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      smtpHost: config.smtpHost,
      smtpPort: config.smtpPort,
      smtpUser: config.smtpUser,
      smtpPassword: config.smtpPassword,
      smtpSecure: config.smtpSecure,
    })

    // Test connection
    const testResult = await emailService.testConnection()

    // Optionally send test email
    const body = await request.json().catch(() => ({}))
    const { sendTestEmail, testEmailAddress } = body

    let sendResult = null
    if (sendTestEmail && testEmailAddress) {
      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, appName: true },
      })

      sendResult = await emailService.send({
        to: testEmailAddress,
        subject: `Test Email from ${company?.appName || 'BuildFlo'}`,
        html: `
          <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
            <h1 style="color: #4f46e5;">Email Configuration Test</h1>
            <p>This is a test email from your ${company?.appName || 'BuildFlo'} system.</p>
            <p>If you received this email, your email configuration is working correctly!</p>
            <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;">
            <p style="color: #6b7280; font-size: 12px;">
              Provider: ${config.provider}<br>
              From: ${config.fromName ? `${config.fromName} <${config.fromEmail}>` : config.fromEmail}<br>
              Sent at: ${new Date().toISOString()}
            </p>
          </div>
        `,
        text: `This is a test email from your ${company?.appName || 'BuildFlo'} system. If you received this email, your email configuration is working correctly!`,
      })
    }

    // Update config with test results
    await prisma.emailConfig.update({
      where: { id: config.id },
      data: {
        lastTestedAt: new Date(),
        testError: testResult.success && (!sendResult || sendResult.success)
          ? null
          : testResult.error || sendResult?.error || 'Test failed',
      },
    })

    return NextResponse.json({
      connectionTest: testResult,
      ...(sendResult && { sendTest: sendResult }),
    })
  } catch (error) {
    console.error('Error testing email config:', error)
    return NextResponse.json({ error: 'Failed to test email config' }, { status: 500 })
  }
}
