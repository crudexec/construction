import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const whereClause: any = { assetId: id }
    if (status) {
      whereClause.status = status
    }

    const requests = await prisma.assetRequest.findMany({
      where: whereClause,
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        approvedBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(requests)

  } catch (error) {
    console.error('Error fetching asset requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset requests' },
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

    const { id } = await params

    // Verify asset exists and belongs to user's company
    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Check if asset is available
    if (asset.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: `Asset is currently ${asset.status.toLowerCase().replace('_', ' ')}` },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { purpose, projectId, startDate, endDate, notes } = body

    if (!purpose) {
      return NextResponse.json(
        { error: 'Purpose is required' },
        { status: 400 }
      )
    }

    // Verify project if provided
    if (projectId) {
      const project = await prisma.card.findFirst({
        where: {
          id: projectId,
          companyId: user.companyId
        }
      })

      if (!project) {
        return NextResponse.json(
          { error: 'Project not found' },
          { status: 404 }
        )
      }
    }

    const assetRequest = await prisma.assetRequest.create({
      data: {
        assetId: id,
        requesterId: user.id,
        purpose,
        projectId: projectId || null,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : undefined,
        notes: notes || null,
        status: 'PENDING'
      },
      include: {
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    // Create notification for admins
    const admins = await prisma.user.findMany({
      where: {
        companyId: user.companyId,
        role: 'ADMIN'
      },
      select: { id: true }
    })

    for (const admin of admins) {
      if (admin.id !== user.id) {
        await prisma.notification.create({
          data: {
            type: 'asset_request',
            title: 'New Asset Request',
            message: `${user.firstName} ${user.lastName} has requested "${asset.name}"`,
            userId: admin.id,
            metadata: JSON.stringify({
              assetId: id,
              requestId: assetRequest.id
            })
          }
        })
      }
    }

    return NextResponse.json(assetRequest, { status: 201 })

  } catch (error) {
    console.error('Error creating asset request:', error)
    return NextResponse.json(
      { error: 'Failed to create asset request' },
      { status: 500 }
    )
  }
}
