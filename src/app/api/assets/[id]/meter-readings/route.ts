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

    const readings = await prisma.assetMeterReading.findMany({
      where: { assetId: id },
      include: {
        recordedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      },
      orderBy: { recordedAt: 'desc' }
    })

    return NextResponse.json(readings)

  } catch (error) {
    console.error('Error fetching meter readings:', error)
    return NextResponse.json(
      { error: 'Failed to fetch meter readings' },
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
    const { readingType, value, recordedAt, notes } = body

    if (!readingType || !['HOURS', 'MILES'].includes(readingType)) {
      return NextResponse.json({ error: 'A valid readingType (HOURS or MILES) is required' }, { status: 400 })
    }

    if (value === undefined || value === null || Number(value) < 0) {
      return NextResponse.json({ error: 'A non-negative value is required' }, { status: 400 })
    }

    const latest = await prisma.assetMeterReading.findFirst({
      where: { assetId: id, readingType },
      orderBy: { recordedAt: 'desc' }
    })

    const numericValue = Number(value)
    const warning = latest && numericValue < latest.value
      ? `This reading (${numericValue}) is lower than the most recent recorded value (${latest.value}). It was saved anyway — double-check it's correct.`
      : undefined

    const reading = await prisma.assetMeterReading.create({
      data: {
        assetId: id,
        readingType,
        value: numericValue,
        recordedAt: recordedAt ? new Date(recordedAt) : new Date(),
        recordedById: user.id,
        notes: notes || null
      },
      include: {
        recordedBy: {
          select: { id: true, firstName: true, lastName: true }
        }
      }
    })

    return NextResponse.json({ ...reading, warning }, { status: 201 })

  } catch (error) {
    console.error('Error logging meter reading:', error)
    return NextResponse.json(
      { error: 'Failed to log meter reading' },
      { status: 500 }
    )
  }
}
