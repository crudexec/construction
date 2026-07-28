import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// PATCH - Remove an asset from a job (sets removedAt)
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

    const existing = await prisma.assetJobAssignment.findFirst({
      where: {
        id,
        asset: { companyId: user.companyId }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Job assignment not found' }, { status: 404 })
    }

    if (existing.removedAt) {
      return NextResponse.json({ error: 'This assignment has already been removed' }, { status: 400 })
    }

    const assignment = await prisma.assetJobAssignment.update({
      where: { id },
      data: { removedAt: new Date() },
      include: {
        project: {
          select: { id: true, title: true, status: true, projectNumber: true }
        },
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json(assignment)

  } catch (error) {
    console.error('Error removing job assignment:', error)
    return NextResponse.json(
      { error: 'Failed to remove job assignment' },
      { status: 500 }
    )
  }
}
