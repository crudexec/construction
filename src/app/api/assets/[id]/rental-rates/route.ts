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

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const rates = await prisma.assetRentalRate.findMany({
      where: { assetId: id },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    return NextResponse.json(rates)

  } catch (error) {
    console.error('Error fetching rental rates:', error)
    return NextResponse.json(
      { error: 'Failed to fetch rental rates' },
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

    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can update rental rates' }, { status: 403 })
    }

    const { id } = await params

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const { hourlyRate, dailyRate, monthlyRate, notes } = body

    if (hourlyRate === undefined && dailyRate === undefined && monthlyRate === undefined) {
      return NextResponse.json(
        { error: 'At least one of hourlyRate, dailyRate, or monthlyRate is required' },
        { status: 400 }
      )
    }

    // Always insert a new row — never update in place — so rate history is preserved
    const rate = await prisma.assetRentalRate.create({
      data: {
        assetId: id,
        hourlyRate: hourlyRate ?? null,
        dailyRate: dailyRate ?? null,
        monthlyRate: monthlyRate ?? null,
        notes: notes || null,
        createdById: user.id
      },
      include: {
        createdBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json(rate, { status: 201 })

  } catch (error) {
    console.error('Error creating rental rate:', error)
    return NextResponse.json(
      { error: 'Failed to create rental rate' },
      { status: 500 }
    )
  }
}
