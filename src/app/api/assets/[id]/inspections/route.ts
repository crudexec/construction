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

    const inspections = await prisma.assetInspection.findMany({
      where: { assetId: id },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { inspectionDate: 'desc' }
    })

    return NextResponse.json(inspections)

  } catch (error) {
    console.error('Error fetching inspections:', error)
    return NextResponse.json(
      { error: 'Failed to fetch inspections' },
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

    const asset = await prisma.asset.findFirst({
      where: { id, companyId: user.companyId }
    })

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    }

    const body = await request.json()
    const {
      inspectionType,
      inspectionDate,
      inspectorName,
      certificateNumber,
      passed,
      expiryDate,
      notes,
      performedById
    } = body

    if (!inspectionType || !['DOT', 'OTHER'].includes(inspectionType)) {
      return NextResponse.json({ error: 'A valid inspectionType (DOT or OTHER) is required' }, { status: 400 })
    }

    if (!inspectionDate) {
      return NextResponse.json({ error: 'inspectionDate is required' }, { status: 400 })
    }

    if (passed === undefined || passed === null) {
      return NextResponse.json({ error: 'passed (true/false) is required' }, { status: 400 })
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

    const inspection = await prisma.assetInspection.create({
      data: {
        assetId: id,
        inspectionType,
        inspectionDate: new Date(inspectionDate),
        inspectorName: inspectorName || null,
        certificateNumber: certificateNumber || null,
        passed: Boolean(passed),
        expiryDate: expiryDate ? new Date(expiryDate) : null,
        notes: notes || null,
        performedById: actualPerformerId
      },
      include: {
        performedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json(inspection, { status: 201 })

  } catch (error) {
    console.error('Error creating inspection:', error)
    return NextResponse.json(
      { error: 'Failed to create inspection' },
      { status: 500 }
    )
  }
}
