import { ContractPaymentAPStatus, ContractPaymentPMStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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

function buildPaymentData(body: Record<string, unknown>) {
  const paymentDate = parseOptionalDate(body.paymentDate)
  if (!paymentDate) {
    return { error: 'Payment date is required' as const }
  }

  const amountApproved = parseOptionalNumber(body.amountApproved)
  const amountRequesting = parseOptionalNumber(body.amountRequesting)
  const amount = amountApproved ?? amountRequesting ?? parseOptionalNumber(body.amount) ?? 0

  const pmStatus = (body.pmStatus as ContractPaymentPMStatus | undefined) ?? 'PENDING'
  if (!PM_STATUSES.has(pmStatus)) {
    return { error: 'Invalid PM status' as const }
  }

  const apStatus = (body.apStatus as ContractPaymentAPStatus | undefined) ?? 'PROCESSING'
  if (!AP_STATUSES.has(apStatus)) {
    return { error: 'Invalid AP status' as const }
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
      amountRequesting,
      currentRetention: parseOptionalNumber(body.currentRetention),
      paidToDateOverride: parseOptionalNumber(body.paidToDateOverride),
      paidToDateAdjustment: parseOptionalNumber(body.paidToDateAdjustment),
      maxPayment: parseOptionalNumber(body.maxPayment),
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

    const payment = await prisma.contractPayment.create({
      data: {
        contractId,
        createdById: user.id,
        ...result.data,
      },
      include: {
        attachments: {
          orderBy: { createdAt: 'desc' },
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
