import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const propertyId = searchParams.get('propertyId')
    const tenantId = searchParams.get('tenantId')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')
    const skip = (page - 1) * limit

    const where: any = {
      companyId: user.companyId
    }

    if (status && status !== 'all') {
      where.status = status
    }

    if (propertyId) {
      where.propertyId = propertyId
    }

    if (tenantId) {
      where.primaryTenantId = tenantId
    }

    const [leases, total] = await Promise.all([
      prisma.lease.findMany({
        where,
        include: {
          property: {
            select: {
              id: true,
              name: true,
              address: true
            }
          },
          unit: {
            select: {
              id: true,
              unitNumber: true,
              type: true,
              bedrooms: true,
              bathrooms: true
            }
          },
          primaryTenant: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
              phone: true
            }
          },
          tenants: {
            include: {
              tenant: {
                select: {
                  id: true,
                  firstName: true,
                  lastName: true,
                  email: true
                }
              }
            }
          },
          charges: true,
          _count: {
            select: {
              tenants: true
            }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit
      }),
      prisma.lease.count({ where })
    ])

    return NextResponse.json({
      leases,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching leases:', error)
    return NextResponse.json(
      { error: 'Failed to fetch leases' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()

    const {
      propertyId,
      unitId,
      primaryTenantId,
      type = 'FIXED_TERM',
      startDate,
      endDate,
      moveInDate,
      monthlyRent,
      rentDueDay = 1,
      gracePeriodDays = 5,
      lateFeeType = 'FLAT',
      lateFeeAmount,
      lateFeePercent,
      securityDeposit = 0,
      petDeposit,
      otherDeposits,
      escalationType,
      escalationPercent,
      escalationAmount,
      escalationDate,
      petsAllowed = false,
      petRent,
      smokingAllowed = false,
      maxOccupants,
      noticeRequiredDays = 30,
      notes,
      specialTerms,
      charges = []
    } = body

    // Validate required fields
    if (!propertyId || !unitId || !primaryTenantId || !startDate || !endDate || !monthlyRent) {
      return NextResponse.json(
        { error: 'Property, unit, tenant, dates, and rent amount are required' },
        { status: 400 }
      )
    }

    // Verify property belongs to company
    const property = await prisma.property.findFirst({
      where: {
        id: propertyId,
        companyId: user.companyId
      }
    })

    if (!property) {
      return NextResponse.json({ error: 'Property not found' }, { status: 404 })
    }

    // Verify unit belongs to property
    const unit = await prisma.unit.findFirst({
      where: {
        id: unitId,
        propertyId
      }
    })

    if (!unit) {
      return NextResponse.json({ error: 'Unit not found' }, { status: 404 })
    }

    // Verify tenant belongs to company
    const tenant = await prisma.tenant.findFirst({
      where: {
        id: primaryTenantId,
        companyId: user.companyId
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check for overlapping active leases on this unit
    const overlappingLease = await prisma.lease.findFirst({
      where: {
        unitId,
        status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] },
        OR: [
          {
            startDate: { lte: new Date(endDate) },
            endDate: { gte: new Date(startDate) }
          }
        ]
      }
    })

    if (overlappingLease) {
      return NextResponse.json(
        { error: 'This unit already has an active or pending lease for the selected dates' },
        { status: 400 }
      )
    }

    // Generate lease number
    const leaseCount = await prisma.lease.count({
      where: { companyId: user.companyId }
    })
    const leaseNumber = `LSE-${String(leaseCount + 1).padStart(5, '0')}`

    // Create lease with charges in a transaction
    const lease = await prisma.$transaction(async (tx) => {
      const newLease = await tx.lease.create({
        data: {
          propertyId,
          unitId,
          primaryTenantId,
          leaseNumber,
          type,
          status: 'DRAFT',
          startDate: new Date(startDate),
          endDate: new Date(endDate),
          moveInDate: moveInDate ? new Date(moveInDate) : null,
          monthlyRent: parseFloat(monthlyRent),
          rentDueDay,
          gracePeriodDays,
          lateFeeType,
          lateFeeAmount: lateFeeAmount ? parseFloat(lateFeeAmount) : null,
          lateFeePercent: lateFeePercent ? parseFloat(lateFeePercent) : null,
          securityDeposit: parseFloat(securityDeposit) || 0,
          petDeposit: petDeposit ? parseFloat(petDeposit) : null,
          otherDeposits,
          escalationType,
          escalationPercent: escalationPercent ? parseFloat(escalationPercent) : null,
          escalationAmount: escalationAmount ? parseFloat(escalationAmount) : null,
          escalationDate: escalationDate ? new Date(escalationDate) : null,
          petsAllowed,
          petRent: petRent ? parseFloat(petRent) : null,
          smokingAllowed,
          maxOccupants,
          noticeRequiredDays,
          notes,
          specialTerms,
          companyId: user.companyId
        }
      })

      // Create lease-tenant relationship
      await tx.leaseTenant.create({
        data: {
          leaseId: newLease.id,
          tenantId: primaryTenantId,
          isPrimary: true,
          moveInDate: moveInDate ? new Date(moveInDate) : null
        }
      })

      // Create charges if provided
      if (charges.length > 0) {
        await tx.leaseCharge.createMany({
          data: charges.map((charge: any) => ({
            leaseId: newLease.id,
            name: charge.name,
            amount: parseFloat(charge.amount),
            frequency: charge.frequency || 'MONTHLY',
            startDate: charge.startDate ? new Date(charge.startDate) : null,
            endDate: charge.endDate ? new Date(charge.endDate) : null,
            isActive: true
          }))
        })
      }

      return newLease
    })

    // Fetch the complete lease
    const completeLease = await prisma.lease.findUnique({
      where: { id: lease.id },
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

    return NextResponse.json(completeLease, { status: 201 })
  } catch (error) {
    console.error('Error creating lease:', error)
    return NextResponse.json(
      { error: 'Failed to create lease' },
      { status: 500 }
    )
  }
}
