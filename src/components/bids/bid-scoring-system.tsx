'use client'

import { useState } from 'react'
import { Star, Award, Clock, DollarSign, Shield, FileText, Calculator } from 'lucide-react'

interface Bid {
  id: string
  companyName: string
  contactName: string
  contactEmail: string
  contactPhone?: string
  licenseNumber?: string
  insuranceInfo?: string
  totalAmount?: number
  notes?: string
  timeline?: string
  warranty?: string
  paymentTerms?: string
  lineItems?: string
  hasUploadedFile: boolean
  fileName?: string
  fileUrl?: string
  status: 'SUBMITTED' | 'UNDER_REVIEW' | 'ACCEPTED' | 'REJECTED' | 'WITHDRAWN'
  submittedAt: string
}

interface BidScoringSystemProps {
  bids: Bid[]
  budgetLimit?: number
}

interface ScoringCriteria {
  name: string
  weight: number
  icon: React.ReactNode
  description: string
}

interface BidScore {
  bidId: string
  scores: { [key: string]: number }
  totalScore: number
  weightedScore: number
  rank: number
}

const DEFAULT_CRITERIA: ScoringCriteria[] = [
  {
    name: 'Price Competitiveness',
    weight: 30,
    icon: <DollarSign className="h-4 w-4" />,
    description: 'How competitive is the bid price compared to others and budget'
  },
  {
    name: 'Timeline',
    weight: 20,
    icon: <Clock className="h-4 w-4" />,
    description: 'Proposed timeline and delivery schedule'
  },
  {
    name: 'Credentials',
    weight: 25,
    icon: <Award className="h-4 w-4" />,
    description: 'License, insurance, and professional qualifications'
  },
  {
    name: 'Documentation',
    weight: 15,
    icon: <FileText className="h-4 w-4" />,
    description: 'Quality and completeness of submitted documents'
  },
  {
    name: 'Communication',
    weight: 10,
    icon: <Shield className="h-4 w-4" />,
    description: 'Responsiveness and professionalism in communication'
  }
]

