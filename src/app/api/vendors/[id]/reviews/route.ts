import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// Rating dimensions with weights for aggregate calculation
const RATING_WEIGHTS: Record<string, number> = {
  qualityRating: 0.20,
  timelinessRating: 0.15,
  communicationRating: 0.15,
  professionalismRating: 0.10,
  pricingAccuracyRating: 0.15,
  safetyComplianceRating: 0.10,
  problemResolutionRating: 0.10,
  documentationRating: 0.05
}

function calculateOverallRating(ratings: Record<string, number | null | undefined>): number {
  let totalWeight = 0
  let weightedSum = 0

  for (const [key, weight] of Object.entries(RATING_WEIGHTS)) {
    const rating = ratings[key]
    if (rating !== null && rating !== undefined) {
      weightedSum += rating * weight
      totalWeight += weight
    }
  }

  // If no dimension ratings provided, return 0
  if (totalWeight === 0) return 0

  // Normalize to account for missing ratings
  return Math.round((weightedSum / totalWeight) * 10) / 10
}

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

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Get query params for filtering
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    // Fetch reviews
    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendorId,
        ...(projectId ? { projectId } : {})
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Error fetching vendor reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
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

    const { id: vendorId } = await params
    const body = await request.json()

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Validate project if provided
    if (body.projectId) {
      const project = await prisma.card.findFirst({
        where: {
          id: body.projectId,
          companyId: user.companyId
        }
      })
      if (!project) {
        return NextResponse.json({ error: 'Project not found' }, { status: 404 })
      }
    }

    // Extract ratings
    const ratings = {
      qualityRating: body.qualityRating,
      timelinessRating: body.timelinessRating,
      communicationRating: body.communicationRating,
      professionalismRating: body.professionalismRating,
      pricingAccuracyRating: body.pricingAccuracyRating,
      safetyComplianceRating: body.safetyComplianceRating,
      problemResolutionRating: body.problemResolutionRating,
      documentationRating: body.documentationRating
    }

    // Calculate overall rating from dimension ratings, or use provided overall
    const overallRating = body.overallRating || calculateOverallRating(ratings)

    if (!overallRating || overallRating < 1 || overallRating > 5) {
      return NextResponse.json(
        { error: 'At least one rating is required (1-5 stars)' },
        { status: 400 }
      )
    }

    // Create the review
    const review = await prisma.vendorReview.create({
      data: {
        vendorId,
        reviewerId: user.id,
        projectId: body.projectId || null,
        overallRating,
        qualityRating: body.qualityRating || null,
        timelinessRating: body.timelinessRating || null,
        communicationRating: body.communicationRating || null,
        professionalismRating: body.professionalismRating || null,
        pricingAccuracyRating: body.pricingAccuracyRating || null,
        safetyComplianceRating: body.safetyComplianceRating || null,
        problemResolutionRating: body.problemResolutionRating || null,
        documentationRating: body.documentationRating || null,
        comments: body.comments || null,
        isPublic: body.isPublic || false
      },
      include: {
        reviewer: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            avatar: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    return NextResponse.json(review, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
