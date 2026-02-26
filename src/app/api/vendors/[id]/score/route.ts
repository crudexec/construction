import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

interface DimensionScore {
  average: number
  count: number
}

interface AggregateScore {
  overallScore: number
  totalReviews: number
  dimensions: {
    quality: DimensionScore
    timeliness: DimensionScore
    communication: DimensionScore
    professionalism: DimensionScore
    pricingAccuracy: DimensionScore
    safetyCompliance: DimensionScore
    problemResolution: DimensionScore
    documentation: DimensionScore
  }
  recentTrend: 'up' | 'down' | 'stable' | null
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

    // Fetch all reviews for this vendor
    const reviews = await prisma.vendorReview.findMany({
      where: { vendorId },
      orderBy: { createdAt: 'desc' }
    })

    if (reviews.length === 0) {
      return NextResponse.json({
        overallScore: 0,
        totalReviews: 0,
        dimensions: {
          quality: { average: 0, count: 0 },
          timeliness: { average: 0, count: 0 },
          communication: { average: 0, count: 0 },
          professionalism: { average: 0, count: 0 },
          pricingAccuracy: { average: 0, count: 0 },
          safetyCompliance: { average: 0, count: 0 },
          problemResolution: { average: 0, count: 0 },
          documentation: { average: 0, count: 0 }
        },
        recentTrend: null
      } as AggregateScore)
    }

    // Calculate dimension averages
    const calculateDimensionScore = (key: keyof typeof reviews[0]): DimensionScore => {
      const validRatings = reviews
        .map(r => r[key] as number | null)
        .filter((r): r is number => r !== null)
      
      if (validRatings.length === 0) {
        return { average: 0, count: 0 }
      }

      const sum = validRatings.reduce((a, b) => a + b, 0)
      return {
        average: Math.round((sum / validRatings.length) * 10) / 10,
        count: validRatings.length
      }
    }

    const dimensions = {
      quality: calculateDimensionScore('qualityRating'),
      timeliness: calculateDimensionScore('timelinessRating'),
      communication: calculateDimensionScore('communicationRating'),
      professionalism: calculateDimensionScore('professionalismRating'),
      pricingAccuracy: calculateDimensionScore('pricingAccuracyRating'),
      safetyCompliance: calculateDimensionScore('safetyComplianceRating'),
      problemResolution: calculateDimensionScore('problemResolutionRating'),
      documentation: calculateDimensionScore('documentationRating')
    }

    // Calculate overall score from all reviews
    const overallSum = reviews.reduce((sum, r) => sum + r.overallRating, 0)
    const overallScore = Math.round((overallSum / reviews.length) * 10) / 10

    // Calculate trend (compare last 3 reviews vs previous 3)
    let recentTrend: 'up' | 'down' | 'stable' | null = null
    if (reviews.length >= 6) {
      const recent3 = reviews.slice(0, 3)
      const previous3 = reviews.slice(3, 6)
      
      const recentAvg = recent3.reduce((s, r) => s + r.overallRating, 0) / 3
      const previousAvg = previous3.reduce((s, r) => s + r.overallRating, 0) / 3
      
      const diff = recentAvg - previousAvg
      if (diff > 0.3) recentTrend = 'up'
      else if (diff < -0.3) recentTrend = 'down'
      else recentTrend = 'stable'
    }

    const aggregateScore: AggregateScore = {
      overallScore,
      totalReviews: reviews.length,
      dimensions,
      recentTrend
    }

    return NextResponse.json(aggregateScore)
  } catch (error) {
    console.error('Error calculating vendor score:', error)
    return NextResponse.json(
      { error: 'Failed to calculate score' },
      { status: 500 }
    )
  }
}
