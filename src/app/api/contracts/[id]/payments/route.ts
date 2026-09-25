import { ContractPaymentAPStatus, ContractPaymentPMStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getContractMaxPayment } from '@/lib/contracts/payment-limit'

const PM_STATUSES = new Set<ContractPaymentPMStatus>(['PENDING', 'APPROVED', 'REJECTED'])
const AP_STATUSES = new Set<ContractPaymentAPStatus>(['PROCESSING', 'WAITING_ON_LIEN_RELEASES', 'PAID', 'VOID'])
type ContractPaymentCreateData = Omit<Prisma.ContractPaymentUncheckedCreateInput, 'contractId' | 'createdById'>

async function validateContractAccess(contractId: string, companyId: string) {
  return prisma.vendorContract.findFirst({
    where: {
      id: contractId,
      vendor: {
        companyId,
      },
    },
    include: {
      payments: {
        include: {
          attachments: true,
          costAllocations: {
            include: {
              costCode: {
                select: {
                  id: true,
                  code: true,
                  name: true,
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          lienReleaseLinks: {
            include: {
              lienRelease: {
                include: {
                  supplier: {
                    select: {
                      id: true,
                      name: true,
                    },
                  },
                  documents: {
                    orderBy: { createdAt: 'desc' },
                  },
                },
              },
            },
            orderBy: { createdAt: 'asc' },
          },
          createdBy: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
            },
          },
        },
        orderBy: {
          paymentDate: 'desc',
        },
      },
    },
  })
}

function parseOptionalNumber(value: unknown) {
  if (value === null || value === undefined || value === '') return undefined
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

function parseOptionalDate(value: unknown) {
  if (!value) return undefined
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? undefined : date
}

function roundCurrency(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

function hasPaymentDiscrepancy(amountApproved?: number, acaAmountRequesting?: number) {
  if (amountApproved === undefined || acaAmountRequesting === undefined) return false
  return Math.abs(roundCurrency(amountApproved) - roundCurrency(acaAmountRequesting)) > 0.009
}

async function validateCostAllocations(companyId: string, value: unknown) {
  if (value === undefined) return { allocations: undefined }
  if (!Array.isArray(value)) return { error: 'Cost code allocations must be an array' as const }

  const allocations = value
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const row = item as Record<string, unknown>
      const costCodeId = typeof row.costCodeId === 'string' ? row.costCodeId.trim() : ''
      const amount = parseOptionalNumber(row.amount)
      const notes = typeof row.notes === 'string' ? row.notes.trim() : ''
      if (!costCodeId || amount === undefined) return null
      return { costCodeId, amount, notes }
    })
    .filter((item): item is { costCodeId: string; amount: number; notes: string } => Boolean(item))

  const costCodeIds = Array.from(new Set(allocations.map((item) => item.costCodeId)))
  if (costCodeIds.length > 0) {
    const validCostCodes = await prisma.costCode.findMany({
      where: { id: { in: costCodeIds }, companyId },
      select: { id: true },
    })

    if (validCostCodes.length !== costCodeIds.length) {
      return { error: 'One or more cost codes were not found' as const }
    }
  }

  return { allocations }
}

async function validateLienReleaseLinks(companyId: string, contractId: string, value: unknown) {
  if (value === undefined) return { lienReleaseIds: undefined }
  if (!Array.isArray(value)) return { error: 'Lien release links must be an array' as const }

  const lienReleaseIds = Array.from(
    new Set(
      value
        .map((item) => (typeof item === 'string' ? item.trim() : ''))
        .filter(Boolean)
    )
  )

  if (lienReleaseIds.length > 0) {
    const validLienReleases = await prisma.lienRelease.findMany({
      where: {
        id: { in: lienReleaseIds },
        companyId,
        contractId,
      },
      select: { id: true },
    })

    if (validLienReleases.length !== lienReleaseIds.length) {
      return { error: 'One or more lien releases were not found for this contract' as const }
    }
  }

  return { lienReleaseIds }
}

function buildPaymentData(body: Record<string, unknown>) {
  const paymentDate = parseOptionalDate(body.paymentDate)
  if (!paymentDate) {
    return { error: 'Payment date is required' as const }
  }

  const amountApproved = parseOptionalNumber(body.amountApproved)
  const amountRequesting = parseOptionalNumber(body.amountRequesting)
  const acaAmountRequesting = parseOptionalNumber(body.acaAmountRequesting)
  const hasAcaDiscrepancy = hasPaymentDiscrepancy(amountApproved, acaAmountRequesting)
  const amount = amountApproved ?? amountRequesting ?? parseOptionalNumber(body.amount) ?? 0

  const pmStatus = (body.pmStatus as ContractPaymentPMStatus | undefined) ?? 'PENDING'
  if (!PM_STATUSES.has(pmStatus)) {
    return { error: 'Invalid PM status' as const }
  }

  const apStatus = (body.apStatus as ContractPaymentAPStatus | undefined) ?? 'PROCESSING'
  if (!AP_STATUSES.has(apStatus)) {
    return { error: 'Invalid AP status' as const }
  }

  if (apStatus === 'PAID' && hasAcaDiscrepancy) {
    return { error: 'AP status cannot be set to Paid while Amount Approved differs from ACA Amount Requesting' as const }
  }

  return {
    data: {
      amount,
      paymentDate,
      reference: typeof body.reference === 'string' ? body.reference : undefined,
      notes: typeof body.notes === 'string' ? body.notes : undefined,
      submittedBy: typeof body.submittedBy === 'string' ? body.submittedBy : undefined,
      billingPeriodDate: parseOptionalDate(body.billingPeriodDate),
      clientName: typeof body.clientName === 'string' ? body.clientName : undefined,
      amountComplete: parseOptionalNumber(body.amountComplete),
      lessRetention: parseOptionalNumber(body.lessRetention),
      subtotal: parseOptionalNumber(body.subtotal),
      currentBilling: parseOptionalNumber(body.currentBilling),
      earlyPayDiscount: parseOptionalNumber(body.earlyPayDiscount),
      earlyPayDiscountPercent: parseOptionalNumber(body.earlyPayDiscountPercent),
      amountRequesting,
      acaAmountRequesting,
      hasAcaDiscrepancy,
      acaDiscrepancyNote: typeof body.acaDiscrepancyNote === 'string' ? body.acaDiscrepancyNote : undefined,
      currentRetention: parseOptionalNumber(body.currentRetention),
      paidToDateOverride: parseOptionalNumber(body.paidToDateOverride),
      paidToDateAdjustment: parseOptionalNumber(body.paidToDateAdjustment),
      // Computed server-side inside the write transaction; never trust a submitted override.
      maxPayment: undefined,
      amountApproved,
      pmStatus,
      apStatus,
      conditionalAmount: parseOptionalNumber(body.conditionalAmount),
      unconditionalAmount: parseOptionalNumber(body.unconditionalAmount),
      expectedLienReleaseCount: parseOptionalNumber(body.expectedLienReleaseCount) ?? 0,
    } as ContractPaymentCreateData,
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

    const { id: contractId } = await params
    const contract = await validateContractAccess(contractId, user.companyId)

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = buildPaymentData(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const allocationResult = await validateCostAllocations(user.companyId, body.costAllocations)
    if ('error' in allocationResult) {
      return NextResponse.json({ error: allocationResult.error }, { status: 400 })
    }

    const lienReleaseResult = await validateLienReleaseLinks(user.companyId, contractId, body.lienReleaseIds)
    if ('error' in lienReleaseResult) {
      return NextResponse.json({ error: lienReleaseResult.error }, { status: 400 })
    }

    const payment = await prisma.contractPayment.create({
      data: {
        contractId,
        createdById: user.id,
        ...result.data,
        maxPayment: await getContractMaxPayment(prisma, contractId),
        ...(allocationResult.allocations !== undefined && {
          costAllocations: {
            create: allocationResult.allocations.map((allocation) => ({
              costCodeId: allocation.costCodeId,
              amount: allocation.amount,
              notes: allocation.notes || null,
            })),
          },
        }),
        ...(lienReleaseResult.lienReleaseIds !== undefined && {
          lienReleaseLinks: {
            create: lienReleaseResult.lienReleaseIds.map((lienReleaseId) => ({
              lienReleaseId,
            })),
          },
        }),
      },
      include: {
        attachments: {
          orderBy: { createdAt: 'desc' },
        },
        costAllocations: {
          include: {
            costCode: {
              select: {
                id: true,
                code: true,
                name: true,
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        lienReleaseLinks: {
          include: {
            lienRelease: {
              include: {
                supplier: {
                  select: {
                    id: true,
                    name: true,
                  },
                },
                documents: {
                  orderBy: { createdAt: 'desc' },
                },
              },
            },
          },
          orderBy: { createdAt: 'asc' },
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    })

    return NextResponse.json(payment, { status: 201 })
  } catch (error) {
    console.error('Error adding contract payment:', error)
    return NextResponse.json(
      { error: 'Failed to add payment' },
      { status: 500 }
    )
  }
}

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

    const { id: contractId } = await params
    const contract = await validateContractAccess(contractId, user.companyId)

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    return NextResponse.json(contract.payments)
  } catch (error) {
    console.error('Error fetching contract payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
