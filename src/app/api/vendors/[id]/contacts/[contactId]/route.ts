import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
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

    const { id: vendorId, contactId } = await params

    // First verify the vendor belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      },
      select: {
        id: true,
        name: true,
        companyName: true
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Fetch the contact
    const contact = await prisma.vendorContact.findFirst({
      where: {
        id: contactId,
        vendorId: vendorId
      }
    })

    if (!contact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    return NextResponse.json({
      ...contact,
      vendor: {
        id: vendor.id,
        name: vendor.name,
        companyName: vendor.companyName
      }
    })

  } catch (error) {
    console.error('Error fetching contact:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contact' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
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

    const { id: vendorId, contactId } = await params

    // Verify vendor belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Verify contact exists
    const existingContact = await prisma.vendorContact.findFirst({
      where: {
        id: contactId,
        vendorId: vendorId
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const body = await request.json()
    const { firstName, lastName, email, phone, position, isPrimary, isBilling } = body

    // If setting as primary, unset other primary contacts
    if (isPrimary && !existingContact.isPrimary) {
      await prisma.vendorContact.updateMany({
        where: {
          vendorId: vendorId,
          isPrimary: true
        },
        data: {
          isPrimary: false
        }
      })
    }

    const contact = await prisma.vendorContact.update({
      where: { id: contactId },
      data: {
        firstName,
        lastName,
        email,
        phone,
        position,
        isPrimary,
        isBilling
      }
    })

    return NextResponse.json(contact)

  } catch (error) {
    console.error('Error updating contact:', error)
    return NextResponse.json(
      { error: 'Failed to update contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; contactId: string }> }
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

    const { id: vendorId, contactId } = await params

    // Verify vendor belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Verify contact exists
    const existingContact = await prisma.vendorContact.findFirst({
      where: {
        id: contactId,
        vendorId: vendorId
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    await prisma.vendorContact.delete({
      where: { id: contactId }
    })

    return NextResponse.json({ message: 'Contact deleted successfully' })

  } catch (error) {
    console.error('Error deleting contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete contact' },
      { status: 500 }
    )
  }
}
