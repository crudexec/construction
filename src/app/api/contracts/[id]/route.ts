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

    const contract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            status: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true,
                budget: true
              }
            }
          }
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract)

  } catch (error) {
    console.error('Error fetching contract:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract' },
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

    // Verify contract exists and belongs to user's company
    const existingContract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const body = await request.json()

    const {
      contractNumber,
      type,
      totalSum,
      retentionPercent,
      retentionAmount,
      warrantyYears,
      startDate,
      endDate,
      status,
      terms,
      notes
    } = body

    // Validate contract type if provided
    if (type && !['LUMP_SUM', 'REMEASURABLE', 'ADDENDUM'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid contract type' },
        { status: 400 }
      )
    }

    // Validate contract status if provided
    if (status && !['DRAFT', 'ACTIVE', 'COMPLETED', 'TERMINATED', 'EXPIRED'].includes(status)) {
      return NextResponse.json(
        { error: 'Invalid contract status' },
        { status: 400 }
      )
    }

    // Validate warranty years if provided
    if (warrantyYears && (warrantyYears < 1 || warrantyYears > 10)) {
      return NextResponse.json(
        { error: 'Warranty years must be between 1 and 10' },
        { status: 400 }
      )
    }

    // Check for duplicate contract number if changed
    if (contractNumber && contractNumber !== existingContract.contractNumber) {
      const duplicateContract = await prisma.vendorContract.findUnique({
        where: { contractNumber }
      })

      if (duplicateContract) {
        return NextResponse.json(
          { error: 'Contract number already exists' },
          { status: 409 }
        )
      }
    }

    const contract = await prisma.vendorContract.update({
      where: { id },
      data: {
        ...(contractNumber && { contractNumber }),
        ...(type && { type }),
        ...(totalSum !== undefined && { totalSum }),
        ...(retentionPercent !== undefined && { retentionPercent }),
        ...(retentionAmount !== undefined && { retentionAmount }),
        ...(warrantyYears && { warrantyYears }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(status && { status }),
        ...(terms !== undefined && { terms }),
        ...(notes !== undefined && { notes })
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        projects: {
          include: {
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        }
      }
    })

    return NextResponse.json(contract)

  } catch (error) {
    console.error('Error updating contract:', error)
    return NextResponse.json(
      { error: 'Failed to update contract' },
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

    // Only admins can delete contracts
    if (user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can delete contracts' },
        { status: 403 }
      )
    }

    const { id } = await params

    // Verify contract exists and belongs to user's company
    const existingContract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!existingContract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    await prisma.vendorContract.delete({
      where: { id }
    })

    return NextResponse.json({ message: 'Contract deleted successfully' })

  } catch (error) {
    console.error('Error deleting contract:', error)
    return NextResponse.json(
      { error: 'Failed to delete contract' },
      { status: 500 }
    )
  }
}
