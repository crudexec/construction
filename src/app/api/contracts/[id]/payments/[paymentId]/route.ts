import { ContractPaymentAPStatus, ContractPaymentPMStatus, Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const PM_STATUSES = new Set<ContractPaymentPMStatus>(['PENDING', 'APPROVED', 'REJECTED'])
const AP_STATUSES = new Set<ContractPaymentAPStatus>(['PROCESSING', 'WAITING_ON_LIEN_RELEASES', 'PAID', 'VOID'])

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

async function findPayment(contractId: string, paymentId: string, companyId: string) {
  return prisma.contractPayment.findFirst({
    where: {
      id: paymentId,
      contractId,
      contract: {
        vendor: {
          companyId,
        },
      },
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
}

function buildPaymentUpdateData(body: Record<string, unknown>) {
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
      reference: typeof body.reference === 'string' ? body.reference : null,
      notes: typeof body.notes === 'string' ? body.notes : null,
      submittedBy: typeof body.submittedBy === 'string' ? body.submittedBy : null,
      billingPeriodDate: parseOptionalDate(body.billingPeriodDate) ?? null,
      clientName: typeof body.clientName === 'string' ? body.clientName : null,
      amountComplete: parseOptionalNumber(body.amountComplete) ?? null,
      lessRetention: parseOptionalNumber(body.lessRetention) ?? null,
      subtotal: parseOptionalNumber(body.subtotal) ?? null,
      currentBilling: parseOptionalNumber(body.currentBilling) ?? null,
      earlyPayDiscount: parseOptionalNumber(body.earlyPayDiscount) ?? null,
      amountRequesting: amountRequesting ?? null,
      currentRetention: parseOptionalNumber(body.currentRetention) ?? null,
      paidToDateOverride: parseOptionalNumber(body.paidToDateOverride) ?? null,
      paidToDateAdjustment: parseOptionalNumber(body.paidToDateAdjustment) ?? null,
      maxPayment: parseOptionalNumber(body.maxPayment) ?? null,
      amountApproved: amountApproved ?? null,
      pmStatus,
      apStatus,
      conditionalAmount: parseOptionalNumber(body.conditionalAmount) ?? null,
      unconditionalAmount: parseOptionalNumber(body.unconditionalAmount) ?? null,
      expectedLienReleaseCount: parseOptionalNumber(body.expectedLienReleaseCount) ?? 0,
    } satisfies Prisma.ContractPaymentUncheckedUpdateInput,
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
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

    const { id: contractId, paymentId } = await params
    const existingPayment = await findPayment(contractId, paymentId, user.companyId)

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    const body = await request.json()
    const result = buildPaymentUpdateData(body)

    if ('error' in result) {
      return NextResponse.json({ error: result.error }, { status: 400 })
    }

    const isLocked = existingPayment.pmStatus === 'APPROVED' && existingPayment.apStatus === 'PAID'
    if (isLocked && user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only admins can unlock or modify paid and approved payment rows' },
        { status: 403 }
      )
    }

    const payment = await prisma.contractPayment.update({
      where: { id: paymentId },
      data: result.data,
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

    return NextResponse.json(payment)
  } catch (error) {
    console.error('Error updating contract payment:', error)
    return NextResponse.json(
      { error: 'Failed to update payment' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; paymentId: string }> }
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

    const { id: contractId, paymentId } = await params
    const existingPayment = await findPayment(contractId, paymentId, user.companyId)

    if (!existingPayment) {
      return NextResponse.json({ error: 'Payment record not found' }, { status: 404 })
    }

    if (existingPayment.pmStatus === 'APPROVED' && existingPayment.apStatus === 'PAID') {
      return NextResponse.json(
        { error: 'Paid and approved payment rows cannot be deleted' },
        { status: 400 }
      )
    }

    await prisma.contractPayment.delete({
      where: { id: paymentId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting contract payment:', error)
    return NextResponse.json(
      { error: 'Failed to delete payment' },
      { status: 500 }
    )
  }
}
