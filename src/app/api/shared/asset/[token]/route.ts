import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { meterContext } from '@/lib/assets/context'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const asset = await prisma.asset.findFirst({
      where: { shareToken: token, isShareable: true },
      include: {
        company: { select: { name: true, logo: true } },
        issues: {
          orderBy: { createdAt: 'desc' },
          take: 50,
          select: {
            id: true,
            title: true,
            description: true,
            status: true,
            urgency: true,
            reporterName: true,
            createdAt: true,
            resolvedAt: true,
            meterReading: { select: { readingType: true, value: true, recordedAt: true } },
            reportedBy: { select: { firstName: true, lastName: true } }
          }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or sharing disabled' }, { status: 404 })
    }

    return NextResponse.json({
      asset: {
        id: asset.id,
        name: asset.name,
        make: asset.make,
        model: asset.model,
        year: asset.year,
        serialNumber: asset.serialNumber,
        status: asset.status
      },
      company: asset.company,
      issues: asset.issues
    })
  } catch (error) {
    console.error('Error fetching shared asset issue log:', error)
    return NextResponse.json({ error: 'Failed to fetch asset' }, { status: 500 })
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await params

    const asset = await prisma.asset.findFirst({
      where: { shareToken: token, isShareable: true }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found or sharing disabled' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, reporterName, urgency, meterReadingType, meterReadingValue } = body

    if (!title || !title.trim()) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (!meterReadingType || !['HOURS', 'MILES'].includes(meterReadingType)) {
      return NextResponse.json({ error: 'A valid meter reading type is required' }, { status: 400 })
    }

    if (meterReadingValue === undefined || meterReadingValue === null || meterReadingValue === '' || Number(meterReadingValue) < 0) {
      return NextResponse.json({ error: 'A non-negative meter reading value is required' }, { status: 400 })
    }

    const VALID_URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
    const issue = await prisma.$transaction(async (tx) => {
      const meterReading = await tx.assetMeterReading.create({
        data: {
          ...await meterContext(tx, asset.id, asset.companyId),
          assetId: asset.id,
          readingType: meterReadingType,
          value: Number(meterReadingValue),
          recordedById: null,
          notes: `Recorded from QR issue report${reporterName?.trim() ? ` by ${reporterName.trim()}` : ''}`
        }
      })

      return tx.assetIssue.create({
        data: {
          assetId: asset.id,
          title: title.trim(),
          description: description?.trim() || null,
          reporterName: reporterName?.trim() || 'Anonymous (QR report)',
          urgency: urgency && VALID_URGENCIES.includes(urgency) ? urgency : 'MEDIUM',
          meterReadingId: meterReading.id
        }
      })
    })

    const notificationSetting = await prisma.assetIssueNotificationSetting.upsert({
      where: { companyId: asset.companyId },
      update: {},
      create: { companyId: asset.companyId }
    })

    const recipientFilters = []
    if (notificationSetting.notifyAdmins) {
      recipientFilters.push({ role: 'ADMIN' as const })
    }
    if (notificationSetting.notifyStaff) {
      recipientFilters.push({ role: 'STAFF' as const })
    }
    if (notificationSetting.recipientUserIds.length > 0) {
      recipientFilters.push({ id: { in: notificationSetting.recipientUserIds } })
    }

    if (recipientFilters.length > 0) {
      const recipients = await prisma.user.findMany({
        where: {
          companyId: asset.companyId,
          isActive: true,
          OR: recipientFilters
        },
        select: { id: true }
      })

      for (const recipient of recipients) {
        await prisma.notification.create({
          data: {
            type: 'asset_issue',
            title: 'New Equipment Issue (QR report)',
            message: `${reporterName?.trim() || 'Someone'} reported an issue on "${asset.name}" via QR code: ${title}`,
            userId: recipient.id,
            metadata: JSON.stringify({ assetId: asset.id, issueId: issue.id })
          }
        })
      }
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error creating shared issue report:', error)
    return NextResponse.json({ error: 'Failed to submit issue' }, { status: 500 })
  }
}
