'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { 
  ArrowLeft,
  Copy,
  Eye,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Building,
  Phone,
  Mail,
  Download,
  CheckCircle,
  XCircle,
  MoreHorizontal,
  Edit,
  Trash2,
  AlertCircle,
  ExternalLink,
  Scale,
  Calculator,
  BarChart3
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { BidComparisonModal } from '@/components/bids/bid-comparison-modal'
import { BidScoringSystem } from '@/components/bids/bid-scoring-system'
import { BidAnalytics } from '@/components/bids/bid-analytics'

interface BidRequest {
  id: string
  title: string
  description: string
  location?: string
  timeline?: string
  requirements?: string
  deadline?: string
  budget?: number
  shareToken: string
  isActive: boolean
  createdAt: string
  creator: {
    firstName: string
    lastName: string
  }
  company: {
    name: string
  }
  bids: Bid[]
  views: BidView[]
  _count: {
    bids: number
    views: number
  }
}

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

interface BidView {
  id: string
  ipAddress: string
  userAgent: string
  viewedAt: string
}

async function fetchBidRequestDetail(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/bid-requests/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch bid request details')
  return response.json()
}

async function updateBidStatus(bidId: string, status: 'ACCEPTED' | 'REJECTED') {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/bids/${bidId}/status`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ status }),
  })
  if (!response.ok) throw new Error('Failed to update bid status')
  return response.json()
}

export default function BidRequestDetailPage() {
  const params = useParams()
  const router = useRouter()
  const [selectedBidForAction, setSelectedBidForAction] = useState<string | null>(null)
  const [showComparisonModal, setShowComparisonModal] = useState(false)
  const [activeTab, setActiveTab] = useState<'bids' | 'comparison' | 'scoring' | 'analytics'>('bids')
  const queryClient = useQueryClient()
  
  const bidRequestId = params.id as string

  const { data: bidRequestData, isLoading } = useQuery({
    queryKey: ['bid-request-detail', bidRequestId],
    queryFn: () => fetchBidRequestDetail(bidRequestId),
    enabled: !!bidRequestId
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ bidId, status }: { bidId: string; status: 'ACCEPTED' | 'REJECTED' }) => 
      updateBidStatus(bidId, status),
    onSuccess: () => {
      toast.success('Bid status updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['bid-request-detail', bidRequestId] })
      setSelectedBidForAction(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update bid status')
    }
  })

  const copyShareUrl = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/bid/${shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const getDaysRemaining = (deadline?: string) => {
    if (!deadline) return null
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'SUBMITTED': return 'bg-blue-100 text-blue-800'
      case 'UNDER_REVIEW': return 'bg-yellow-100 text-yellow-800'
      case 'ACCEPTED': return 'bg-green-100 text-green-800'
      case 'REJECTED': return 'bg-red-100 text-red-800'
      case 'WITHDRAWN': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatCurrency = (amount?: number) => {
    if (!amount) return 'Not specified'
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!bidRequestData?.bidRequest) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Bid Request Not Found</h3>
        <p className="text-gray-600 mb-4">The bid request you're looking for doesn't exist or you don't have access to it.</p>
        <Link 
          href="/dashboard/bids"
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Bids
        </Link>
      </div>
    )
  }

  const bidRequest = bidRequestData.bidRequest
  const daysRemaining = getDaysRemaining(bidRequest.deadline)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link 
            href="/dashboard/bids"
            className="text-gray-400 hover:text-gray-600"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{bidRequest.title}</h1>
            <p className="text-gray-600">
              Created by {bidRequest.creator.firstName} {bidRequest.creator.lastName} • 
              {new Date(bidRequest.createdAt).toLocaleDateString()}
            </p>
          </div>
        </div>
        
        <div className="flex items-center space-x-3">
          <button
            onClick={() => copyShareUrl(bidRequest.shareToken)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
          >
            <Copy className="h-4 w-4 mr-2" />
            Copy Share Link
          </button>
          <Link
            href={`/bid/${bidRequest.shareToken}`}
            target="_blank"
            className="inline-flex items-center px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Preview
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Bids</p>
              <p className="text-2xl font-bold text-gray-900">{bidRequest._count.bids}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">{bidRequest._count.views}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Status</p>
              <p className="text-lg font-semibold text-gray-900">
                {!bidRequest.isActive ? 'Inactive' :
                 daysRemaining === null ? 'Active' :
                 daysRemaining < 0 ? 'Expired' :
                 daysRemaining === 0 ? 'Due Today' :
                 `${daysRemaining} days left`}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Budget</p>
              <p className="text-lg font-semibold text-gray-900">
                {formatCurrency(bidRequest.budget)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Project Details */}
      <div className="bg-white rounded-lg shadow p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-4">Project Details</h3>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-900 mb-2">Description</h4>
            <p className="text-gray-600 whitespace-pre-wrap">{bidRequest.description}</p>
          </div>
          
          <div className="space-y-4">
            {bidRequest.location && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  <MapPin className="inline h-4 w-4 mr-1" />
                  Location
                </h4>
                <p className="text-gray-600">{bidRequest.location}</p>
              </div>
            )}
            
            {bidRequest.timeline && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  <Clock className="inline h-4 w-4 mr-1" />
                  Timeline
                </h4>
                <p className="text-gray-600">{bidRequest.timeline}</p>
              </div>
            )}
            
            {bidRequest.deadline && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Deadline
                </h4>
                <p className="text-gray-600">
                  {new Date(bidRequest.deadline).toLocaleString()}
                  {daysRemaining !== null && (
                    <span className={`ml-2 px-2 py-1 text-xs rounded-full ${
                      daysRemaining < 0 ? 'bg-red-100 text-red-800' :
                      daysRemaining <= 3 ? 'bg-yellow-100 text-yellow-800' :
                      'bg-green-100 text-green-800'
                    }`}>
                      {daysRemaining < 0 ? 'Expired' :
                       daysRemaining === 0 ? 'Due Today' :
                       `${daysRemaining} days left`}
                    </span>
                  )}
                </p>
              </div>
            )}
            
            {bidRequest.requirements && (
              <div>
                <h4 className="font-medium text-gray-900 mb-1">Special Requirements</h4>
                <p className="text-gray-600 whitespace-pre-wrap">{bidRequest.requirements}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Bid Management Tabs */}
      <div className="bg-white rounded-lg shadow">
        {/* Tab Navigation */}
        <div className="border-b border-gray-200">
          <nav className="px-6 flex space-x-8">
            <button
              onClick={() => setActiveTab('bids')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'bids'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Users className="inline h-4 w-4 mr-2" />
              All Bids ({bidRequest.bids.length})
            </button>
            {bidRequest.bids.filter(bid => bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW').length >= 2 && (
              <>
                <button
                  onClick={() => setActiveTab('comparison')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'comparison'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Scale className="inline h-4 w-4 mr-2" />
                  Compare
                </button>
                <button
                  onClick={() => setActiveTab('scoring')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'scoring'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Calculator className="inline h-4 w-4 mr-2" />
                  Score & Rank
                </button>
                <button
                  onClick={() => setActiveTab('analytics')}
                  className={`py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === 'analytics'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <BarChart3 className="inline h-4 w-4 mr-2" />
                  Analytics
                </button>
              </>
            )}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="p-6">
          {activeTab === 'bids' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900">Submitted Bids</h3>
                {bidRequest.bids.filter(bid => bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW').length >= 2 && (
                  <button
                    onClick={() => setShowComparisonModal(true)}
                    className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700"
                  >
                    <Scale className="h-4 w-4 mr-2" />
                    Quick Compare
                  </button>
                )}
              </div>
        
              {bidRequest.bids.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No Bids Yet</h4>
                  <p className="text-gray-600 mb-4">No contractors have submitted bids for this project yet.</p>
                  <button
                    onClick={() => copyShareUrl(bidRequest.shareToken)}
                    className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
                  >
                    <Copy className="h-4 w-4 mr-2" />
                    Copy Share Link to Send
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {bidRequest.bids.map((bid) => (
                    <div key={bid.id} className="py-6">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center space-x-4 mb-4">
                            <div>
                              <h4 className="text-lg font-medium text-gray-900">{bid.companyName}</h4>
                              <p className="text-sm text-gray-600">
                                {bid.contactName} • {new Date(bid.submittedAt).toLocaleDateString()}
                              </p>
                            </div>
                            <span className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(bid.status)}`}>
                              {bid.status}
                            </span>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">Contact Information</h5>
                              <div className="space-y-1 text-sm text-gray-600">
                                <div className="flex items-center">
                                  <Mail className="h-4 w-4 mr-2" />
                                  {bid.contactEmail}
                                </div>
                                {bid.contactPhone && (
                                  <div className="flex items-center">
                                    <Phone className="h-4 w-4 mr-2" />
                                    {bid.contactPhone}
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">Bid Amount</h5>
                              <p className="text-lg font-semibold text-green-600">
                                {formatCurrency(bid.totalAmount)}
                              </p>
                              {bid.timeline && (
                                <p className="text-sm text-gray-600">Timeline: {bid.timeline}</p>
                              )}
                            </div>
                            
                            <div>
                              <h5 className="font-medium text-gray-900 mb-1">Credentials</h5>
                              <div className="space-y-1 text-sm text-gray-600">
                                {bid.licenseNumber && (
                                  <p>License: {bid.licenseNumber}</p>
                                )}
                                {bid.insuranceInfo && (
                                  <p>Insurance: {bid.insuranceInfo}</p>
                                )}
                                {bid.warranty && (
                                  <p>Warranty: {bid.warranty}</p>
                                )}
                              </div>
                            </div>
                          </div>
                          
                          {bid.notes && (
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 mb-1">Notes</h5>
                              <p className="text-sm text-gray-600 whitespace-pre-wrap">{bid.notes}</p>
                            </div>
                          )}
                          
                          {bid.hasUploadedFile && bid.fileName && (
                            <div className="mb-4">
                              <h5 className="font-medium text-gray-900 mb-1">Attached Documents</h5>
                              <div className="flex items-center space-x-2">
                                <FileText className="h-4 w-4 text-gray-500" />
                                <span className="text-sm text-gray-600">{bid.fileName}</span>
                                {bid.fileUrl && (
                                  <a
                                    href={bid.fileUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-primary-600 hover:text-primary-800"
                                  >
                                    <Download className="h-4 w-4" />
                                  </a>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                        
                        {(bid.status === 'SUBMITTED' || bid.status === 'UNDER_REVIEW') && (
                          <div className="flex space-x-2 ml-4">
                            <button
                              onClick={() => updateStatusMutation.mutate({ bidId: bid.id, status: 'ACCEPTED' })}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700 disabled:opacity-50"
                            >
                              Accept
                            </button>
                            <button
                              onClick={() => updateStatusMutation.mutate({ bidId: bid.id, status: 'REJECTED' })}
                              disabled={updateStatusMutation.isPending}
                              className="px-3 py-1 text-sm bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {activeTab === 'comparison' && (
            <div>
              <BidComparisonModal
                isOpen={true}
                onClose={() => setActiveTab('bids')}
                bids={bidRequest.bids}
                onUpdateBidStatus={(bidId, status) => {
                  updateStatusMutation.mutate({ bidId, status })
                }}
              />
            </div>
          )}

          {activeTab === 'scoring' && (
            <div>
              <BidScoringSystem
                bids={bidRequest.bids}
                budgetLimit={bidRequest.budget}
              />
            </div>
          )}

          {activeTab === 'analytics' && (
            <div>
              <BidAnalytics
                bids={bidRequest.bids}
                budgetLimit={bidRequest.budget}
              />
            </div>
          )}
        </div>
      </div>

      {/* Bid Comparison Modal */}
      <BidComparisonModal
        isOpen={showComparisonModal}
        onClose={() => setShowComparisonModal(false)}
        bids={bidRequest.bids}
        onUpdateBidStatus={(bidId, status) => {
          updateStatusMutation.mutate({ bidId, status })
          setShowComparisonModal(false)
        }}
      />
    </div>
  )
}