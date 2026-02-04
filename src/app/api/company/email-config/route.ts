'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { EmailService } from '@/lib/email'

// GET /api/company/email-config - Get email configuration
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view email config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access email configuration' }, { status: 403 })
    }

    const config = await prisma.emailConfig.findUnique({
      where: { companyId: user.companyId },
      select: {
        id: true,
        provider: true,
        fromEmail: true,
        fromName: true,
        smtpHost: true,
        smtpPort: true,
        smtpUser: true,
        smtpSecure: true,
        isActive: true,
        lastTestedAt: true,
        testError: true,
        createdAt: true,
        updatedAt: true,
        // Don't return sensitive fields like apiKey and smtpPassword
      },
    })

    return NextResponse.json({
      config: config || null,
      hasApiKey: config?.provider !== 'NONE' && config?.provider !== 'SMTP' ? true : false,
      hasSmtpPassword: config?.provider === 'SMTP' ? true : false,
    })
  } catch (error) {
    console.error('Error fetching email config:', error)
    return NextResponse.json({ error: 'Failed to fetch email config' }, { status: 500 })
  }
}

// PATCH /api/company/email-config - Update email configuration
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update email config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update email configuration' }, { status: 403 })
    }

    const body = await request.json()
    const {
      provider,
      apiKey,
      fromEmail,
      fromName,
      smtpHost,
      smtpPort,
      smtpUser,
      smtpPassword,
      smtpSecure,
      isActive,
    } = body

    // Validate provider
    const validProviders = ['NONE', 'SENDGRID', 'AWS_SES', 'SMTP', 'RESEND']
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Invalid email provider' }, { status: 400 })
    }

    // Validate required fields based on provider
    if (provider && provider !== 'NONE') {
      if (!fromEmail) {
        return NextResponse.json({ error: 'From email is required' }, { status: 400 })
      }

      if (provider === 'SMTP') {
        if (!smtpHost || !smtpPort) {
          return NextResponse.json({ error: 'SMTP host and port are required' }, { status: 400 })
        }
      }
    }

    // Check if config exists
    const existingConfig = await prisma.emailConfig.findUnique({
      where: { companyId: user.companyId },
    })

    const updateData: Record<string, unknown> = {}

    // Only update fields that are provided
    if (provider !== undefined) updateData.provider = provider
    if (fromEmail !== undefined) updateData.fromEmail = fromEmail
    if (fromName !== undefined) updateData.fromName = fromName
    if (smtpHost !== undefined) updateData.smtpHost = smtpHost
    if (smtpPort !== undefined) updateData.smtpPort = smtpPort
    if (smtpUser !== undefined) updateData.smtpUser = smtpUser
    if (smtpSecure !== undefined) updateData.smtpSecure = smtpSecure
    if (isActive !== undefined) updateData.isActive = isActive

    // Only update sensitive fields if explicitly provided (not empty string)
    if (apiKey !== undefined && apiKey !== '') {
      updateData.apiKey = apiKey
    }
    if (smtpPassword !== undefined && smtpPassword !== '') {
      updateData.smtpPassword = smtpPassword
    }

    // Clear test results when config changes
    updateData.testError = null

    let config
    if (existingConfig) {
      config = await prisma.emailConfig.update({
        where: { companyId: user.companyId },
        data: updateData,
        select: {
          id: true,
          provider: true,
          fromEmail: true,
          fromName: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpSecure: true,
          isActive: true,
          lastTestedAt: true,
          testError: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else {
      config = await prisma.emailConfig.create({
        data: {
          companyId: user.companyId,
          provider: provider || 'NONE',
          apiKey: apiKey || null,
          fromEmail: fromEmail || null,
          fromName: fromName || null,
          smtpHost: smtpHost || null,
          smtpPort: smtpPort || null,
          smtpUser: smtpUser || null,
          smtpPassword: smtpPassword || null,
          smtpSecure: smtpSecure ?? true,
          isActive: isActive ?? false,
        },
        select: {
          id: true,
          provider: true,
          fromEmail: true,
          fromName: true,
          smtpHost: true,
          smtpPort: true,
          smtpUser: true,
          smtpSecure: true,
          isActive: true,
          lastTestedAt: true,
          testError: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    }

    return NextResponse.json(config)
  } catch (error) {
    console.error('Error updating email config:', error)
    return NextResponse.json({ error: 'Failed to update email config' }, { status: 500 })
  }
}
