'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { SMSService, normalizePhoneNumber, isValidPhoneNumber } from '@/lib/sms'

// POST /api/company/sms-config/test - Test SMS configuration
export async function POST(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can test SMS config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can test SMS configuration' }, { status: 403 })
    }

    const config = await prisma.sMSConfig.findUnique({
      where: { companyId: user.companyId },
    })

    if (!config) {
      return NextResponse.json({ error: 'SMS configuration not found' }, { status: 404 })
    }

    if (config.provider === 'NONE') {
      return NextResponse.json({ error: 'SMS provider is not configured' }, { status: 400 })
    }

    // Create SMS service instance
    const smsService = new SMSService({
      provider: config.provider,
      apiKey: config.apiKey,
      username: config.username,
      shortCode: config.shortCode,
    })

    // Test connection
    const testResult = await smsService.testConnection()

    // Get balance if supported
    let balance = null
    if (testResult.success) {
      const balanceResult = await smsService.getBalance()
      if ('balance' in balanceResult) {
        balance = balanceResult
      }
    }

    // Optionally send test SMS
    const body = await request.json().catch(() => ({}))
    const { sendTestSMS, testPhoneNumber } = body

    let sendResult = null
    if (sendTestSMS && testPhoneNumber) {
      // Validate phone number
      if (!isValidPhoneNumber(testPhoneNumber)) {
        return NextResponse.json({
          connectionTest: testResult,
          balance,
          sendTest: {
            success: false,
            error: 'Invalid phone number format. Please use format: +2348012345678 or 08012345678',
          },
        })
      }

      const company = await prisma.company.findUnique({
        where: { id: user.companyId },
        select: { name: true, appName: true },
      })

      const normalizedPhone = normalizePhoneNumber(testPhoneNumber)
      const appName = company?.appName || 'BuildFlo'

      sendResult = await smsService.send({
        to: normalizedPhone,
        message: `[${appName}] This is a test SMS. Your SMS configuration is working correctly! Sent at: ${new Date().toLocaleTimeString()}`,
      })
    }

    // Update config with test results
    await prisma.sMSConfig.update({
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
      ...(balance && { balance }),
      ...(sendResult && { sendTest: sendResult }),
    })
  } catch (error) {
    console.error('Error testing SMS config:', error)
    return NextResponse.json({ error: 'Failed to test SMS config' }, { status: 500 })
  }
}
