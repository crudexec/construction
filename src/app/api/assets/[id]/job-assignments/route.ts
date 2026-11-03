import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { applyAssetContext, resolveLocation, lockAsset, AssetContextError } from '@/lib/assets/context'

 async function GETHandler(
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

    const assignments = await prisma.assetJobAssignment.findMany({
      where: { assetId: id },
      include: {
        yard: { select: { id: true, name: true } },
        project: {
          select: { id: true, title: true, status: true, projectNumber: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { assignedAt: 'desc' }
    })

    return NextResponse.json(assignments)

  } catch (error) {
    console.error('Error fetching job assignments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch job assignments' },
      { status: 500 }
    )
  }
}

 async function POSTHandler(
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
    const { projectId, yardId, assignedAt, removedAt, notes } = body

    if (!projectId && !yardId) {
      return NextResponse.json({ error: 'A job or yard is required' }, { status: 400 })
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

    if (!removedDate && assignedDate > new Date()) return NextResponse.json({ error: 'Current location date cannot be in the future' }, { status: 400 })
    const assignment = await prisma.$transaction(async tx => {
    await lockAsset(tx, id, user.companyId)
    const location = await resolveLocation(tx, user.companyId, projectId, yardId)
    if (!removedDate) {
      await applyAssetContext(tx, id, user, location, assignedDate)
      const current = await tx.assetJobAssignment.findFirst({ where: { assetId: id, removedAt: null }, orderBy: { assignedAt: 'desc' } })
      if (current) return tx.assetJobAssignment.update({ where: { id: current.id }, data: { notes: notes || null }, include: { project: true, yard: true, createdBy: { select: { id: true, firstName: true, lastName: true } } } })
    }
    return tx.assetJobAssignment.create({
      data: {
        assetId: id,
        projectId: location.currentProjectId,
        yardId: location.currentYardId,
        locationName: location.currentLocation,
        assignedAt: assignedDate,
        removedAt: removedDate,
        notes: notes || null,
        createdById: user.id
      },
      include: {
        yard: { select: { id: true, name: true } },
        project: {
          select: { id: true, title: true, status: true, projectNumber: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })
    })

    return NextResponse.json(assignment, { status: 201 })

  } catch (error) {
    if (error instanceof AssetContextError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error creating job assignment:', error)
    return NextResponse.json(
      { error: 'Failed to create job assignment' },
      { status: 500 }
    )
  }
}


export const GET = auditedRoute('/api/assets/[id]/job-assignments', 'GET', GETHandler)
export const POST = auditedRoute('/api/assets/[id]/job-assignments', 'POST', POSTHandler)
