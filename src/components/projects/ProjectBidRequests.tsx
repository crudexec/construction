'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, ExternalLink, Users, Eye, Calendar, DollarSign, Clock, FileText, Share2, Trash2 } from 'lucide-react'
import { CreateBidRequestModal } from '@/components/bids/create-bid-request-modal'
import { format } from 'date-fns'
import toast from 'react-hot-toast'

interface ProjectBidRequestsProps {
  projectId: string
  projectTitle: string
  projectData?: {
    description?: string
    projectAddress?: string
    projectCity?: string
    projectState?: string
    projectZipCode?: string
    timeline?: string
    budget?: number
  }
  canEdit: boolean
}

async function fetchProjectBidRequests(projectId: string) {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/projects/${projectId}/bid-requests`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to fetch bid requests')
  return response.json()
}

async function deleteBidRequest(bidRequestId: string) {
  const token = localStorage.getItem('token')
  const response = await fetch(`/api/bid-requests/${bidRequestId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to delete bid request')
  return response.json()
}

export default function ProjectBidRequests({ 
  projectId, 
  projectTitle, 
  projectData,
  canEdit 
}: ProjectBidRequestsProps) {
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedBidRequest, setSelectedBidRequest] = useState<any>(null)

  const { data: bidRequests = [], isLoading, refetch } = useQuery({
    queryKey: ['project-bid-requests', projectId],
    queryFn: () => fetchProjectBidRequests(projectId),
    enabled: !!projectId
  })

  const handleDelete = async (bidRequestId: string) => {
    if (!confirm('Are you sure you want to delete this bid request? All associated bids will be lost.')) {
      return
    }

    try {
      await deleteBidRequest(bidRequestId)
      toast.success('Bid request deleted successfully')
      refetch()
    } catch (error) {
      toast.error('Failed to delete bid request')
    }
  }

  const copyShareLink = (shareToken: string) => {
    const shareUrl = `${window.location.origin}/bid/${shareToken}`
    navigator.clipboard.writeText(shareUrl)
    toast.success('Share link copied to clipboard!')
  }

  // Prepare project data for the modal
  const modalProjectData = projectData ? {
    description: projectData.description,
    location: [
      projectData.projectAddress,
      projectData.projectCity,
      projectData.projectState,
      projectData.projectZipCode
    ].filter(Boolean).join(', '),
    timeline: projectData.timeline,
    budget: projectData.budget
  } : undefined

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm p-6">
        <div className="animate-pulse">
          <div className="h-6 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-3">
            <div className="h-20 bg-gray-100 rounded"></div>
            <div className="h-20 bg-gray-100 rounded"></div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="bg-white rounded-lg shadow-sm">
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Bid Requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                {bidRequests.length} active bid request{bidRequests.length !== 1 ? 's' : ''}
              </p>
            </div>
            {canEdit && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                <Plus className="h-4 w-4" />
                Create Bid Request
              </button>
            )}
          </div>
        </div>

        <div className="p-6">
          {bidRequests.length === 0 ? (
            <div className="text-center py-12">
              <FileText className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No bid requests</h3>
              <p className="mt-1 text-sm text-gray-500">
                Get started by creating a bid request for this project.
              </p>
              {canEdit && (
                <div className="mt-6">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Create Bid Request
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {bidRequests.map((bidRequest: any) => (
                <div
                  key={bidRequest.id}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-base font-medium text-gray-900">
                          {bidRequest.title}
                        </h4>
                        {bidRequest.isActive && (
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Active
                          </span>
                        )}
                      </div>
                      
                      <p className="mt-1 text-sm text-gray-600 line-clamp-2">
                        {bidRequest.description}
                      </p>

                      <div className="mt-3 flex flex-wrap gap-4 text-sm text-gray-500">
                        {bidRequest.deadline && (
                          <div className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            <span>Due {format(new Date(bidRequest.deadline), 'MMM d, yyyy')}</span>
                          </div>
                        )}
                        
                        {bidRequest.budget && (
                          <div className="flex items-center gap-1">
                            <DollarSign className="h-4 w-4" />
                            <span>${bidRequest.budget.toLocaleString()}</span>
                          </div>
                        )}
                        
                        {bidRequest.timeline && (
                          <div className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            <span>{bidRequest.timeline}</span>
                          </div>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1 text-gray-600">
                          <Users className="h-4 w-4" />
                          <span>{bidRequest._count?.bids || 0} bids</span>
                        </div>
                        
                        <div className="flex items-center gap-1 text-gray-600">
                          <Eye className="h-4 w-4" />
                          <span>{bidRequest._count?.views || 0} views</span>
                        </div>

                        <div className="text-gray-400">
                          Created {format(new Date(bidRequest.createdAt), 'MMM d, yyyy')}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => copyShareLink(bidRequest.shareToken)}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Copy share link"
                      >
                        <Share2 className="h-4 w-4" />
                      </button>
                      
                      <a
                        href={`/dashboard/bids/${bidRequest.id}`}
                        className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
                        title="View details"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                      
                      {canEdit && (
                        <button
                          onClick={() => handleDelete(bidRequest.id)}
                          className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete bid request"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {showCreateModal && (
        <CreateBidRequestModal
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
            refetch()
          }}
          projectId={projectId}
          projectTitle={projectTitle}
          projectData={modalProjectData}
        />
      )}
    </>
  )
}