import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get all reviews for this vendor
    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        id: true,
        overallRating: true,
        qualityRating: true,
        timelinessRating: true,
        communicationRating: true,
        professionalismRating: true,
        comments: true,
        createdAt: true,
        project: {
          select: {
            id: true,
            title: true
          }
        }
        // Note: reviewer info is NOT included for privacy
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    // Calculate average ratings
    const totalReviews = reviews.length

    if (totalReviews === 0) {
      return NextResponse.json({
        reviews: [],
        averageRatings: null,
        totalReviews: 0,
        ratingDistribution: {
          1: 0,
          2: 0,
          3: 0,
          4: 0,
          5: 0
        }
      })
    }

    const sumRatings = reviews.reduce(
      (acc, review) => ({
        overall: acc.overall + review.overallRating,
        quality: acc.quality + (review.qualityRating || 0),
        timeliness: acc.timeliness + (review.timelinessRating || 0),
        communication: acc.communication + (review.communicationRating || 0),
        professionalism: acc.professionalism + (review.professionalismRating || 0)
      }),
      { overall: 0, quality: 0, timeliness: 0, communication: 0, professionalism: 0 }
    )

    const qualityCount = reviews.filter(r => r.qualityRating !== null).length
    const timelinessCount = reviews.filter(r => r.timelinessRating !== null).length
    const communicationCount = reviews.filter(r => r.communicationRating !== null).length
    const professionalismCount = reviews.filter(r => r.professionalismRating !== null).length

    const averageRatings = {
      overall: Number((sumRatings.overall / totalReviews).toFixed(2)),
      quality: qualityCount > 0 ? Number((sumRatings.quality / qualityCount).toFixed(2)) : null,
      timeliness: timelinessCount > 0 ? Number((sumRatings.timeliness / timelinessCount).toFixed(2)) : null,
      communication: communicationCount > 0 ? Number((sumRatings.communication / communicationCount).toFixed(2)) : null,
      professionalism: professionalismCount > 0 ? Number((sumRatings.professionalism / professionalismCount).toFixed(2)) : null
    }

    // Calculate rating distribution (based on overall rating)
    const ratingDistribution = {
      1: reviews.filter(r => Math.round(r.overallRating) === 1).length,
      2: reviews.filter(r => Math.round(r.overallRating) === 2).length,
      3: reviews.filter(r => Math.round(r.overallRating) === 3).length,
      4: reviews.filter(r => Math.round(r.overallRating) === 4).length,
      5: reviews.filter(r => Math.round(r.overallRating) === 5).length
    }

    return NextResponse.json({
      reviews,
      averageRatings,
      totalReviews,
      ratingDistribution
    })

  } catch (error) {
    console.error('Vendor ratings error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch ratings' },
      { status: 500 }
    )
  }
}
