import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    const workOrder = await prisma.workOrder.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    const body = await request.json()
    const { issueId } = body

    if (!issueId) {
      return NextResponse.json({ error: 'issueId is required' }, { status: 400 })
    }

    const issue = await prisma.assetIssue.findFirst({
      where: { id: issueId, asset: { companyId: user.companyId } }
    })

    if (!issue) {
      return NextResponse.json({ error: 'Issue not found' }, { status: 404 })
    }

    const existingLink = await prisma.workOrderIssue.findUnique({
      where: { workOrderId_issueId: { workOrderId: id, issueId } }
    })

    if (existingLink) {
      return NextResponse.json({ error: 'Issue is already on this work order' }, { status: 409 })
    }

    await prisma.workOrderIssue.create({
      data: { workOrderId: id, issueId }
    })

    if (issue.status === 'OPEN') {
      await prisma.assetIssue.update({ where: { id: issueId }, data: { status: 'IN_PROGRESS' } })
    }

    return NextResponse.json({ success: true }, { status: 201 })
  } catch (error) {
    console.error('Error linking issue to work order:', error)
    return NextResponse.json({ error: 'Failed to link issue' }, { status: 500 })
  }
}

export async function DELETE(
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
    const issueId = searchParams.get('issueId')

    if (!issueId) {
      return NextResponse.json({ error: 'issueId query param is required' }, { status: 400 })
    }

    const workOrder = await prisma.workOrder.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!workOrder) {
      return NextResponse.json({ error: 'Work order not found' }, { status: 404 })
    }

    await prisma.workOrderIssue.deleteMany({
      where: { workOrderId: id, issueId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking issue from work order:', error)
    return NextResponse.json({ error: 'Failed to unlink issue' }, { status: 500 })
  }
}
