import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

const VALID_SERVICE_TYPES = ['OIL_CHANGE', 'FUEL', 'HYDRAULIC_FLUID', 'FILTER_OIL', 'FILTER_FUEL', 'FILTER_HYDRAULIC', 'OTHER']

// POST - Log a completed maintenance/service record directly (no schedule required)
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

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      title,
      description,
      performedDate,
      cost,
      notes,
      performedById,
      serviceType,
      quantity,
      quantityUnit,
      meterReadingAtService
    } = body

    if (!title) {
      return NextResponse.json({ error: 'Title is required' }, { status: 400 })
    }

    if (serviceType && !VALID_SERVICE_TYPES.includes(serviceType)) {
      return NextResponse.json({ error: 'Invalid service type' }, { status: 400 })
    }

    const actualPerformerId = performedById || user.id
    if (performedById && performedById !== user.id) {
      const performer = await prisma.user.findFirst({
        where: { id: performedById, companyId: user.companyId }
      })
      if (!performer) {
        return NextResponse.json({ error: 'Performer not found' }, { status: 404 })
      }
    }

    const record = await prisma.maintenanceRecord.create({
      data: {
        assetId: id,
        title,
        description: description || null,
        performedDate: performedDate ? new Date(performedDate) : new Date(),
        cost: cost ?? null,
        notes: notes || null,
        performedById: actualPerformerId,
        serviceType: serviceType || null,
        quantity: quantity ?? null,
        quantityUnit: quantityUnit || null,
        meterReadingAtService: meterReadingAtService ?? null
      },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json(record, { status: 201 })

  } catch (error) {
    console.error('Error logging maintenance record:', error)
    return NextResponse.json(
      { error: 'Failed to log maintenance record' },
      { status: 500 }
    )
  }
}
