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

    const lease = await prisma.lease.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        property: {
          select: {
            id: true,
            name: true,
            address: true,
            city: true,
            state: true,
            zipCode: true
          }
        },
        unit: {
          select: {
            id: true,
            unitNumber: true,
            type: true,
            bedrooms: true,
            bathrooms: true,
            sqft: true
          }
        },
        primaryTenant: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            status: true
          }
        },
        tenants: {
          include: {
            tenant: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                email: true,
                phone: true
              }
            }
          }
        },
        charges: {
          orderBy: { createdAt: 'asc' }
        }
      }
    })

    if (!lease) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Error fetching lease:', error)
    return NextResponse.json(
      { error: 'Failed to fetch lease' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Verify lease belongs to company
    const existing = await prisma.lease.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    // Update allowed fields
    if (body.type !== undefined) updateData.type = body.type
    if (body.status !== undefined) updateData.status = body.status
    if (body.startDate !== undefined) updateData.startDate = new Date(body.startDate)
    if (body.endDate !== undefined) updateData.endDate = new Date(body.endDate)
    if (body.moveInDate !== undefined) updateData.moveInDate = body.moveInDate ? new Date(body.moveInDate) : null
    if (body.moveOutDate !== undefined) updateData.moveOutDate = body.moveOutDate ? new Date(body.moveOutDate) : null
    if (body.monthlyRent !== undefined) updateData.monthlyRent = parseFloat(body.monthlyRent)
    if (body.rentDueDay !== undefined) updateData.rentDueDay = body.rentDueDay
    if (body.gracePeriodDays !== undefined) updateData.gracePeriodDays = body.gracePeriodDays
    if (body.lateFeeType !== undefined) updateData.lateFeeType = body.lateFeeType
    if (body.lateFeeAmount !== undefined) updateData.lateFeeAmount = body.lateFeeAmount ? parseFloat(body.lateFeeAmount) : null
    if (body.lateFeePercent !== undefined) updateData.lateFeePercent = body.lateFeePercent ? parseFloat(body.lateFeePercent) : null
    if (body.securityDeposit !== undefined) updateData.securityDeposit = parseFloat(body.securityDeposit)
    if (body.petDeposit !== undefined) updateData.petDeposit = body.petDeposit ? parseFloat(body.petDeposit) : null
    if (body.otherDeposits !== undefined) updateData.otherDeposits = body.otherDeposits
    if (body.escalationType !== undefined) updateData.escalationType = body.escalationType
    if (body.escalationPercent !== undefined) updateData.escalationPercent = body.escalationPercent ? parseFloat(body.escalationPercent) : null
    if (body.escalationAmount !== undefined) updateData.escalationAmount = body.escalationAmount ? parseFloat(body.escalationAmount) : null
    if (body.escalationDate !== undefined) updateData.escalationDate = body.escalationDate ? new Date(body.escalationDate) : null
    if (body.petsAllowed !== undefined) updateData.petsAllowed = body.petsAllowed
    if (body.petRent !== undefined) updateData.petRent = body.petRent ? parseFloat(body.petRent) : null
    if (body.smokingAllowed !== undefined) updateData.smokingAllowed = body.smokingAllowed
    if (body.maxOccupants !== undefined) updateData.maxOccupants = body.maxOccupants
    if (body.renewalStatus !== undefined) updateData.renewalStatus = body.renewalStatus
    if (body.renewalOfferedAt !== undefined) updateData.renewalOfferedAt = body.renewalOfferedAt ? new Date(body.renewalOfferedAt) : null
    if (body.renewalResponseDue !== undefined) updateData.renewalResponseDue = body.renewalResponseDue ? new Date(body.renewalResponseDue) : null
    if (body.noticeGivenAt !== undefined) updateData.noticeGivenAt = body.noticeGivenAt ? new Date(body.noticeGivenAt) : null
    if (body.noticeRequiredDays !== undefined) updateData.noticeRequiredDays = body.noticeRequiredDays
    if (body.moveOutReason !== undefined) updateData.moveOutReason = body.moveOutReason
    if (body.depositReturned !== undefined) updateData.depositReturned = body.depositReturned ? parseFloat(body.depositReturned) : null
    if (body.depositDeductions !== undefined) updateData.depositDeductions = body.depositDeductions
    if (body.signedAt !== undefined) updateData.signedAt = body.signedAt ? new Date(body.signedAt) : null
    if (body.signedByTenant !== undefined) updateData.signedByTenant = body.signedByTenant
    if (body.signedByLandlord !== undefined) updateData.signedByLandlord = body.signedByLandlord
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.specialTerms !== undefined) updateData.specialTerms = body.specialTerms

    // Update unit status if lease is being activated
    if (body.status === 'ACTIVE' && existing.status !== 'ACTIVE') {
      await prisma.unit.update({
        where: { id: existing.unitId },
        data: {
          status: 'OCCUPIED',
          currentLeaseId: id,
          currentTenantId: existing.primaryTenantId
        }
      })
    }

    // Update unit status if lease is being terminated/expired
    if (['TERMINATED', 'EXPIRED'].includes(body.status) && existing.status === 'ACTIVE') {
      await prisma.unit.update({
        where: { id: existing.unitId },
        data: {
          status: 'NOTICE_GIVEN',
          currentLeaseId: null,
          currentTenantId: null
        }
      })
    }

    const lease = await prisma.lease.update({
      where: { id },
      data: updateData,
      include: {
        property: {
          select: { id: true, name: true, address: true }
        },
        unit: {
          select: { id: true, unitNumber: true, type: true }
        },
        primaryTenant: {
          select: { id: true, firstName: true, lastName: true, email: true, phone: true }
        },
        tenants: {
          include: {
            tenant: {
              select: { id: true, firstName: true, lastName: true }
            }
          }
        },
        charges: true
      }
    })

    return NextResponse.json(lease)
  } catch (error) {
    console.error('Error updating lease:', error)
    return NextResponse.json(
      { error: 'Failed to update lease' },
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

    const { id } = await params

    // Verify lease belongs to company
    const existing = await prisma.lease.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Lease not found' }, { status: 404 })
    }

    // Only allow deleting draft leases
    if (existing.status !== 'DRAFT') {
      return NextResponse.json(
        { error: 'Only draft leases can be deleted. Use status change for active leases.' },
        { status: 400 }
      )
    }

    // Delete related records first
    await prisma.$transaction([
      prisma.leaseCharge.deleteMany({ where: { leaseId: id } }),
      prisma.leaseTenant.deleteMany({ where: { leaseId: id } }),
      prisma.lease.delete({ where: { id } })
    ])

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting lease:', error)
    return NextResponse.json(
      { error: 'Failed to delete lease' },
      { status: 500 }
    )
  }
}
