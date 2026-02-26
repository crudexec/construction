import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
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

    const { id: vendorId, reviewId } = await params
    const body = await request.json()

    // Verify review exists and user is the author
    const existingReview = await prisma.vendorReview.findFirst({
      where: {
        id: reviewId,
        vendorId,
        reviewerId: user.id
      },
      include: {
        vendor: {
          select: { companyId: true }
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found or unauthorized' }, { status: 404 })
    }

    if (existingReview.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Update the review
    const review = await prisma.vendorReview.update({
      where: { id: reviewId },
      data: {
        overallRating: body.overallRating ?? existingReview.overallRating,
        qualityRating: body.qualityRating ?? existingReview.qualityRating,
        timelinessRating: body.timelinessRating ?? existingReview.timelinessRating,
        communicationRating: body.communicationRating ?? existingReview.communicationRating,
        professionalismRating: body.professionalismRating ?? existingReview.professionalismRating,
        pricingAccuracyRating: body.pricingAccuracyRating ?? existingReview.pricingAccuracyRating,
        safetyComplianceRating: body.safetyComplianceRating ?? existingReview.safetyComplianceRating,
        problemResolutionRating: body.problemResolutionRating ?? existingReview.problemResolutionRating,
        documentationRating: body.documentationRating ?? existingReview.documentationRating,
        comments: body.comments ?? existingReview.comments,
        projectId: body.projectId !== undefined ? body.projectId : existingReview.projectId
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

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error updating vendor review:', error)
    return NextResponse.json(
      { error: 'Failed to update review' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; reviewId: string }> }
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

    const { id: vendorId, reviewId } = await params

    // Verify review exists and user is the author (or admin)
    const existingReview = await prisma.vendorReview.findFirst({
      where: {
        id: reviewId,
        vendorId
      },
      include: {
        vendor: {
          select: { companyId: true }
        }
      }
    })

    if (!existingReview) {
      return NextResponse.json({ error: 'Review not found' }, { status: 404 })
    }

    if (existingReview.vendor.companyId !== user.companyId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 })
    }

    // Only author or admin can delete
    if (existingReview.reviewerId !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Not authorized to delete this review' }, { status: 403 })
    }

    await prisma.vendorReview.delete({
      where: { id: reviewId }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor review:', error)
    return NextResponse.json(
      { error: 'Failed to delete review' },
      { status: 500 }
    )
  }
}
