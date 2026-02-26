import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET - Get all tags assigned to a vendor
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

    const { id: vendorId } = await params

    // Verify vendor belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      },
      include: {
        serviceTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                category: true
              }
            }
          }
        }
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const tags = vendor.serviceTags.map(st => st.tag)
    return NextResponse.json(tags)

  } catch (error) {
    console.error('Error fetching vendor tags:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor tags' },
      { status: 500 }
    )
  }
}

// PUT - Replace all tags for a vendor (set tags)
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

    const { id: vendorId } = await params
    const body = await request.json()
    const { tagIds } = body as { tagIds: string[] }

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

    // Verify all tags belong to user's company
    if (tagIds && tagIds.length > 0) {
      const validTags = await prisma.vendorServiceTag.count({
        where: {
          id: { in: tagIds },
          companyId: user.companyId
        }
      })

      if (validTags !== tagIds.length) {
        return NextResponse.json({ error: 'One or more tags are invalid' }, { status: 400 })
      }
    }

    // Delete existing tag assignments and create new ones
    await prisma.$transaction([
      prisma.vendorServiceTagAssignment.deleteMany({
        where: { vendorId }
      }),
      ...(tagIds && tagIds.length > 0 ? [
        prisma.vendorServiceTagAssignment.createMany({
          data: tagIds.map((tagId: string) => ({
            vendorId,
            tagId
          }))
        })
      ] : [])
    ])

    // Fetch updated vendor with tags
    const updatedVendor = await prisma.vendor.findFirst({
      where: { id: vendorId },
      include: {
        serviceTags: {
          include: {
            tag: {
              select: {
                id: true,
                name: true,
                description: true,
                color: true,
                category: true
              }
            }
          }
        }
      }
    })

    const tags = updatedVendor?.serviceTags.map(st => st.tag) || []
    return NextResponse.json(tags)

  } catch (error) {
    console.error('Error updating vendor tags:', error)
    return NextResponse.json(
      { error: 'Failed to update vendor tags' },
      { status: 500 }
    )
  }
}

// POST - Add a single tag to a vendor
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

    const { id: vendorId } = await params
    const body = await request.json()
    const { tagId } = body

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

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

    // Verify tag belongs to user's company
    const tag = await prisma.vendorServiceTag.findFirst({
      where: {
        id: tagId,
        companyId: user.companyId
      }
    })

    if (!tag) {
      return NextResponse.json({ error: 'Tag not found' }, { status: 404 })
    }

    // Check if assignment already exists
    const existingAssignment = await prisma.vendorServiceTagAssignment.findUnique({
      where: {
        vendorId_tagId: {
          vendorId,
          tagId
        }
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ error: 'Tag is already assigned to this vendor' }, { status: 409 })
    }

    // Create the assignment
    await prisma.vendorServiceTagAssignment.create({
      data: {
        vendorId,
        tagId
      }
    })

    return NextResponse.json({ success: true }, { status: 201 })

  } catch (error) {
    console.error('Error adding tag to vendor:', error)
    return NextResponse.json(
      { error: 'Failed to add tag to vendor' },
      { status: 500 }
    )
  }
}

// DELETE - Remove a tag from a vendor
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

    const { id: vendorId } = await params
    const { searchParams } = new URL(request.url)
    const tagId = searchParams.get('tagId')

    if (!tagId) {
      return NextResponse.json({ error: 'Tag ID is required' }, { status: 400 })
    }

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

    // Delete the assignment
    await prisma.vendorServiceTagAssignment.deleteMany({
      where: {
        vendorId,
        tagId
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error removing tag from vendor:', error)
    return NextResponse.json(
      { error: 'Failed to remove tag from vendor' },
      { status: 500 }
    )
  }
}
