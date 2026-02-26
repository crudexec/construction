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

    const tenant = await prisma.tenant.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        leases: {
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
                type: true
              }
            },
            charges: true
          },
          orderBy: { startDate: 'desc' }
        },
        references: {
          orderBy: { createdAt: 'desc' }
        },
        applications: {
          include: {
            property: {
              select: { id: true, name: true }
            },
            unit: {
              select: { id: true, unitNumber: true }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        _count: {
          select: {
            leases: true
          }
        }
      }
    })

    if (!tenant) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error fetching tenant:', error)
    return NextResponse.json(
      { error: 'Failed to fetch tenant' },
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

    // Verify tenant belongs to company
    const existing = await prisma.tenant.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check for duplicate email if changed
    if (body.email && body.email.toLowerCase() !== existing.email.toLowerCase()) {
      const emailExists = await prisma.tenant.findFirst({
        where: {
          companyId: user.companyId,
          email: body.email.toLowerCase(),
          id: { not: id }
        }
      })

      if (emailExists) {
        return NextResponse.json(
          { error: 'A tenant with this email already exists' },
          { status: 400 }
        )
      }
    }

    const updateData: any = {
      updatedAt: new Date()
    }

    // Only update provided fields
    if (body.firstName !== undefined) updateData.firstName = body.firstName
    if (body.lastName !== undefined) updateData.lastName = body.lastName
    if (body.email !== undefined) updateData.email = body.email.toLowerCase()
    if (body.phone !== undefined) updateData.phone = body.phone
    if (body.alternatePhone !== undefined) updateData.alternatePhone = body.alternatePhone
    if (body.dateOfBirth !== undefined) updateData.dateOfBirth = body.dateOfBirth ? new Date(body.dateOfBirth) : null
    if (body.idType !== undefined) updateData.idType = body.idType
    if (body.idNumber !== undefined) updateData.idNumber = body.idNumber
    if (body.employer !== undefined) updateData.employer = body.employer
    if (body.jobTitle !== undefined) updateData.jobTitle = body.jobTitle
    if (body.monthlyIncome !== undefined) updateData.monthlyIncome = body.monthlyIncome ? parseFloat(body.monthlyIncome) : null
    if (body.employerPhone !== undefined) updateData.employerPhone = body.employerPhone
    if (body.emergencyName !== undefined) updateData.emergencyName = body.emergencyName
    if (body.emergencyPhone !== undefined) updateData.emergencyPhone = body.emergencyPhone
    if (body.emergencyRelation !== undefined) updateData.emergencyRelation = body.emergencyRelation
    if (body.notes !== undefined) updateData.notes = body.notes
    if (body.status !== undefined) updateData.status = body.status
    if (body.portalEnabled !== undefined) updateData.portalEnabled = body.portalEnabled

    const tenant = await prisma.tenant.update({
      where: { id },
      data: updateData,
      include: {
        leases: {
          where: { status: 'ACTIVE' },
          include: {
            property: {
              select: { id: true, name: true }
            },
            unit: {
              select: { id: true, unitNumber: true }
            }
          }
        }
      }
    })

    return NextResponse.json(tenant)
  } catch (error) {
    console.error('Error updating tenant:', error)
    return NextResponse.json(
      { error: 'Failed to update tenant' },
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

    // Verify tenant belongs to company
    const existing = await prisma.tenant.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        leases: {
          where: {
            status: { in: ['ACTIVE', 'PENDING_SIGNATURE'] }
          }
        }
      }
    })

    if (!existing) {
      return NextResponse.json({ error: 'Tenant not found' }, { status: 404 })
    }

    // Check for active leases
    if (existing.leases.length > 0) {
      return NextResponse.json(
        { error: 'Cannot delete tenant with active leases' },
        { status: 400 }
      )
    }

    await prisma.tenant.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting tenant:', error)
    return NextResponse.json(
      { error: 'Failed to delete tenant' },
      { status: 500 }
    )
  }
}
