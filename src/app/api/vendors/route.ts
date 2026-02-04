import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    // Get vendors with aggregated data
    const vendors = await prisma.vendor.findMany({
      where: {
        companyId: user.companyId
      },
      include: {
        reviews: {
          select: {
            overallRating: true
          }
        },
        projectVendors: {
          select: {
            id: true
          }
        },
        _count: {
          select: {
            projectVendors: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    // Calculate average ratings
    const vendorsWithStats = vendors.map(vendor => {
      const ratings = vendor.reviews.map(review => review.overallRating)
      const averageRating = ratings.length > 0 
        ? ratings.reduce((sum, rating) => sum + rating, 0) / ratings.length
        : null

      return {
        id: vendor.id,
        name: vendor.name,
        companyName: vendor.companyName,
        email: vendor.email,
        phone: vendor.phone,
        type: vendor.type,
        isActive: vendor.isActive,
        contractStartDate: vendor.contractStartDate,
        contractEndDate: vendor.contractEndDate,
        averageRating,
        totalProjects: vendor._count.projectVendors,
        createdAt: vendor.createdAt
      }
    })

    return NextResponse.json(vendorsWithStats)

  } catch (error) {
    console.error('Error fetching vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendors' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    
    const {
      name,
      companyName,
      email,
      phone,
      address,
      city,
      state,
      zipCode,
      website,
      licenseNumber,
      insuranceInfo,
      type,
      scopeOfWork,
      paymentTerms,
      contractStartDate,
      contractEndDate,
      notes,
      contacts = []
    } = body

    // Create vendor with contacts
    const vendor = await prisma.vendor.create({
      data: {
        name,
        companyName,
        email,
        phone,
        address,
        city,
        state,
        zipCode,
        website,
        licenseNumber,
        insuranceInfo,
        type,
        scopeOfWork,
        paymentTerms,
        contractStartDate: contractStartDate ? new Date(contractStartDate) : null,
        contractEndDate: contractEndDate ? new Date(contractEndDate) : null,
        notes,
        companyId: user.companyId,
        contacts: {
          create: contacts.map((contact: any) => ({
            firstName: contact.firstName,
            lastName: contact.lastName,
            email: contact.email,
            phone: contact.phone,
            position: contact.position,
            isPrimary: contact.isPrimary || false,
            isBilling: contact.isBilling || false
          }))
        }
      },
      include: {
        contacts: true
      }
    })

    return NextResponse.json(vendor, { status: 201 })

  } catch (error) {
    console.error('Error creating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor' },
      { status: 500 }
    )
  }
}