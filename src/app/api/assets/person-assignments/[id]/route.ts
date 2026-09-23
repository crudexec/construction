import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { applyAssetContext, lockAsset, AssetContextError } from '@/lib/assets/context'

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

    const existing = await prisma.assetPersonAssignment.findFirst({
      where: {
        id,
        asset: { companyId: user.companyId }
      },
      include: { asset: true }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Person assignment not found' }, { status: 404 })
    }

    if (existing.removedAt) {
      return NextResponse.json({ error: 'This assignment has already been removed' }, { status: 400 })
    }

    const assignment = await prisma.$transaction(async (tx) => {
      const asset = await lockAsset(tx, existing.assetId, user.companyId)
      const current = await tx.assetPersonAssignment.findUniqueOrThrow({ where: { id } })
      if (current.removedAt) throw new AssetContextError('This assignment is already closed')
      if (asset.currentAssigneeId === existing.assigneeId) await applyAssetContext(tx, asset.id, user, { currentAssigneeId: null })
      const updated = await tx.assetPersonAssignment.update({
        where: { id },
        data: { removedAt: new Date() },
        include: {
          assignee: {
            select: { id: true, firstName: true, lastName: true, email: true }
          },
          createdBy: {
            select: { id: true, firstName: true, lastName: true }
          }
        }
      })

      return updated
    })

    return NextResponse.json(assignment)
  } catch (error) {
    if (error instanceof AssetContextError) return NextResponse.json({ error: error.message }, { status: error.status })
    console.error('Error removing person assignment:', error)
    return NextResponse.json({ error: 'Failed to remove person assignment' }, { status: 500 })
  }
}
