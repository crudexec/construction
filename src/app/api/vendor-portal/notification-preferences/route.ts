'use server'

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

// GET /api/vendor-portal/notification-preferences - Get vendor notification preferences
export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get or create vendor notification preferences
    let preferences = await prisma.vendorNotificationPreference.findUnique({
      where: { vendorId: vendor.id }
    })

    if (!preferences) {
      preferences = await prisma.vendorNotificationPreference.create({
        data: {
          vendorId: vendor.id,
          emailEnabled: true,
          smsEnabled: false,
          taskAssigned: true,
          taskDueReminder: true,
          milestoneUpdate: true,
          contractChange: true,
          paymentReceived: true,
          purchaseOrderReceived: true,
          documentShared: true,
        }
      })
    }

    return NextResponse.json({
      preferences,
      // Include vendor's current phone for reference
      vendorPhone: vendor.phone,
    })
  } catch (error) {
    console.error('Error fetching vendor notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch notification preferences' },
      { status: 500 }
    )
  }
}

// PATCH /api/vendor-portal/notification-preferences - Update vendor notification preferences
export async function PATCH(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const updates = await request.json()

    // Validate phone number if provided
    if (updates.smsPhoneNumber !== undefined) {
      const phone = updates.smsPhoneNumber
      if (phone && typeof phone !== 'string') {
        return NextResponse.json({ error: 'Invalid phone number format' }, { status: 400 })
      }
    }

    const preferences = await prisma.vendorNotificationPreference.upsert({
      where: { vendorId: vendor.id },
      update: updates,
      create: {
        vendorId: vendor.id,
        ...updates
      }
    })

    return NextResponse.json({ preferences })
  } catch (error) {
    console.error('Error updating vendor notification preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update notification preferences' },
      { status: 500 }
    )
  }
}