export function BidScoringSystem({ bids, budgetLimit }: BidScoringSystemProps) {
  const [criteria, setCriteria] = useState<ScoringCriteria[]>(DEFAULT_CRITERIA)
  const [manualScores, setManualScores] = useState<{ [bidId: string]: { [criteriaName: string]: number } }>({})

  const calculateAutomaticScore = (bid: Bid, criteriaName: string): number => {
    switch (criteriaName) {
      case 'Price Competitiveness':
        return calculatePriceScore(bid)
      case 'Credentials':
        return calculateCredentialsScore(bid)
      case 'Documentation':
        return calculateDocumentationScore(bid)
      case 'Timeline':
        return calculateTimelineScore(bid)
      default:
        return 0
    }
  }

  const calculatePriceScore = (bid: Bid): number => {
    if (!bid.totalAmount) return 0
    
    const validBids = bids.filter(b => b.totalAmount).map(b => b.totalAmount!)
    if (validBids.length === 0) return 5
    
    const minPrice = Math.min(...validBids)
    const maxPrice = Math.max(...validBids)
    const range = maxPrice - minPrice
    
    if (range === 0) return 10
    
    // Lower price gets higher score (inverted scale)
    const normalizedScore = 1 - ((bid.totalAmount - minPrice) / range)
    
    // Bonus for being within budget
    let budgetBonus = 0
    if (budgetLimit && bid.totalAmount <= budgetLimit) {
      budgetBonus = 2
    }
    
    return Math.min(10, Math.round(normalizedScore * 8 + budgetBonus))
  }

  const calculateCredentialsScore = (bid: Bid): number => {
    let score = 0
    if (bid.licenseNumber) score += 4
    if (bid.insuranceInfo) score += 3
    if (bid.warranty) score += 2
    if (bid.paymentTerms) score += 1
    return Math.min(10, score)
  }

  const calculateDocumentationScore = (bid: Bid): number => {
    let score = 0
    if (bid.hasUploadedFile) score += 4
    if (bid.lineItems) score += 3
    if (bid.notes && bid.notes.length > 50) score += 2
    if (bid.contactPhone) score += 1
    return Math.min(10, score)
  }

  const calculateTimelineScore = (bid: Bid): number => {
    if (!bid.timeline) return 0
    
    // Parse timeline for common patterns
    const timelineText = bid.timeline.toLowerCase()
    
    if (timelineText.includes('week') || timelineText.includes('7 day')) {
      const weeks = parseFloat(timelineText.match(/(\d+)\s*week/)?.[1] || '0')
      if (weeks <= 2) return 10
      if (weeks <= 4) return 8
      if (weeks <= 8) return 6
      if (weeks <= 12) return 4
      return 2
    }
    
    if (timelineText.includes('month')) {
      const months = parseFloat(timelineText.match(/(\d+)\s*month/)?.[1] || '0')
      if (months <= 1) return 9
      if (months <= 2) return 7
      if (months <= 3) return 5
      if (months <= 6) return 3
      return 1
    }
    
    if (timelineText.includes('day')) {
      const days = parseFloat(timelineText.match(/(\d+)\s*day/)?.[1] || '0')
      if (days <= 7) return 10
      if (days <= 14) return 8
      if (days <= 30) return 6
      if (days <= 60) return 4
      return 2
    }
    
    // Default score for having a timeline
    return 5
  }

  const calculateBidScores = (): BidScore[] => {
    const bidScores = bids
      .filter(bid => bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW')
      .map(bid => {
        const scores: { [key: string]: number } = {}
        let totalScore = 0
        let weightedScore = 0

        criteria.forEach(criterion => {
          const manualScore = manualScores[bid.id]?.[criterion.name]
          const automaticScore = calculateAutomaticScore(bid, criterion.name)
          const finalScore = manualScore !== undefined ? manualScore : automaticScore
          
          scores[criterion.name] = finalScore
          totalScore += finalScore
          weightedScore += finalScore * (criterion.weight / 100)
        })

        return {
          bidId: bid.id,
          scores,
          totalScore,
          weightedScore,
          rank: 0 // Will be calculated after sorting
        }
      })

    // Sort by weighted score and assign ranks
    bidScores.sort((a, b) => b.weightedScore - a.weightedScore)
    bidScores.forEach((score, index) => {
      score.rank = index + 1
    })

    return bidScores
  }

  const updateManualScore = (bidId: string, criteriaName: string, score: number) => {
    setManualScores(prev => ({
      ...prev,
      [bidId]: {
        ...prev[bidId],
        [criteriaName]: score
      }
    }))
  }

  const updateCriteriaWeight = (criteriaName: string, weight: number) => {
    setCriteria(prev => prev.map(c => 
      c.name === criteriaName ? { ...c, weight } : c
    ))
  }

  const bidScores = calculateBidScores()
  const totalWeight = criteria.reduce((sum, c) => sum + c.weight, 0)

  return (
    <div className="space-y-6">
      {/* Scoring Criteria Configuration */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Calculator className="h-5 w-5 mr-2" />
          Scoring Criteria
        </h3>
        
        <div className="space-y-4">
          {criteria.map((criterion) => (
            <div key={criterion.name} className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center space-x-2">
                  {criterion.icon}
                  <span className="font-medium">{criterion.name}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="range"
                    min="0"
                    max="50"
                    value={criterion.weight}
                    onChange={(e) => updateCriteriaWeight(criterion.name, parseInt(e.target.value))}
                    className="w-20"
                  />
                  <span className="text-sm font-medium w-12">{criterion.weight}%</span>
                </div>
              </div>
              <p className="text-sm text-gray-600">{criterion.description}</p>
            </div>
          ))}
          <div className="text-sm text-gray-600">
            Total Weight: {totalWeight}% {totalWeight !== 100 && (
              <span className="text-orange-600">(should equal 100%)</span>
            )}
          </div>
        </div>
      </div>

      {/* Bid Scores */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Bid Scores & Rankings</h3>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Rank
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Company
                </th>
                {criteria.map((criterion) => (
                  <th key={criterion.name} className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <div className="flex flex-col items-center">
                      {criterion.icon}
                      <span className="mt-1">{criterion.name}</span>
                      <span className="text-xxs">({criterion.weight}%)</span>
                    </div>
                  </th>
                ))}
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total Score
                </th>
                <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Weighted Score
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {bidScores.map((bidScore) => {
                const bid = bids.find(b => b.id === bidScore.bidId)!
                return (
                  <tr key={bidScore.bidId} className={bidScore.rank === 1 ? 'bg-green-50' : ''}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-sm font-bold ${
                          bidScore.rank === 1 ? 'bg-gold text-white' :
                          bidScore.rank === 2 ? 'bg-gray-400 text-white' :
                          bidScore.rank === 3 ? 'bg-orange-400 text-white' :
                          'bg-gray-200 text-gray-700'
                        }`}>
                          {bidScore.rank}
                        </span>
                        {bidScore.rank === 1 && (
                          <Star className="h-4 w-4 text-yellow-500 ml-1" />
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{bid.companyName}</div>
                        <div className="text-sm text-gray-500">{bid.contactName}</div>
                      </div>
                    </td>
                    {criteria.map((criterion) => (
                      <td key={criterion.name} className="px-3 py-4 whitespace-nowrap text-center">
                        <div className="flex flex-col items-center space-y-1">
                          <input
                            type="number"
                            min="0"
                            max="10"
                            value={manualScores[bid.id]?.[criterion.name] ?? bidScore.scores[criterion.name]}
                            onChange={(e) => updateManualScore(bid.id, criterion.name, parseInt(e.target.value) || 0)}
                            className="w-12 text-center text-sm border rounded px-1 py-0.5"
                          />
                          <span className="text-xs text-gray-500">/10</span>
                        </div>
                      </td>
                    ))}
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-sm font-medium">{bidScore.totalScore.toFixed(1)}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-center">
                      <span className="text-lg font-bold text-primary-600">
                        {bidScore.weightedScore.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recommendations */}
      {bidScores.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recommendations</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-green-50 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                <Star className="h-4 w-4 mr-2" />
                Top Recommended Bid
              </h4>
              {(() => {
                const topBid = bids.find(b => b.id === bidScores[0].bidId)!
                return (
                  <div>
                    <p className="text-green-800">
                      <strong>{topBid.companyName}</strong> with a weighted score of {bidScores[0].weightedScore.toFixed(1)}
                    </p>
                    <p className="text-sm text-green-700 mt-1">
                      Best overall value considering all criteria and their weights.
                    </p>
                  </div>
                )
              })()}
            </div>

            {budgetLimit && (() => {
              const withinBudgetBids = bidScores.filter(bs => {
                const bid = bids.find(b => b.id === bs.bidId)!
                return bid.totalAmount && bid.totalAmount <= budgetLimit
              })
              
              if (withinBudgetBids.length > 0 && withinBudgetBids[0].bidId !== bidScores[0].bidId) {
                const bestBudgetBid = bids.find(b => b.id === withinBudgetBids[0].bidId)!
                return (
                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h4 className="font-medium text-blue-900 mb-2">Best Bid Within Budget</h4>
                    <p className="text-blue-800">
                      <strong>{bestBudgetBid.companyName}</strong> at {new Intl.NumberFormat('en-US', {
                        style: 'currency',
                        currency: 'USD'
                      }).format(bestBudgetBid.totalAmount!)} 
                      (Score: {withinBudgetBids[0].weightedScore.toFixed(1)})
                    </p>
                  </div>
                )
              }
            })()}
          </div>
        </div>
      )}
    </div>
  )
}