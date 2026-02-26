'use client'

import { useQuery } from '@tanstack/react-query'
import { Star, TrendingUp, TrendingDown, Minus } from 'lucide-react'

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

interface VendorScoreDisplayProps {
  vendorId: string
  size?: 'sm' | 'md' | 'lg'
  showBreakdown?: boolean
}

async function fetchVendorScore(vendorId: string): Promise<AggregateScore> {
  const token = document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1]
  const response = await fetch(`/api/vendors/${vendorId}/score`, {
    headers: { 'Authorization': `Bearer ${token}` }
  })
  if (!response.ok) throw new Error('Failed to fetch score')
  return response.json()
}

const DIMENSION_LABELS: Record<string, string> = {
  quality: 'Quality',
  timeliness: 'Timeliness',
  communication: 'Communication',
  professionalism: 'Professionalism',
  pricingAccuracy: 'Pricing',
  safetyCompliance: 'Safety',
  problemResolution: 'Problem Resolution',
  documentation: 'Documentation'
}

export function VendorScoreDisplay({ vendorId, size = 'md', showBreakdown = false }: VendorScoreDisplayProps) {
  const { data: score, isLoading } = useQuery({
    queryKey: ['vendor-score', vendorId],
    queryFn: () => fetchVendorScore(vendorId),
    enabled: !!vendorId
  })

  if (isLoading) {
    return <div className="animate-pulse bg-gray-200 rounded h-6 w-16"></div>
  }

  if (!score || score.totalReviews === 0) {
    return (
      <div className="text-xs text-gray-400 italic">
        No reviews yet
      </div>
    )
  }

  const sizeClasses = {
    sm: { star: 'h-3 w-3', text: 'text-xs', badge: 'px-1.5 py-0.5' },
    md: { star: 'h-4 w-4', text: 'text-sm', badge: 'px-2 py-1' },
    lg: { star: 'h-5 w-5', text: 'text-base', badge: 'px-3 py-1.5' }
  }

  const classes = sizeClasses[size]

  const TrendIcon = score.recentTrend === 'up' ? TrendingUp : score.recentTrend === 'down' ? TrendingDown : Minus

  return (
    <div className="space-y-2">
      <div className="flex items-center space-x-2">
        <div className={`flex items-center space-x-1 bg-amber-50 rounded-full ${classes.badge}`}>
          <Star className={`${classes.star} fill-amber-400 text-amber-400`} />
          <span className={`font-semibold text-amber-700 ${classes.text}`}>{score.overallScore.toFixed(1)}</span>
        </div>
        <span className={`text-gray-500 ${classes.text}`}>({score.totalReviews} review{score.totalReviews !== 1 ? 's' : ''})</span>
        {score.recentTrend && (
          <TrendIcon className={`${classes.star} ${score.recentTrend === 'up' ? 'text-green-500' : score.recentTrend === 'down' ? 'text-red-500' : 'text-gray-400'}`} />
        )}
      </div>

      {showBreakdown && (
        <div className="grid grid-cols-2 gap-2 mt-3">
          {Object.entries(score.dimensions).map(([key, dim]) => (
            dim.count > 0 && (
              <div key={key} className="flex items-center justify-between text-xs">
                <span className="text-gray-600">{DIMENSION_LABELS[key]}</span>
                <div className="flex items-center space-x-1">
                  <span className="font-medium">{dim.average.toFixed(1)}</span>
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                </div>
              </div>
            )
          ))}
        </div>
      )}
    </div>
  )
}

// Compact badge version for vendor cards
export function VendorScoreBadge({ vendorId }: { vendorId: string }) {
  const { data: score, isLoading } = useQuery({
    queryKey: ['vendor-score', vendorId],
    queryFn: () => fetchVendorScore(vendorId),
    enabled: !!vendorId,
    staleTime: 5 * 60 * 1000
  })

  if (isLoading || !score || score.totalReviews === 0) {
    return null
  }

  return (
    <div className="inline-flex items-center space-x-1 bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full text-xs font-medium">
      <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
      <span>{score.overallScore.toFixed(1)}</span>
    </div>
  )
}
