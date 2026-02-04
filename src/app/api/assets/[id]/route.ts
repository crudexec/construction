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

    const asset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        requests: {
          include: {
            requester: {
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
            project: {
              select: {
                id: true,
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          },
          take: 10
        },
        maintenanceSchedules: {
          where: {
            isActive: true
          },
          orderBy: {
            nextDueDate: 'asc'
          }
        },
        maintenanceRecords: {
          include: {
            performedBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            performedDate: 'desc'
          },
          take: 10
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    // Parse photos from JSON string to array
    const assetWithParsedPhotos = {
      ...asset,
      photos: asset.photos ? JSON.parse(asset.photos) : []
    }

    return NextResponse.json(assetWithParsedPhotos)

  } catch (error) {
    console.error('Error fetching asset:', error)
    return NextResponse.json(
      { error: 'Failed to fetch asset' },
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

    const existingAsset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()

    const {
      name,
      description,
      type,
      serialNumber,
      status,
      currentLocation,
      currentAssigneeId,
      purchaseCost,
      purchaseDate,
      warrantyExpiry,
      photos,
      notes
    } = body

    // Validate type if provided
    if (type && !['VEHICLE', 'EQUIPMENT', 'TOOL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      )
    }

    // Validate status if provided
    if (status && !['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid asset status' },
        { status: 400 }
      )
    }

    // Validate assignee if provided
    if (currentAssigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: currentAssigneeId,
          companyId: user.companyId
        }
      })

      if (!assignee) {
        return NextResponse.json(
          { error: 'Assignee not found' },
          { status: 404 }
        )
      }
    }

    // If photos is provided as array, stringify it for storage
    const photosData = photos !== undefined
      ? (Array.isArray(photos) ? JSON.stringify(photos) : photos)
      : undefined

    const asset = await prisma.asset.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(status && { status }),
        ...(currentLocation !== undefined && { currentLocation }),
        ...(currentAssigneeId !== undefined && { currentAssigneeId }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
        ...(photosData !== undefined && { photos: photosData }),
        ...(notes !== undefined && { notes })
      },
      include: {
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Parse photos for response
    const assetWithParsedPhotos = {
      ...asset,
      photos: asset.photos ? JSON.parse(asset.photos) : []
    }

    return NextResponse.json(assetWithParsedPhotos)

  } catch (error) {
    console.error('Error updating asset:', error)
    return NextResponse.json(
      { error: 'Failed to update asset' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Only admins can delete assets
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete assets' },
        { status: 403 }
      )
    }

    const { id } = await params

    const existingAsset = await prisma.asset.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existingAsset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    await prisma.asset.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Asset deleted successfully' })

  } catch (error) {
    console.error('Error deleting asset:', error)
    return NextResponse.json(
      { error: 'Failed to delete asset' },
      { status: 500 }
    )
  }
}
