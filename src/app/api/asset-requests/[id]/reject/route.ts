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

    const body = await request.json()
    const { reason } = body

    // Update request status
    const updatedRequest = await prisma.assetRequest.update({
      where: { id },
      data: {
        status: 'REJECTED',
        approvedById: user.id,
        approvedAt: new Date(),
        notes: reason ? `Rejected: ${reason}` : assetRequest.notes
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
    })

    // Create notification for requester
    await prisma.notification.create({
      data: {
        type: 'asset_request_rejected',
        title: 'Asset Request Rejected',
        message: `Your request for "${assetRequest.asset.name}" has been rejected${reason ? `: ${reason}` : ''}`,
        userId: assetRequest.requesterId,
        metadata: JSON.stringify({
          assetId: assetRequest.assetId,
          requestId: id,
          reason
        })
      }
    })

    return NextResponse.json({
      message: 'Request rejected',
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error rejecting asset request:', error)
    return NextResponse.json(
      { error: 'Failed to reject request' },
      { status: 500 }
    )
  }
}
