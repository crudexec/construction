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

    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendorId: id
      },
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
    })

    const transformedReviews = reviews.map(review => ({
      ...review,
      reviewerName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
      projectName: review.project?.title,
      reviewer: undefined,
      project: undefined
    }))

    return NextResponse.json(transformedReviews)

  } catch (error) {
    console.error('Error fetching vendor reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor reviews' },
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
      overallRating,
      qualityRating,
      timelinessRating,
      communicationRating,
      professionalismRating,
      comments,
      projectId
    } = body

    // Validate ratings are between 1 and 5
    const ratings = [overallRating, qualityRating, timelinessRating, communicationRating, professionalismRating]
    for (const rating of ratings) {
      if (rating < 1 || rating > 5) {
        return NextResponse.json({ error: 'Ratings must be between 1 and 5' }, { status: 400 })
      }
    }

    // Verify project belongs to user's company if provided
    if (projectId) {
      const project = await prisma.card.findFirst({
        where: {
          id: projectId,
          companyId: user.companyId
        }
      })

      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    const review = await prisma.vendorReview.create({
      data: {
        vendorId: id,
        reviewerId: user.id,
        projectId: projectId || null,
        overallRating,
        qualityRating,
        timelinessRating,
        communicationRating,
        professionalismRating,
        comments
      },
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
      }
    })

    const transformedReview = {
      ...review,
      reviewerName: `${review.reviewer.firstName} ${review.reviewer.lastName}`,
      projectName: review.project?.title,
      reviewer: undefined,
      project: undefined
    }

    return NextResponse.json(transformedReview, { status: 201 })

  } catch (error) {
    console.error('Error creating vendor review:', error)
    return NextResponse.json(
      { error: 'Failed to create vendor review' },
      { status: 500 }
    )
  }
}