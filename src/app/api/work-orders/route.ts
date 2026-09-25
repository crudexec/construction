import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')

    const whereClause: any = { companyId: user.companyId }
    if (status) {
      whereClause.status = status
    }

    const workOrders = await prisma.workOrder.findMany({
      where: whereClause,
      include: {
        asset: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        issues: {
          include: {
            issue: { select: { id: true, title: true, urgency: true, status: true, assetId: true, asset: { select: { id: true, name: true } } } }
          }
        },
        _count: { select: { comments: true, attachments: true } }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(workOrders)
  } catch (error) {
    console.error('Error fetching work orders:', error)
    return NextResponse.json({ error: 'Failed to fetch work orders' }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const {
      title, description, scheduledDate, estimatedDuration, actualDuration, estimatedCost, actualCost, assignedToId, issueIds
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (assignedToId) {
      const assignee = await prisma.user.findFirst({
        where: { id: assignedToId, companyId: user.companyId }
      })
      if (!assignee) {
        return NextResponse.json({ error: 'Assigned user not found' }, { status: 404 })
      }
    }

    let validIssueIds: string[] = []
    if (issueIds && issueIds.length > 0) {
      const issues = await prisma.assetIssue.findMany({
        where: { id: { in: issueIds }, asset: { companyId: user.companyId } },
        select: { id: true }
      })
      if (issues.length !== issueIds.length) {
        return NextResponse.json({ error: 'One or more issues not found' }, { status: 404 })
      }
      validIssueIds = issues.map(i => i.id)
    }

    const workOrder = await prisma.workOrder.create({
      data: {
        companyId: user.companyId,
        title,
        description: description || null,
        scheduledDate: scheduledDate ? new Date(scheduledDate) : null,
        estimatedDuration: estimatedDuration ?? null,
        actualDuration: actualDuration ?? null,
        estimatedCost: estimatedCost ?? null,
        actualCost: actualCost ?? null,
        assignedToId: assignedToId || null,
        createdById: user.id,
        issues: {
          create: validIssueIds.map(issueId => ({ issueId }))
        }
      },
      include: {
        assignedTo: { select: { id: true, firstName: true, lastName: true } },
        createdBy: { select: { id: true, firstName: true, lastName: true } },
        issues: {
          include: {
            issue: { select: { id: true, title: true, urgency: true, status: true, asset: { select: { id: true, name: true } } } }
          }
        }
      }
    })

    // Mark bundled issues as IN_PROGRESS if they were still OPEN
    if (validIssueIds.length > 0) {
      await prisma.assetIssue.updateMany({
        where: { id: { in: validIssueIds }, status: 'OPEN' },
        data: { status: 'IN_PROGRESS' }
      })
    }

    return NextResponse.json(workOrder, { status: 201 })
  } catch (error) {
    console.error('Error creating work order:', error)
    return NextResponse.json({ error: 'Failed to create work order' }, { status: 500 })
  }
}
