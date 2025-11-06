'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { 
  Plus,
  Eye,
  Calendar,
  Clock,
  MapPin,
  DollarSign,
  Users,
  FileText,
  Link as LinkIcon,
  Copy,
  MoreHorizontal,
  Edit,
  Trash2,
  CheckCircle,
  XCircle,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'
import { CreateBidRequestModal } from '@/components/bids/create-bid-request-modal'

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
  _count: {
    bids: number
    views: number
  }
}

async function fetchBidRequests() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/bid-requests', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch bid requests')
  return response.json()
}

async function deleteBidRequest(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/bid-requests/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete bid request')
  return response.json()
}

export default function BidsPage() {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBidRequest, setSelectedBidRequest] = useState<BidRequest | null>(null)
  const queryClient = useQueryClient()

  const { data: bidRequestsData, isLoading } = useQuery({
    queryKey: ['bid-requests'],
    queryFn: fetchBidRequests
  })

  const deleteMutation = useMutation({
    mutationFn: deleteBidRequest,
    onSuccess: () => {
      toast.success('Bid request deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['bid-requests'] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete bid request')
    }
  })

  const bidRequests = bidRequestsData?.bidRequests || []

  const copyShareUrl = async (shareToken: string) => {
    const shareUrl = `${window.location.origin}/bid/${shareToken}`
    try {
      await navigator.clipboard.writeText(shareUrl)
      toast.success('Share link copied to clipboard!')
    } catch (error) {
      toast.error('Failed to copy link')
    }
  }

  const getDaysRemaining = (deadline: string) => {
    const now = new Date()
    const deadlineDate = new Date(deadline)
    const diffTime = deadlineDate.getTime() - now.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (bidRequest: BidRequest) => {
    if (!bidRequest.isActive) return 'bg-gray-100 text-gray-800'
    if (bidRequest.deadline) {
      const daysRemaining = getDaysRemaining(bidRequest.deadline)
      if (daysRemaining < 0) return 'bg-red-100 text-red-800'
      if (daysRemaining <= 3) return 'bg-yellow-100 text-yellow-800'
    }
    return 'bg-green-100 text-green-800'
  }

  const getStatusText = (bidRequest: BidRequest) => {
    if (!bidRequest.isActive) return 'Inactive'
    if (bidRequest.deadline) {
      const daysRemaining = getDaysRemaining(bidRequest.deadline)
      if (daysRemaining < 0) return 'Expired'
      if (daysRemaining === 0) return 'Due Today'
      if (daysRemaining <= 3) return `${daysRemaining} days left`
    }
    return 'Active'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Bid Requests</h1>
          <p className="text-gray-600">Manage requests for quotes and review submitted bids</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          New Bid Request
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-blue-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Requests</p>
              <p className="text-2xl font-bold text-gray-900">{bidRequests.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Active</p>
              <p className="text-2xl font-bold text-gray-900">
                {bidRequests.filter((br: BidRequest) => br.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-purple-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Bids</p>
              <p className="text-2xl font-bold text-gray-900">
                {bidRequests.reduce((sum: number, br: BidRequest) => sum + br._count.bids, 0)}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-lg shadow">
          <div className="flex items-center">
            <Eye className="h-8 w-8 text-orange-600" />
            <div className="ml-3">
              <p className="text-sm font-medium text-gray-500">Total Views</p>
              <p className="text-2xl font-bold text-gray-900">
                {bidRequests.reduce((sum: number, br: BidRequest) => sum + br._count.views, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Bid Requests List */}
      <div className="bg-white shadow rounded-lg">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-medium text-gray-900">Recent Bid Requests</h3>
        </div>
        
        {bidRequests.length === 0 ? (
          <div className="text-center py-12">
            <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bid requests yet</h3>
            <p className="text-gray-600 mb-4">Create your first bid request to start receiving quotes</p>
            <button
              onClick={() => setShowCreateModal(true)}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Bid Request
            </button>
          </div>
        ) : (
          <div className="overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bids
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Views
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {bidRequests.map((bidRequest: BidRequest) => (
                    <tr key={bidRequest.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {bidRequest.title}
                          </div>
                          <div className="text-sm text-gray-500 max-w-xs truncate">
                            {bidRequest.description}
                          </div>
                          {bidRequest.location && (
                            <div className="flex items-center text-xs text-gray-400 mt-1">
                              <MapPin className="h-3 w-3 mr-1" />
                              {bidRequest.location}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(bidRequest)}`}>
                          {getStatusText(bidRequest)}
                        </span>
                        {bidRequest.deadline && (
                          <div className="flex items-center text-xs text-gray-400 mt-1">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(bidRequest.deadline).toLocaleDateString()}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Users className="h-4 w-4 text-gray-400 mr-1" />
                          {bidRequest._count.bids}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center">
                          <Eye className="h-4 w-4 text-gray-400 mr-1" />
                          {bidRequest._count.views}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(bidRequest.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/bids/${bidRequest.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View details"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          <button
                            onClick={() => copyShareUrl(bidRequest.shareToken)}
                            className="text-blue-600 hover:text-blue-900"
                            title="Copy share link"
                          >
                            <Copy className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => deleteMutation.mutate(bidRequest.id)}
                            className="text-red-600 hover:text-red-900"
                            disabled={deleteMutation.isPending}
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Bid Request Modal */}
      <CreateBidRequestModal 
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
      />
    </div>
  )
}