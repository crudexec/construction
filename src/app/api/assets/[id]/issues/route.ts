import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
const VALID_METER_TYPES = ['HOURS', 'MILES']
const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']

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

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const whereClause: any = { assetId: id }
    if (status) {
      whereClause.status = status
    }

    const issues = await prisma.assetIssue.findMany({
      where: whereClause,
      include: {
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        meterReading: { select: { id: true, readingType: true, value: true, recordedAt: true } },
        _count: { select: { comments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(issues)
  } catch (error) {
    console.error('Error fetching asset issues:', error)
    return NextResponse.json({ error: 'Failed to fetch asset issues' }, { status: 500 })
  }
}

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

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, status, urgency, meterReadingType, meterReadingValue } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (urgency && !VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
    }

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (meterReadingType && !VALID_METER_TYPES.includes(meterReadingType)) {
      return NextResponse.json({ error: 'Invalid meter reading type' }, { status: 400 })
    }

    if (meterReadingType && (meterReadingValue === undefined || meterReadingValue === null || meterReadingValue === '')) {
      return NextResponse.json({ error: 'Meter reading value is required when a reading type is provided' }, { status: 400 })
    }

    let meterReadingId: string | undefined
    if (meterReadingType) {
      const meterReading = await prisma.assetMeterReading.create({
        data: {
          assetId: id,
          readingType: meterReadingType,
          value: Number(meterReadingValue),
          recordedById: user.id,
          notes: 'Recorded automatically when issue was logged'
        }
      })
      meterReadingId = meterReading.id
    }

    const issue = await prisma.assetIssue.create({
      data: {
        assetId: id,
        title,
        description: description || null,
        status: status || 'OPEN',
        urgency: urgency || 'MEDIUM',
        meterReadingId,
        reportedById: user.id
      },
      include: {
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        meterReading: { select: { id: true, readingType: true, value: true, recordedAt: true } }
      }
    })

    const notificationSetting = await prisma.assetIssueNotificationSetting.upsert({
      where: { companyId: user.companyId },
      update: {},
      create: { companyId: user.companyId }
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
          companyId: user.companyId,
          isActive: true,
          OR: recipientFilters
        },
        select: { id: true }
      })

      for (const recipient of recipients) {
        if (recipient.id === user.id) continue
        await prisma.notification.create({
          data: {
            type: 'asset_issue',
            title: 'New Equipment Issue',
            message: `${user.firstName} ${user.lastName} reported an issue on "${asset.name}": ${title}`,
            userId: recipient.id,
            metadata: JSON.stringify({ assetId: id, issueId: issue.id })
          }
        })
      }
    }

    return NextResponse.json(issue, { status: 201 })
  } catch (error) {
    console.error('Error creating asset issue:', error)
    return NextResponse.json({ error: 'Failed to create asset issue' }, { status: 500 })
  }
}
