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

    // Parse query parameters for filtering
    const { searchParams } = new URL(request.url)
    const tagIds = searchParams.get('tagIds')?.split(',').filter(Boolean) || []
    const categoryId = searchParams.get('categoryId')
    const minRating = searchParams.get('minRating') ? parseFloat(searchParams.get('minRating')!) : null

    // Build where clause
    const whereClause: any = {
      companyId: user.companyId
    }

    // Filter by tags if provided
    if (tagIds.length > 0) {
      whereClause.serviceTags = {
        some: {
          tagId: { in: tagIds }
        }
      }
    }

    // Filter by category if provided
    if (categoryId) {
      whereClause.categoryId = categoryId
    }

    // Get vendors with aggregated data
    const vendors = await prisma.vendor.findMany({
      where: whereClause,
      include: {
        reviews: {
          select: {
            overallRating: true
          }
        },
        projectVendors: {
          select: {
            id: true,
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          },
          orderBy: {
            assignedAt: 'desc'
          },
          take: 5
        },
        contacts: {
          where: {
            isPrimary: true
          },
          take: 1,
          select: {
            firstName: true,
            lastName: true,
            email: true,
            phone: true,
            position: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true,
            csiDivision: true
          }
        },
        serviceTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                color: true,
                category: true
              }
            }
          }
        },
        _count: {
          select: {
            projectVendors: true
          }
        }
      },
      orderBy: {
        companyName: 'asc'
      }
    })

    // Calculate average ratings and include primary contact + tags
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
        category: vendor.category,
        isActive: vendor.isActive,
        contractStartDate: vendor.contractStartDate,
        contractEndDate: vendor.contractEndDate,
        averageRating,
        totalProjects: vendor._count.projectVendors,
        projects: vendor.projectVendors.map((pv: { project: { id: string; title: string; status: string } }) => ({
          id: pv.project.id,
          title: pv.project.title,
          status: pv.project.status
        })),
        createdAt: vendor.createdAt,
        primaryContact: vendor.contacts[0] || null,
        tags: vendor.serviceTags.map(st => st.tag)
      }
    })

    // Apply minimum rating filter if specified
    const filteredVendors = minRating !== null
      ? vendorsWithStats.filter(v => v.averageRating !== null && v.averageRating >= minRating)
      : vendorsWithStats

    return NextResponse.json(filteredVendors)

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
      categoryId,
      scopeOfWork,
      paymentTerms,
      contractStartDate,
      contractEndDate,
      notes,
      contacts = [],
      tagIds = []
    } = body

    // Create vendor with contacts and tags
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
        categoryId: categoryId || null,
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
        },
        serviceTags: {
          create: tagIds.map((tagId: string) => ({
            tagId
          }))
        }
      },
      include: {
        contacts: true,
        category: true,
        serviceTags: {
          include: {
            tag: true
          }
        }
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