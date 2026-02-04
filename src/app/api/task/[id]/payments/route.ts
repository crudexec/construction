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

    // Verify task exists and belongs to user's company
    const task = await prisma.task.findFirst({
      where: {
        id,
        card: {
          companyId: user.companyId
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const payments = await prisma.taskPayment.findMany({
      where: {
        taskId: id
      },
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
    })

    // Calculate totals
    const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)
    const outstandingBalance = (task.approvedAmount || 0) - totalPaid

    return NextResponse.json({
      payments,
      summary: {
        budgetAmount: task.budgetAmount,
        approvedAmount: task.approvedAmount,
        totalPaid,
        outstandingBalance,
        costVariance: (task.budgetAmount || 0) - (task.approvedAmount || 0)
      }
    })

  } catch (error) {
    console.error('Error fetching task payments:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task payments' },
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

    // Verify task exists and belongs to user's company
    const task = await prisma.task.findFirst({
      where: {
        id,
        card: {
          companyId: user.companyId
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    const body = await request.json()
    const { amount, invoiceNumber, referenceNumber, paymentDate, notes } = body

    if (!amount || amount <= 0) {
      return NextResponse.json(
        { error: 'Valid payment amount is required' },
        { status: 400 }
      )
    }

    if (!paymentDate) {
      return NextResponse.json(
        { error: 'Payment date is required' },
        { status: 400 }
      )
    }

    const payment = await prisma.taskPayment.create({
      data: {
        taskId: id,
        amount,
        invoiceNumber,
        referenceNumber,
        paymentDate: new Date(paymentDate),
        notes,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json(payment, { status: 201 })

  } catch (error) {
    console.error('Error creating task payment:', error)
    return NextResponse.json(
      { error: 'Failed to create task payment' },
      { status: 500 }
    )
  }
}
