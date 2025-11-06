'use client'

import { TrendingUp, TrendingDown, DollarSign, Clock, Award, AlertTriangle, BarChart3 } from 'lucide-react'

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

interface BidAnalyticsProps {
  bids: Bid[]
  budgetLimit?: number
}

export function BidAnalytics({ bids, budgetLimit }: BidAnalyticsProps) {
  const validBids = bids.filter(bid => bid.totalAmount && bid.totalAmount > 0)
  
  if (validBids.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Bid Analytics
        </h3>
        <div className="text-center py-8">
          <AlertTriangle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-600">No bid amounts available for analysis</p>
        </div>
      </div>
    )
  }

  const amounts = validBids.map(bid => bid.totalAmount!)
  const average = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
  const min = Math.min(...amounts)
  const max = Math.max(...amounts)
  const median = [...amounts].sort((a, b) => a - b)[Math.floor(amounts.length / 2)]

  // Calculate distribution
  const buckets = 5
  const range = max - min
  const bucketSize = range / buckets
  const distribution = Array(buckets).fill(0)
  
  amounts.forEach(amount => {
    const bucketIndex = Math.min(Math.floor((amount - min) / bucketSize), buckets - 1)
    distribution[bucketIndex]++
  })

  // Calculate trends
  const sortedByDate = [...validBids].sort((a, b) => 
    new Date(a.submittedAt).getTime() - new Date(b.submittedAt).getTime()
  )
  
  const recentBids = sortedByDate.slice(-3)
  const earlierBids = sortedByDate.slice(0, -3)
  
  let trend = 'stable'
  if (recentBids.length >= 2 && earlierBids.length >= 2) {
    const recentAvg = recentBids.reduce((sum, bid) => sum + bid.totalAmount!, 0) / recentBids.length
    const earlierAvg = earlierBids.reduce((sum, bid) => sum + bid.totalAmount!, 0) / earlierBids.length
    
    if (recentAvg > earlierAvg * 1.1) trend = 'increasing'
    else if (recentAvg < earlierAvg * 0.9) trend = 'decreasing'
  }

  // Quality metrics
  const withDocuments = bids.filter(bid => bid.hasUploadedFile).length
  const withLicense = bids.filter(bid => bid.licenseNumber).length
  const withInsurance = bids.filter(bid => bid.insuranceInfo).length
  const withTimeline = bids.filter(bid => bid.timeline).length

  const formatCurrency = (amount: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount)

  const getBudgetStatus = () => {
    if (!budgetLimit) return null
    
    const withinBudget = validBids.filter(bid => bid.totalAmount! <= budgetLimit).length
    const overBudget = validBids.length - withinBudget
    
    return { withinBudget, overBudget, percentage: (withinBudget / validBids.length) * 100 }
  }

  const budgetStatus = getBudgetStatus()

  return (
    <div className="space-y-6">
      {/* Overview Stats */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <BarChart3 className="h-5 w-5 mr-2" />
          Bid Analytics Overview
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">{formatCurrency(average)}</div>
            <div className="text-sm text-gray-600">Average Bid</div>
            <div className={`flex items-center justify-center mt-1 text-sm ${
              trend === 'increasing' ? 'text-red-600' : 
              trend === 'decreasing' ? 'text-green-600' : 'text-gray-600'
            }`}>
              {trend === 'increasing' && <TrendingUp className="h-4 w-4 mr-1" />}
              {trend === 'decreasing' && <TrendingDown className="h-4 w-4 mr-1" />}
              {trend === 'stable' ? 'Stable' : 
               trend === 'increasing' ? 'Trending Up' : 'Trending Down'}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{formatCurrency(median)}</div>
            <div className="text-sm text-gray-600">Median Bid</div>
            <div className="text-xs text-gray-500 mt-1">
              50% of bids are below this amount
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{formatCurrency(max - min)}</div>
            <div className="text-sm text-gray-600">Price Range</div>
            <div className="text-xs text-gray-500 mt-1">
              {formatCurrency(min)} - {formatCurrency(max)}
            </div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-600">{validBids.length}</div>
            <div className="text-sm text-gray-600">Valid Bids</div>
            <div className="text-xs text-gray-500 mt-1">
              {((validBids.length / bids.length) * 100).toFixed(1)}% with amounts
            </div>
          </div>
        </div>
      </div>

      {/* Budget Analysis */}
      {budgetStatus && (
        <div className="bg-white rounded-lg shadow p-6">
          <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
            <DollarSign className="h-5 w-5 mr-2" />
            Budget Analysis
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center p-4 bg-gray-50 rounded-lg">
              <div className="text-xl font-bold text-gray-900">{formatCurrency(budgetLimit)}</div>
              <div className="text-sm text-gray-600">Budget Limit</div>
            </div>
            
            <div className="text-center p-4 bg-green-50 rounded-lg">
              <div className="text-xl font-bold text-green-600">{budgetStatus.withinBudget}</div>
              <div className="text-sm text-gray-600">Within Budget</div>
              <div className="text-xs text-gray-500">{budgetStatus.percentage.toFixed(1)}%</div>
            </div>
            
            <div className="text-center p-4 bg-red-50 rounded-lg">
              <div className="text-xl font-bold text-red-600">{budgetStatus.overBudget}</div>
              <div className="text-sm text-gray-600">Over Budget</div>
              <div className="text-xs text-gray-500">{(100 - budgetStatus.percentage).toFixed(1)}%</div>
            </div>
          </div>
          
          {budgetStatus.withinBudget > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Recommendation:</strong> You have {budgetStatus.withinBudget} bid(s) within your budget. 
                The average of budget-compliant bids is {formatCurrency(
                  validBids
                    .filter(bid => bid.totalAmount! <= budgetLimit)
                    .reduce((sum, bid) => sum + bid.totalAmount!, 0) / budgetStatus.withinBudget
                )}.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Price Distribution */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Price Distribution</h4>
        
        <div className="space-y-3">
          {distribution.map((count, index) => {
            const bucketMin = min + (index * bucketSize)
            const bucketMax = min + ((index + 1) * bucketSize)
            const percentage = (count / validBids.length) * 100
            
            return (
              <div key={index} className="flex items-center space-x-3">
                <div className="w-32 text-sm text-gray-600">
                  {formatCurrency(bucketMin)} - {formatCurrency(bucketMax)}
                </div>
                <div className="flex-1 bg-gray-200 rounded-full h-6 relative">
                  <div 
                    className="bg-primary-600 h-6 rounded-full flex items-center justify-end pr-2"
                    style={{ width: `${Math.max(percentage, 5)}%` }}
                  >
                    {count > 0 && (
                      <span className="text-xs text-white font-medium">{count}</span>
                    )}
                  </div>
                </div>
                <div className="w-12 text-sm text-gray-600 text-right">
                  {percentage.toFixed(0)}%
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Quality Metrics */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
          <Award className="h-5 w-5 mr-2" />
          Bid Quality Metrics
        </h4>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-blue-600">{withDocuments}</div>
            <div className="text-sm text-gray-600">With Documents</div>
            <div className="text-xs text-gray-500">
              {((withDocuments / bids.length) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-green-600">{withLicense}</div>
            <div className="text-sm text-gray-600">Licensed</div>
            <div className="text-xs text-gray-500">
              {((withLicense / bids.length) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-purple-600">{withInsurance}</div>
            <div className="text-sm text-gray-600">Insured</div>
            <div className="text-xs text-gray-500">
              {((withInsurance / bids.length) * 100).toFixed(0)}%
            </div>
          </div>
          
          <div className="text-center p-4 border rounded-lg">
            <div className="text-2xl font-bold text-orange-600">{withTimeline}</div>
            <div className="text-sm text-gray-600">With Timeline</div>
            <div className="text-xs text-gray-500">
              {((withTimeline / bids.length) * 100).toFixed(0)}%
            </div>
          </div>
        </div>
        
        <div className="mt-4 p-3 bg-gray-50 rounded-lg">
          <p className="text-sm text-gray-700">
            <strong>Quality Score:</strong> Based on documentation, licensing, and completeness, 
            the average quality of submissions is{' '}
            <span className="font-semibold">
              {(((withDocuments + withLicense + withInsurance + withTimeline) / (bids.length * 4)) * 100).toFixed(0)}%
            </span>
          </p>
        </div>
      </div>

      {/* Recommendations */}
      <div className="bg-white rounded-lg shadow p-6">
        <h4 className="text-lg font-medium text-gray-900 mb-4">Analysis Insights</h4>
        
        <div className="space-y-3">
          {validBids.length >= 3 && (
            <div className="p-3 bg-blue-50 rounded-lg">
              <p className="text-sm text-blue-800">
                <strong>Market Competitiveness:</strong> You have {validBids.length} competitive bids 
                with a {((max - min) / average * 100).toFixed(0)}% price spread. 
                {(max - min) / average < 0.3 ? 'This suggests a competitive market.' : 'This indicates varied pricing strategies.'}
              </p>
            </div>
          )}
          
          {budgetStatus && budgetStatus.percentage < 50 && (
            <div className="p-3 bg-yellow-50 rounded-lg">
              <p className="text-sm text-yellow-800">
                <strong>Budget Alert:</strong> Only {budgetStatus.percentage.toFixed(0)}% of bids are within your budget. 
                Consider adjusting your budget or requirements to increase viable options.
              </p>
            </div>
          )}
          
          {withDocuments / bids.length < 0.5 && (
            <div className="p-3 bg-orange-50 rounded-lg">
              <p className="text-sm text-orange-800">
                <strong>Documentation:</strong> Only {((withDocuments / bids.length) * 100).toFixed(0)}% of bidders provided supporting documents. 
                Consider requiring documentation for better evaluation.
              </p>
            </div>
          )}
          
          {trend === 'increasing' && (
            <div className="p-3 bg-red-50 rounded-lg">
              <p className="text-sm text-red-800">
                <strong>Price Trend:</strong> Recent bids are trending higher. 
                Consider closing the bidding process soon to avoid further price increases.
              </p>
            </div>
          )}
          
          {trend === 'decreasing' && (
            <div className="p-3 bg-green-50 rounded-lg">
              <p className="text-sm text-green-800">
                <strong>Price Trend:</strong> Recent bids are trending lower. 
                This is favorable for your budget - you may get even better deals if you wait.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}