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

    const vendor = await prisma.vendor.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      },
      include: {
        contacts: {
          orderBy: [
            { isPrimary: 'desc' },
            { firstName: 'asc' }
          ]
        },
        reviews: {
          include: {
            reviewer: {
              select: {
                firstName: true,
                lastName: true
              }
            },
            project: {
              select: {
                title: true
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        projectVendors: {
          include: {
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
          }
        },
        milestones: {
          include: {
            projectVendor: {
              include: {
                project: {
                  select: {
                    id: true,
                    title: true
                  }
                }
              }
            }
          },
          orderBy: {
            createdAt: 'desc'
          }
        },
        _count: {
          select: {
            projectVendors: true,
            reviews: true,
            milestones: true
          }
        }
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Transform the response to match the expected format
    const transformedVendor = {
      ...vendor,
      reviews: vendor.reviews.map(review => ({
        ...review,
        reviewerName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
        projectName: review.project?.title,
        reviewer: undefined, // Remove the nested object
        project: undefined   // Remove the nested object from review
      }))
    }

    return NextResponse.json(transformedVendor)

  } catch (error) {
    console.error('Error fetching vendor:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor' },
      { status: 500 }
    )
  }
}

export async function PUT(
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

    // Check if vendor exists and belongs to user's company
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
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
      isActive
    } = body

    const vendor = await prisma.vendor.update({
      where: {
        id: id
      },
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
        isActive
      },
      include: {
        contacts: true
      }
    })

    return NextResponse.json(vendor)

  } catch (error) {
    console.error('Error updating vendor:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
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

    // Check if vendor exists and belongs to user's company
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      },
      include: {
        _count: {
          select: {
            projectVendors: true,
            reviews: true,
            milestones: true
          }
        }
      }
    })

    if (!existingVendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Check if vendor has associated data that would prevent deletion
    const hasAssociatedData = existingVendor._count.projectVendors > 0 || 
                            existingVendor._count.reviews > 0 || 
                            existingVendor._count.milestones > 0

    if (hasAssociatedData) {
      // Instead of hard delete, mark as inactive
      const vendor = await prisma.vendor.update({
        where: {
          id: id
        },
        data: {
          isActive: false
        }
      })
      
      return NextResponse.json({
        message: 'Vendor has associated data and has been marked as inactive instead of deleted',
        vendor
      })
    }

    // Safe to delete if no associated data
    await prisma.vendor.delete({
      where: {
        id: id
      }
    })

    return NextResponse.json({ message: 'Vendor deleted successfully' })

  } catch (error) {
    console.error('Error deleting vendor:', error)
    return NextResponse.json(
      { error: 'Failed to delete vendor' },
      { status: 500 }
    )
  }
}