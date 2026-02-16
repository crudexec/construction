'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET /api/company/sms-config - Get SMS configuration
export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can view SMS config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can access SMS configuration' }, { status: 403 })
    }

    const config = await prisma.sMSConfig.findUnique({
      where: { companyId: user.companyId },
      select: {
        id: true,
        provider: true,
        username: true,
        shortCode: true,
        isActive: true,
        lastTestedAt: true,
        testError: true,
        createdAt: true,
        updatedAt: true,
        // Don't return sensitive fields like apiKey
      },
    })

    return NextResponse.json({
      config: config || null,
      hasApiKey: config?.provider !== 'NONE' ? !!config : false,
    })
  } catch (error) {
    console.error('Error fetching SMS config:', error)
    return NextResponse.json({ error: 'Failed to fetch SMS config' }, { status: 500 })
  }
}

// PATCH /api/company/sms-config - Update SMS configuration
export async function PATCH(request: NextRequest) {
  try {
    const token = request.headers.get('Authorization')?.split(' ')[1]
    const user = await validateUser(token || '')
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only admins can update SMS config
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update SMS configuration' }, { status: 403 })
    }

    const body = await request.json()
    const {
      provider,
      apiKey,
      username,
      shortCode,
      isActive,
    } = body

    // Validate provider
    const validProviders = ['NONE', 'AFRICAS_TALKING']
    if (provider && !validProviders.includes(provider)) {
      return NextResponse.json({ error: 'Invalid SMS provider' }, { status: 400 })
    }

    // Validate required fields based on provider
    if (provider && provider !== 'NONE') {
      if (provider === 'AFRICAS_TALKING') {
        // Check if we're creating new or updating existing
        const existingConfig = await prisma.sMSConfig.findUnique({
          where: { companyId: user.companyId },
        })

        // For new configs or when explicitly setting these fields, they're required
        if (!existingConfig) {
          if (!username) {
            return NextResponse.json({ error: 'Africa\'s Talking username is required' }, { status: 400 })
          }
          if (!apiKey) {
            return NextResponse.json({ error: 'API key is required' }, { status: 400 })
          }
        }
      }
    }

    // Check if config exists
    const existingConfig = await prisma.sMSConfig.findUnique({
      where: { companyId: user.companyId },
    })

    const updateData: Record<string, unknown> = {}

    // Only update fields that are provided
    if (provider !== undefined) updateData.provider = provider
    if (username !== undefined) updateData.username = username
    if (shortCode !== undefined) updateData.shortCode = shortCode
    if (isActive !== undefined) updateData.isActive = isActive

    // Only update sensitive fields if explicitly provided (not empty string)
    if (apiKey !== undefined && apiKey !== '') {
      updateData.apiKey = apiKey
    }

    // Clear test results when config changes
    updateData.testError = null

    let config
    if (existingConfig) {
      config = await prisma.sMSConfig.update({
        where: { companyId: user.companyId },
        data: updateData,
        select: {
          id: true,
          provider: true,
          username: true,
          shortCode: true,
          isActive: true,
          lastTestedAt: true,
          testError: true,
          createdAt: true,
          updatedAt: true,
        },
      })
    } else {
      config = await prisma.sMSConfig.create({
        data: {
          companyId: user.companyId,
          provider: provider || 'NONE',
          apiKey: apiKey || null,
          username: username || null,
          shortCode: shortCode || null,
          isActive: isActive ?? false,
        },
        select: {
          id: true,
          provider: true,
          username: true,
          shortCode: true,
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
    console.error('Error updating SMS config:', error)
    return NextResponse.json({ error: 'Failed to update SMS config' }, { status: 500 })
  }
}
