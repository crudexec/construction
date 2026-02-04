import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log('[Vendor Contracts API] Starting request...')

    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      console.log('[Vendor Contracts API] No token found')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      console.log('[Vendor Contracts API] Invalid user token')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log(`[Vendor Contracts API] User authenticated: ${user.id}, Company: ${user.companyId}`)

    const { id } = await params
    console.log(`[Vendor Contracts API] Looking for vendor: ${id}`)

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      console.log(`[Vendor Contracts API] Vendor ${id} not found for company ${user.companyId}`)
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    console.log(`[Vendor Contracts API] Vendor found: ${vendor.name}`)

    const contracts = await prisma.vendorContract.findMany({
      where: {
        vendorId: id
      },
      include: {
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
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        payments: {
          include: {
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            paymentDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    console.log(`[Vendor Contracts API] Found ${contracts.length} contracts for vendor ${id}`)

    return NextResponse.json(contracts)

  } catch (error) {
    console.error('[Vendor Contracts API] Error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor contracts', details: error instanceof Error ? error.message : 'Unknown error' },
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

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
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
      terms,
      notes,
      projectIds // Array of project IDs to link
    } = body

    // Validate required fields
    if (!contractNumber || !type || !totalSum || !startDate || !endDate) {
      return NextResponse.json(
        { error: 'Contract number, type, total sum, start date, and end date are required' },
        { status: 400 }
      )
    }

    // Validate contract type
    if (!['LUMP_SUM', 'REMEASURABLE', 'ADDENDUM'].includes(type)) {
      return NextResponse.json(
        { error: 'Invalid contract type. Must be LUMP_SUM, REMEASURABLE, or ADDENDUM' },
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

    // Check for duplicate contract number
    const existingContract = await prisma.vendorContract.findUnique({
      where: { contractNumber }
    })

    if (existingContract) {
      return NextResponse.json(
        { error: 'Contract number already exists' },
        { status: 409 }
      )
    }

    // Validate project IDs if provided
    if (projectIds && projectIds.length > 0) {
      const projects = await prisma.card.findMany({
        where: {
          id: { in: projectIds },
          companyId: user.companyId
        }
      })

      if (projects.length !== projectIds.length) {
        return NextResponse.json(
          { error: 'One or more projects not found' },
          { status: 404 }
        )
      }
    }

    // Create contract with project links
    const contract = await prisma.vendorContract.create({
      data: {
        vendorId: id,
        contractNumber,
        type,
        totalSum,
        retentionPercent: retentionPercent || 0,
        retentionAmount,
        warrantyYears: warrantyYears || 1,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        terms,
        notes,
        status: 'DRAFT',
        projects: projectIds && projectIds.length > 0 ? {
          create: projectIds.map((projectId: string) => ({
            projectId
          }))
        } : undefined
      },
      include: {
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

    return NextResponse.json(contract, { status: 201 })

  } catch (error) {
    console.error('Error creating vendor contract:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor contract' },
      { status: 500 }
    )
  }
}
