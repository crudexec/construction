import { NextRequest, NextResponse } from 'next/server'
import { LienReleaseStatus, LienReleaseType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const validTypes = new Set(Object.values(LienReleaseType))
const validStatuses = new Set(Object.values(LienReleaseStatus))

function buildStatusTimestamps(status: LienReleaseStatus, userId: string) {
  const now = new Date()

  switch (status) {
    case LienReleaseStatus.REQUESTED:
      return {
        requestedAt: now,
        requestedById: userId,
        rejectionReason: null
      }
    case LienReleaseStatus.UNDER_REVIEW:
      return {
        reviewedAt: now,
        reviewedById: userId
      }
    case LienReleaseStatus.APPROVED:
      return {
        approvedAt: now,
        approvedById: userId,
        reviewedAt: now,
        reviewedById: userId,
        rejectionReason: null
      }
    case LienReleaseStatus.REJECTED:
      return {
        rejectedAt: now
      }
    case LienReleaseStatus.DRAFT:
    case LienReleaseStatus.SUBMITTED:
    case LienReleaseStatus.VOID:
    default:
      return {}
  }
}

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

    const lienRelease = await prisma.lienRelease.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        events: {
          orderBy: {
            createdAt: 'desc'
          }
        }
      }
    })

    if (!lienRelease) {
      return NextResponse.json({ error: 'Lien release not found' }, { status: 404 })
    }

    return NextResponse.json(lienRelease)
  } catch (error) {
    console.error('Error fetching lien release:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lien release' },
      { status: 500 }
    )
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
    const body = await request.json()

    const existing = await prisma.lienRelease.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        contract: {
          include: {
            projects: {
              select: {
                projectId: true
              }
            }
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lien release not found' }, { status: 404 })
    }

    const {
      type,
      status,
      title,
      amount,
      throughDate,
      effectiveDate,
      externalPaymentRef,
      externalSource,
      projectId,
      rejectionReason,
      notes
    } = body

    if (type && !validTypes.has(type)) {
      return NextResponse.json({ error: 'Invalid lien release type' }, { status: 400 })
    }

    if (status && !validStatuses.has(status)) {
      return NextResponse.json({ error: 'Invalid lien release status' }, { status: 400 })
    }

    if (projectId) {
      const linkedProjectIds = new Set(
        existing.contract?.projects.map((project: { projectId: string }) => project.projectId) || []
      )
      if (!linkedProjectIds.has(projectId)) {
        return NextResponse.json(
          { error: 'Project is not linked to this contract' },
          { status: 400 }
        )
      }
    }

    if (status === LienReleaseStatus.REJECTED && !rejectionReason) {
      return NextResponse.json(
        { error: 'Rejection reason is required when rejecting a lien release' },
        { status: 400 }
      )
    }

    const statusTimestamps = status ? buildStatusTimestamps(status, user.id) : {}
    const nextStatus = status || existing.status

    const lienRelease = await prisma.lienRelease.update({
      where: {
        id: existing.id
      },
      data: {
        ...(type && { type }),
        ...(status && { status }),
        ...(title !== undefined && { title: title || null }),
        ...(amount !== undefined && { amount: amount !== null ? Number(amount) : null }),
        ...(throughDate !== undefined && { throughDate: throughDate ? new Date(throughDate) : null }),
        ...(effectiveDate !== undefined && { effectiveDate: effectiveDate ? new Date(effectiveDate) : null }),
        ...(externalPaymentRef !== undefined && { externalPaymentRef: externalPaymentRef || null }),
        ...(externalSource !== undefined && { externalSource: externalSource || null }),
        ...(projectId !== undefined && { projectId: projectId || null }),
        ...(notes !== undefined && { notes: notes || null }),
        ...(rejectionReason !== undefined && { rejectionReason: rejectionReason || null }),
        ...statusTimestamps,
        events: status ? {
          create: {
            actorUserId: user.id,
            eventType: nextStatus,
            message: `Lien release marked as ${nextStatus.toLowerCase().replace(/_/g, ' ')}`,
            metadata: rejectionReason ? JSON.stringify({ rejectionReason }) : null
          }
        } : undefined
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
            status: true
          }
        },
        project: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        requestedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        reviewedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        events: {
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        }
      }
    })

    return NextResponse.json(lienRelease)
  } catch (error) {
    console.error('Error updating lien release:', error)
    return NextResponse.json(
      { error: 'Failed to update lien release' },
      { status: 500 }
    )
  }
}
