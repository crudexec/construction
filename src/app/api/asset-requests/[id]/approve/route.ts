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

    // Verify request exists and belongs to user's company
    const assetRequest = await prisma.assetRequest.findFirst({
      where: {
        id,
        asset: {
          companyId: user.companyId
        }
      },
      include: {
        asset: true,
        requester: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    if (!assetRequest) {
      return NextResponse.json({ error: 'Request not found' }, { status: 404 })
    }

    if (assetRequest.status !== 'PENDING') {
      return NextResponse.json(
        { error: `Request is already ${assetRequest.status.toLowerCase()}` },
        { status: 400 }
      )
    }

    // Check if asset is still available
    if (assetRequest.asset.status !== 'AVAILABLE') {
      return NextResponse.json(
        { error: `Asset is currently ${assetRequest.asset.status.toLowerCase().replace('_', ' ')}` },
        { status: 400 }
      )
    }

    // Update request status and asset
    const [updatedRequest] = await prisma.$transaction([
      prisma.assetRequest.update({
        where: { id },
        data: {
          status: 'APPROVED',
          approvedById: user.id,
          approvedAt: new Date()
        },
        include: {
          asset: true,
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
        }
      }),
      prisma.asset.update({
        where: { id: assetRequest.assetId },
        data: {
          status: 'IN_USE',
          currentAssigneeId: assetRequest.requesterId
        }
      })
    ])

    // Create notification for requester
    await prisma.notification.create({
      data: {
        type: 'asset_request_approved',
        title: 'Asset Request Approved',
        message: `Your request for "${assetRequest.asset.name}" has been approved by ${user.firstName} ${user.lastName}`,
        userId: assetRequest.requesterId,
        metadata: JSON.stringify({
          assetId: assetRequest.assetId,
          requestId: id
        })
      }
    })

    return NextResponse.json({
      message: 'Request approved successfully',
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error approving asset request:', error)
    return NextResponse.json(
      { error: 'Failed to approve request' },
      { status: 500 }
    )
  }
}
