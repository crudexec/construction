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

    const contacts = await prisma.vendorContact.findMany({
      where: {
        vendorId: id
      },
      orderBy: [
        { isPrimary: 'desc' },
        { firstName: 'asc' }
      ]
    })

    return NextResponse.json(contacts)

  } catch (error) {
    console.error('Error fetching vendor contacts:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor contacts' },
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
      firstName,
      lastName,
      email,
      phone,
      position,
      isPrimary,
      isBilling
    } = body

    // If setting as primary, unset existing primary contact
    if (isPrimary) {
      await prisma.vendorContact.updateMany({
        where: {
          vendorId: id,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    const contact = await prisma.vendorContact.create({
      data: {
        vendorId: id,
        firstName,
        lastName,
        email,
        phone,
        position,
        isPrimary: isPrimary || false,
        isBilling: isBilling || false
      }
    })

    return NextResponse.json(contact, { status: 201 })

  } catch (error) {
    console.error('Error creating vendor contact:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor contact' },
      { status: 500 }
    )
  }
}