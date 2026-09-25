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
        changeOrders: { where: { status: 'APPROVED' }, select: { totalAmount: true } },
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
      estimateAmount,
      retentionPercent,
      retentionAmount,
      warrantyYears,
      startDate,
      endDate,
      retentionBond,
      terms,
      notes,
      projectIds, // Array of project IDs to link
      lineItems // Optional array of line items to create alongside the contract
    } = body

    // Validate required fields. Type/start date are optional and default below —
    // the fast "Create Estimate" path only sends contractNumber + totalSum (or line items).
    const hasLineItemsForValidation = Array.isArray(lineItems) && lineItems.length > 0
    if (!contractNumber || (!totalSum && !hasLineItemsForValidation)) {
      return NextResponse.json(
        { error: 'Contract number and either a total sum or line items are required' },
        { status: 400 }
      )
    }

    // Validate contract type, if provided
    if (type && !['LUMP_SUM', 'REMEASURABLE', 'ADDENDUM'].includes(type)) {
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

    // Check for duplicate contract number within the same company (contract
    // numbers/PO numbers are only meaningful — and only need to be unique — per company)
    const existingContract = await prisma.vendorContract.findFirst({
      where: { companyId: user.companyId, contractNumber }
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

    // Validate line items, if provided, and any cost codes they reference
    const hasLineItems = Array.isArray(lineItems) && lineItems.length > 0
    if (hasLineItems) {
      for (const item of lineItems) {
        if (!item.description || item.quantity === undefined || !item.unit || item.unitPrice === undefined) {
          return NextResponse.json(
            { error: 'Each line item requires a description, quantity, unit, and unit price' },
            { status: 400 }
          )
        }
      }

      const costCodeIds = Array.from(new Set(lineItems.map((item: any) => item.costCodeId).filter(Boolean)))
      if (costCodeIds.length > 0) {
        const validCostCodes = await prisma.costCode.findMany({
          where: { id: { in: costCodeIds as string[] }, companyId: user.companyId },
          select: { id: true }
        })
        if (validCostCodes.length !== costCodeIds.length) {
          return NextResponse.json({ error: 'One or more cost codes not found' }, { status: 404 })
        }
      }
    }

    // Once line items exist, totalSum is superseded by their sum (matching how
    // adding a line item later already recalculates totalSum) — estimateAmount
    // preserves what was originally entered, regardless of line items
    const computedTotalSum = hasLineItems
      ? lineItems.reduce((sum: number, item: any) => sum + (item.quantity * item.unitPrice), 0)
      : totalSum

    // Create contract with project links and optional line items
    const contract = await prisma.vendorContract.create({
      data: {
        vendorId: id,
        companyId: user.companyId,
        contractNumber,
        type: type || 'LUMP_SUM',
        totalSum: computedTotalSum,
        estimateAmount: estimateAmount !== undefined ? estimateAmount : computedTotalSum,
        retentionPercent: retentionPercent || 0,
        retentionAmount,
        warrantyYears: warrantyYears || 1,
        startDate: startDate ? new Date(startDate) : new Date(),
        endDate: endDate ? new Date(endDate) : null,
        retentionBond,
        terms,
        notes,
        status: 'DRAFT',
        projects: projectIds && projectIds.length > 0 ? {
          create: projectIds.map((projectId: string) => ({
            projectId
          }))
        } : undefined,
        lineItems: hasLineItems ? {
          create: lineItems.map((item: any, index: number) => ({
            description: item.description,
            quantity: item.quantity,
            unit: item.unit,
            unitPrice: item.unitPrice,
            totalPrice: item.quantity * item.unitPrice,
            order: index,
            notes: item.notes || null,
            costCodeId: item.costCodeId || null,
            specSection: item.specSection || null
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
        },
        lineItems: {
          include: {
            costCode: {
              select: { id: true, code: true, name: true }
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
