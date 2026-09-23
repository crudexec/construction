import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { Prisma } from '@prisma/client'
import { AssetIdentityValidationError, parseAssetIdentity } from '@/lib/assets/identity'
import { applyAssetContext, AssetContextError } from '@/lib/assets/context'

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
        currentProject: { select: { id: true, title: true } },
        currentYard: { select: { id: true, name: true } },
        currentAssignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        purchasedFromVendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        statusDefinition: {
          select: {
            id: true,
            name: true,
            baseStatus: true,
            color: true
          }
        },
        attachments: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        customFieldValues: {
          include: {
            definition: true
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
          take: 20
        },
        inspections: {
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
            inspectionDate: 'desc'
          },
          take: 10
        },
        _count: {
          select: {
            issues: {
              where: { status: { in: ['OPEN', 'IN_PROGRESS'] } }
            }
          }
        }
      }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    return NextResponse.json(asset)

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
    const identity = parseAssetIdentity(body)

    const {
      name,
      description,
      type,
      serialNumber,
      status,
      statusDefinitionId,
      customStatusNote,
      currentLocation,
      currentAssigneeId,
      make,
      model,
      year,
      vin,
      licensePlate,
      purchaseCost,
      purchaseDate,
      warrantyExpiry,
      purchasedFromVendorId,
      poNumber,
      invoiceNumber,
      financingType,
      financedAmount,
      lender,
      loanTermMonths,
      depreciationMethod,
      usefulLifeYears,
      salvageValue,
      notes
    } = body

    // Validate type if provided
    if (type && !['VEHICLE', 'EQUIPMENT', 'TOOL'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid asset type' },
        { status: 400 }
      )
    }

    let resolvedStatusDefinition: { id: string; baseStatus: typeof existingAsset.status } | null = null
    if (statusDefinitionId) {
      resolvedStatusDefinition = await prisma.assetStatusDefinition.findFirst({
        where: {
          id: statusDefinitionId,
          companyId: user.companyId,
          // An asset may retain its existing status after that option is retired.
          ...(statusDefinitionId !== existingAsset.statusDefinitionId && { isActive: true })
        },
        select: {
          id: true,
          baseStatus: true
        }
      })

      if (!resolvedStatusDefinition) {
        return NextResponse.json(
          { error: 'Asset status option not found' },
          { status: 404 }
        )
      }
    }

    // Validate status if provided
    if (status && !['AVAILABLE', 'IN_USE', 'UNDER_MAINTENANCE', 'RETIRED', 'LOST_DAMAGED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid asset status' },
        { status: 400 }
      )
    }

    // Validate financing type if provided
    if (financingType && !['CASH', 'FINANCED', 'LEASED'].includes(financingType)) {
      return NextResponse.json(
        { error: 'Invalid financing type' },
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

    // Validate purchasedFromVendor if provided
    if (purchasedFromVendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: purchasedFromVendorId,
          companyId: user.companyId
        }
      })

      if (!vendor) {
        return NextResponse.json(
          { error: 'Vendor not found' },
          { status: 404 }
        )
      }
    }

    const assetUpdateData = {
        ...identity,
        ...(name && { name }),
        ...(description !== undefined && { description }),
        ...(type && { type }),
        ...(serialNumber !== undefined && { serialNumber }),
        ...(status && !resolvedStatusDefinition && { status }),
        ...(resolvedStatusDefinition && { status: resolvedStatusDefinition.baseStatus }),
        ...(statusDefinitionId !== undefined && { statusDefinitionId: statusDefinitionId || null }),
        ...(customStatusNote !== undefined && { customStatusNote }),
        ...(make !== undefined && { make }),
        ...(model !== undefined && { model }),
        ...(year !== undefined && { year: year ? parseInt(year) : null }),
        ...(vin !== undefined && { vin }),
        ...(licensePlate !== undefined && { licensePlate }),
        ...(purchaseCost !== undefined && { purchaseCost }),
        ...(purchaseDate !== undefined && { purchaseDate: purchaseDate ? new Date(purchaseDate) : null }),
        ...(warrantyExpiry !== undefined && { warrantyExpiry: warrantyExpiry ? new Date(warrantyExpiry) : null }),
        ...(purchasedFromVendorId !== undefined && { purchasedFromVendorId: purchasedFromVendorId || null }),
        ...(poNumber !== undefined && { poNumber }),
        ...(invoiceNumber !== undefined && { invoiceNumber }),
        ...(financingType !== undefined && { financingType: financingType || null }),
        ...(financedAmount !== undefined && { financedAmount }),
        ...(lender !== undefined && { lender }),
        ...(loanTermMonths !== undefined && { loanTermMonths: loanTermMonths ? parseInt(loanTermMonths) : null }),
        ...(depreciationMethod !== undefined && { depreciationMethod }),
        ...(usefulLifeYears !== undefined && { usefulLifeYears: usefulLifeYears ? parseInt(usefulLifeYears) : null }),
        ...(salvageValue !== undefined && { salvageValue }),
        ...(notes !== undefined && { notes })
      }

    const asset = await prisma.$transaction(async (tx) => {
      await applyAssetContext(tx, id, user, body)

      return tx.asset.update({
        where: { id },
        data: assetUpdateData,
        include: {
          currentAssignee: {
            select: {
              id: true,
              firstName: true,
              lastName: true
            }
          },
          purchasedFromVendor: {
            select: {
              id: true,
              name: true,
              companyName: true
            }
          },
          statusDefinition: {
            select: {
              id: true,
              name: true,
              baseStatus: true,
              color: true
            }
          }
        }
      })
    })

    return NextResponse.json(asset)

  } catch (error) {
    if (error instanceof AssetIdentityValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    if (error instanceof AssetContextError) return NextResponse.json({ error: error.message }, { status: error.status })
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      return NextResponse.json({ error: 'This Equipment ID is already in use in your company' }, { status: 409 })
    }
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
