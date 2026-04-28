import { NextRequest, NextResponse } from 'next/server'
import { LienReleaseStatus, LienReleaseType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const validTypes = new Set(Object.values(LienReleaseType))

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

    const { id: contractId } = await params

    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const lienReleases = await prisma.lienRelease.findMany({
      where: {
        contractId,
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
            createdAt: 'asc'
          },
          include: {
            actorUser: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            actorVendor: {
              select: {
                id: true,
                name: true,
                companyName: true
              }
            }
          }
        }
      },
      orderBy: [
        { updatedAt: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json(lienReleases)
  } catch (error) {
    console.error('Error fetching lien releases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lien releases' },
      { status: 500 }
    )
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

    const { id: contractId } = await params
    const body = await request.json()

    const {
      vendorId,
      projectId,
      type,
      title,
      amount,
      throughDate,
      effectiveDate,
      externalPaymentRef,
      externalSource,
      notes,
      requestVendorNow
    } = body

    if (!type || !validTypes.has(type)) {
      return NextResponse.json({ error: 'Valid lien release type is required' }, { status: 400 })
    }

    const contract = await prisma.vendorContract.findFirst({
      where: {
        id: contractId,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true
          }
        },
        projects: {
          select: {
            projectId: true
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const resolvedVendorId = vendorId || contract.vendor.id
    if (resolvedVendorId !== contract.vendor.id) {
      return NextResponse.json({ error: 'Vendor does not match contract' }, { status: 400 })
    }

    if (projectId) {
      const linkedProjectIds = new Set(contract.projects.map((project) => project.projectId))
      if (!linkedProjectIds.has(projectId)) {
        return NextResponse.json(
          { error: 'Project is not linked to this contract' },
          { status: 400 }
        )
      }
    }

    const initialStatus = requestVendorNow ? LienReleaseStatus.REQUESTED : LienReleaseStatus.DRAFT
    const now = new Date()

    const lienRelease = await prisma.lienRelease.create({
      data: {
        companyId: user.companyId,
        vendorId: resolvedVendorId,
        contractId,
        projectId: projectId || null,
        type,
        status: initialStatus,
        title: title || null,
        amount: amount !== undefined && amount !== null ? Number(amount) : null,
        throughDate: throughDate ? new Date(throughDate) : null,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        externalPaymentRef: externalPaymentRef || null,
        externalSource: externalSource || null,
        notes: notes || null,
        requestedAt: requestVendorNow ? now : null,
        requestedById: requestVendorNow ? user.id : null,
        events: {
          create: {
            actorUserId: user.id,
            eventType: requestVendorNow ? 'REQUESTED' : 'CREATED',
            message: requestVendorNow
              ? 'Lien release requested from vendor'
              : 'Lien release created in draft'
          }
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
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
        documents: true
      }
    })

    return NextResponse.json(lienRelease, { status: 201 })
  } catch (error) {
    console.error('Error creating lien release:', error)
    return NextResponse.json(
      { error: 'Failed to create lien release' },
      { status: 500 }
    )
  }
}
