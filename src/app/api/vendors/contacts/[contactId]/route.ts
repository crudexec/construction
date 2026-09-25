import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { saveVendorContact, RelationshipError } from '@/lib/vendors/relationships'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
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

    const { contactId } = await params

    // Verify contact exists and vendor belongs to user's company
    const existingContact = await prisma.vendorContact.findFirst({
      where: {
        id: contactId,
        vendor: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: true
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    const body = await request.json()
    const contact = await saveVendorContact(user.companyId, existingContact.vendorId, contactId, body)

    return NextResponse.json(contact)

  } catch (error) {
    console.error('Error updating vendor contact:', error)
    if (error instanceof RelationshipError) return NextResponse.json({ error: error.message, candidates: error.candidates }, { status: error.status })
    return NextResponse.json(
      { error: 'Failed to update vendor contact' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ contactId: string }> }
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

    const { contactId } = await params

    // Verify contact exists and vendor belongs to user's company
    const existingContact = await prisma.vendorContact.findFirst({
      where: {
        id: contactId,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!existingContact) {
      return NextResponse.json({ error: 'Contact not found' }, { status: 404 })
    }

    // Check if this is the only contact for the vendor
    const contactCount = await prisma.vendorContact.count({
      where: {
        vendorId: existingContact.vendorId
      }
    })

    if (contactCount === 1) {
      return NextResponse.json({ 
        error: 'Cannot delete the last contact. Vendor must have at least one contact.' 
      }, { status: 400 })
    }

    await prisma.vendorContact.delete({
      where: {
        id: contactId
      }
    })

    return NextResponse.json({ message: 'Contact deleted successfully' })

  } catch (error) {
    console.error('Error deleting vendor contact:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor contact' },
      { status: 500 }
    )
  }
}
