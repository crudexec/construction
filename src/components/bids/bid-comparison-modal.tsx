'use client'

import { useState } from 'react'
import { X, Check, Scale, TrendingUp, TrendingDown, Award, AlertTriangle } from 'lucide-react'

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

interface BidComparisonModalProps {
  isOpen: boolean
  onClose: () => void
  bids: Bid[]
  onUpdateBidStatus: (bidId: string, status: 'ACCEPTED' | 'REJECTED') => void
}

export function BidComparisonModal({ isOpen, onClose, bids, onUpdateBidStatus }: BidComparisonModalProps) {
  const [selectedBids, setSelectedBids] = useState<string[]>([])

  if (!isOpen) return null

  const availableBids = bids.filter(bid => 
    bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW'
  )

  const handleBidSelection = (bidId: string) => {
    setSelectedBids(prev => {
      if (prev.includes(bidId)) {
        return prev.filter(id => id !== bidId)
      } else if (prev.length < 3) {
        return [...prev, bidId]
      }
      return prev
    })
  }

  const selectedBidData = selectedBids.map(id => 
    availableBids.find(bid => bid.id === id)
  ).filter(Boolean) as Bid[]

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  const getBidRanking = () => {
    const validBids = selectedBidData.filter(bid => bid.totalAmount)
    const sortedByPrice = [...validBids].sort((a, b) => (a.totalAmount || 0) - (b.totalAmount || 0))
    
    return selectedBidData.map(bid => {
      if (!bid.totalAmount) return { rank: null, isLowest: false, isHighest: false }
      const rank = sortedByPrice.findIndex(b => b.id === bid.id) + 1
      return {
        rank,
        isLowest: rank === 1,
        isHighest: rank === sortedByPrice.length
      }
    })
  }

  const rankings = getBidRanking()

  const getComparisonMetrics = () => {
    const amounts = selectedBidData
      .map(bid => bid.totalAmount)
      .filter(amount => amount !== undefined) as number[]
    
    if (amounts.length < 2) return null

    const avg = amounts.reduce((sum, amount) => sum + amount, 0) / amounts.length
    const min = Math.min(...amounts)
    const max = Math.max(...amounts)
    const range = max - min
    const savings = max - min

    return { avg, min, max, range, savings }
  }

  const metrics = getComparisonMetrics()

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg max-w-7xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-6 border-b">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Bid Comparison</h2>
            <p className="text-sm text-gray-600">
              Select up to 3 bids to compare side-by-side
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        <div className="p-6">
          {/* Bid Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
              <Scale className="h-5 w-5 mr-2" />
              Select Bids to Compare ({selectedBids.length}/3)
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {availableBids.map((bid) => (
                <div
                  key={bid.id}
                  className={`border rounded-lg p-4 cursor-pointer transition-colors ${
                    selectedBids.includes(bid.id)
                      ? 'border-primary-500 bg-primary-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleBidSelection(bid.id)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <h4 className="font-medium text-gray-900">{bid.companyName}</h4>
                    {selectedBids.includes(bid.id) && (
                      <Check className="h-5 w-5 text-primary-600" />
                    )}
                  </div>
                  <p className="text-sm text-gray-600">{bid.contactName}</p>
                  <p className="text-lg font-semibold text-green-600 mt-2">
                    {formatCurrency(bid.totalAmount)}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Comparison Metrics */}
          {selectedBidData.length >= 2 && metrics && (
            <div className="mb-6 p-4 bg-gray-50 rounded-lg">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Comparison Metrics
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="text-center">
                  <p className="text-sm text-gray-600">Lowest Bid</p>
                  <p className="text-lg font-semibold text-green-600">{formatCurrency(metrics.min)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Highest Bid</p>
                  <p className="text-lg font-semibold text-red-600">{formatCurrency(metrics.max)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Average</p>
                  <p className="text-lg font-semibold text-blue-600">{formatCurrency(metrics.avg)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Price Range</p>
                  <p className="text-lg font-semibold text-purple-600">{formatCurrency(metrics.range)}</p>
                </div>
                <div className="text-center">
                  <p className="text-sm text-gray-600">Potential Savings</p>
                  <p className="text-lg font-semibold text-orange-600">{formatCurrency(metrics.savings)}</p>
                </div>
              </div>
            </div>
          )}

          {/* Side-by-Side Comparison */}
          {selectedBidData.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Detailed Comparison
              </h3>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Criteria
                      </th>
                      {selectedBidData.map((bid, index) => (
                        <th key={bid.id} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          <div className="flex items-center space-x-2">
                            <span>{bid.companyName}</span>
                            {rankings[index]?.isLowest && (
                              <span title="Lowest bid">
                                <TrendingDown className="h-4 w-4 text-green-600" />
                              </span>
                            )}
                            {rankings[index]?.isHighest && (
                              <span title="Highest bid">
                                <TrendingUp className="h-4 w-4 text-red-600" />
                              </span>
                            )}
                          </div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Bid Amount
                      </td>
                      {selectedBidData.map((bid, index) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span className={`font-semibold ${
                              rankings[index]?.isLowest ? 'text-green-600' : 
                              rankings[index]?.isHighest ? 'text-red-600' : 'text-gray-900'
                            }`}>
                              {formatCurrency(bid.totalAmount)}
                            </span>
                            {rankings[index]?.rank && (
                              <span className="text-xs text-gray-500">#{rankings[index].rank}</span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Contact
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <p className="font-medium">{bid.contactName}</p>
                            <p className="text-gray-600">{bid.contactEmail}</p>
                            {bid.contactPhone && (
                              <p className="text-gray-600">{bid.contactPhone}</p>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Timeline
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bid.timeline || 'Not specified'}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        License
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{bid.licenseNumber || 'Not provided'}</span>
                            {bid.licenseNumber && (
                              <Award className="h-4 w-4 text-green-600" />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Insurance
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-1">
                            <span>{bid.insuranceInfo || 'Not provided'}</span>
                            {bid.insuranceInfo && (
                              <Award className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        Warranty
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {bid.warranty || 'Not specified'}
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Documents
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 text-sm text-gray-900">
                          {bid.hasUploadedFile ? (
                            <div className="flex items-center space-x-1 text-green-600">
                              <Check className="h-4 w-4" />
                              <span>Attached</span>
                            </div>
                          ) : (
                            <div className="flex items-center space-x-1 text-yellow-600">
                              <AlertTriangle className="h-4 w-4" />
                              <span>None</span>
                            </div>
                          )}
                        </td>
                      ))}
                    </tr>
                    <tr className="bg-gray-50">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        Notes
                      </td>
                      {selectedBidData.map((bid) => (
                        <td key={bid.id} className="px-6 py-4 text-sm text-gray-900">
                          <div className="max-w-xs">
                            {bid.notes ? (
                              <p className="truncate" title={bid.notes}>
                                {bid.notes}
                              </p>
                            ) : (
                              <span className="text-gray-500">No notes</span>
                            )}
                          </div>
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          {selectedBidData.length > 0 && (
            <div className="border-t pt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">
                Quick Actions
              </h3>
              <div className="space-y-4">
                {selectedBidData.map((bid) => (
                  <div key={bid.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <h4 className="font-medium text-gray-900">{bid.companyName}</h4>
                      <p className="text-sm text-gray-600">
                        {formatCurrency(bid.totalAmount)} • {bid.contactName}
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onUpdateBidStatus(bid.id, 'ACCEPTED')}
                        className="px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        Accept
                      </button>
                      <button
                        onClick={() => onUpdateBidStatus(bid.id, 'REJECTED')}
                        className="px-4 py-2 text-sm bg-red-600 text-white rounded hover:bg-red-700"
                      >
                        Reject
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="border-t p-6 bg-gray-50">
          <div className="flex justify-end">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm text-gray-700 bg-white border border-gray-300 rounded hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}