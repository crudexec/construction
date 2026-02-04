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

    if (assetRequest.status !== 'APPROVED') {
      return NextResponse.json(
        { error: 'Only approved requests can be marked as returned' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { condition, notes } = body

    // Update request status and asset
    const [updatedRequest] = await prisma.$transaction([
      prisma.assetRequest.update({
        where: { id },
        data: {
          status: 'RETURNED',
          returnedAt: new Date(),
          notes: notes || assetRequest.notes
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
          status: condition === 'DAMAGED' ? 'LOST_DAMAGED' : 'AVAILABLE',
          currentAssigneeId: null,
          currentLocation: body.location || assetRequest.asset.currentLocation
        }
      })
    ])

    // If asset was returned damaged, create notification for admins
    if (condition === 'DAMAGED') {
      const admins = await prisma.user.findMany({
        where: {
          companyId: user.companyId,
          role: 'ADMIN'
        },
        select: { id: true }
      })

      for (const admin of admins) {
        await prisma.notification.create({
          data: {
            type: 'asset_damaged',
            title: 'Asset Returned Damaged',
            message: `Asset "${assetRequest.asset.name}" was returned by ${assetRequest.requester.firstName} ${assetRequest.requester.lastName} in damaged condition${notes ? `: ${notes}` : ''}`,
            userId: admin.id,
            metadata: JSON.stringify({
              assetId: assetRequest.assetId,
              requestId: id,
              returnedBy: assetRequest.requesterId
            })
          }
        })
      }
    }

    return NextResponse.json({
      message: 'Asset returned successfully',
      request: updatedRequest
    })

  } catch (error) {
    console.error('Error returning asset:', error)
    return NextResponse.json(
      { error: 'Failed to return asset' },
      { status: 500 }
    )
  }
}
