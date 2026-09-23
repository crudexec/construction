import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_STATUSES = ['OPEN', 'IN_PROGRESS', 'RESOLVED', 'CLOSED']
const VALID_URGENCIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

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

    const issue = await prisma.assetIssue.findFirst({
      where: { id, asset: { companyId: user.companyId } },
      include: {
        asset: { select: { id: true, name: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        meterReading: { select: { id: true, readingType: true, value: true, recordedAt: true } },
        comments: {
          where: { deletedAt: null },
          include: { author: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'asc' }
        },
        attachments: {
          include: { uploadedBy: { select: { id: true, firstName: true, lastName: true } } },
          orderBy: { createdAt: 'desc' }
        },
        workOrders: {
          include: {
            workOrder: { select: { id: true, title: true, status: true, scheduledDate: true } }
          }
        }
      }
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    return NextResponse.json(issue)
  } catch (error) {
    console.error('Error fetching asset issue:', error)
    return NextResponse.json({ error: 'Failed to fetch asset issue' }, { status: 500 })
  }
}

export async function PATCH(
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

    const existing = await prisma.assetIssue.findFirst({
      where: { id, asset: { companyId: user.companyId } }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const body = await request.json()
    const { title, description, status, urgency } = body

    if (status && !VALID_STATUSES.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    if (urgency && !VALID_URGENCIES.includes(urgency)) {
      return NextResponse.json({ error: 'Invalid urgency' }, { status: 400 })
    }

    const becomingResolved = status && ['RESOLVED', 'CLOSED'].includes(status) && !['RESOLVED', 'CLOSED'].includes(existing.status)
    const becomingReopened = status && !['RESOLVED', 'CLOSED'].includes(status) && ['RESOLVED', 'CLOSED'].includes(existing.status)

    const issue = await prisma.assetIssue.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(urgency !== undefined && { urgency }),
        ...(becomingResolved && { resolvedAt: new Date(), resolvedById: user.id }),
        ...(becomingReopened && { resolvedAt: null, resolvedById: null })
      },
      include: {
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        resolvedBy: { select: { id: true, firstName: true, lastName: true } },
        meterReading: { select: { id: true, readingType: true, value: true, recordedAt: true } }
      }
    })

    return NextResponse.json(issue)
  } catch (error) {
    console.error('Error updating asset issue:', error)
    return NextResponse.json({ error: 'Failed to update asset issue' }, { status: 500 })
  }
}
