import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { applyAssetContext, lockAsset, AssetContextError } from '@/lib/assets/context'

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

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const assignments = await prisma.assetPersonAssignment.findMany({
      where: { assetId: id },
      include: {
        assignee: {
          select: { id: true, firstName: true, lastName: true, email: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    })

    return NextResponse.json(assignments)
  } catch (error) {
    console.error('Error fetching person assignments:', error)
    return NextResponse.json({ error: 'Failed to fetch person assignments' }, { status: 500 })
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
    const { assigneeId, assignedAt, removedAt, notes } = body

    if (!assigneeId) {
      return NextResponse.json({ error: 'assigneeId is required' }, { status: 400 })
    }

    const assignee = await prisma.user.findFirst({
      where: { id: assigneeId, companyId: user.companyId, isActive: true }
    })

    if (!assignee) {
      return NextResponse.json({ error: 'Assignee not found' }, { status: 404 })
    }

    const assignedDate = assignedAt ? new Date(assignedAt) : new Date()
    const removedDate = removedAt ? new Date(removedAt) : null

    if (Number.isNaN(assignedDate.getTime())) {
      return NextResponse.json({ error: 'Valid assigned date is required' }, { status: 400 })
    }

    if (removedDate && Number.isNaN(removedDate.getTime())) {
      return NextResponse.json({ error: 'Valid removed date is required' }, { status: 400 })
    }

    if (removedDate && removedDate < assignedDate) {
      return NextResponse.json({ error: 'Removed date cannot be before assigned date' }, { status: 400 })
    }

    if (!removedDate && assignedDate > new Date()) return NextResponse.json({ error: 'Current assignment date cannot be in the future' }, { status: 400 })
    const assignment = await prisma.$transaction(async (tx) => {
      await lockAsset(tx, id, user.companyId)
      if (!removedDate) {
        await applyAssetContext(tx, id, user, { currentAssigneeId: assigneeId }, assignedDate)
        const current = await tx.assetPersonAssignment.findFirst({ where: { assetId: id, removedAt: null }, orderBy: { assignedAt: 'desc' } })
        if (current) return tx.assetPersonAssignment.update({ where: { id: current.id }, data: { notes: notes || null }, include: { assignee: { select: { id: true, firstName: true, lastName: true, email: true } }, createdBy: { select: { id: true, firstName: true, lastName: true } } } })
      }

      const created = await tx.assetPersonAssignment.create({
        data: {
          assetId: id,
          assigneeId,
          assignedAt: assignedDate,
          removedAt: removedDate,
          notes: notes || null,
          createdById: user.id
        },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      })

      return created
    })

    return NextResponse.json(assignment, { status: 201 })
  } catch (error) {
    if (error instanceof AssetContextError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating person assignment:', error)
    return NextResponse.json({ error: 'Failed to create person assignment' }, { status: 500 })
  }
}
