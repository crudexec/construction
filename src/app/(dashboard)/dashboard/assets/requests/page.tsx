'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Package,
  AlertCircle
} from 'lucide-react'
import Link from 'next/link'

interface AssetRequest {
  id: string
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED'
  startDate?: string
  endDate?: string
  notes?: string
  createdAt: string
  requester: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  approvedBy?: {
    id: string
    firstName: string
    lastName: string
  }
  asset: {
    id: string
    name: string
    type: string
  }
  project?: {
    id: string
    title: string
  }
}

async function fetchAllRequests(status?: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  // We'll fetch all assets and collect their requests
  const response = await fetch('/api/assets', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch assets')

  const assets = await response.json()

  // Fetch requests for each asset
  const allRequests: AssetRequest[] = []
  for (const asset of assets) {
    const reqResponse = await fetch(`/api/assets/${asset.id}/requests`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Cookie': document.cookie
      }
    })
    if (reqResponse.ok) {
      const requests = await reqResponse.json()
      allRequests.push(...requests.map((r: any) => ({ ...r, asset })))
    }
  }

  // Sort by created date descending
  allRequests.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())

  // Filter by status if specified
  if (status && status !== 'all') {
    return allRequests.filter(r => r.status === status)
  }

  return allRequests
}

const getRequestStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string, text: string, icon: any }> = {
    'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    'RETURNED': { bg: 'bg-gray-100', text: 'text-gray-800', icon: RotateCcw }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

export default function AssetRequestsPage() {
  const queryClient = useQueryClient()
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['asset-requests', filterStatus],
    queryFn: () => fetchAllRequests(filterStatus)
  })

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to approve request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error('Failed to reject request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] })
    }
  })

  const returnMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ condition: 'GOOD' })
      })

      if (!response.ok) throw new Error('Failed to return asset')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-requests'] })
      queryClient.invalidateQueries({ queryKey: ['assets'] })
    }
  })

  const pendingCount = requests.filter((r: AssetRequest) => r.status === 'PENDING').length

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
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/assets"
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </Link>
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-primary-600" />
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Asset Requests</h1>
              <p className="text-sm text-gray-600">Review and manage asset requests</p>
            </div>
          </div>
        </div>
      </div>

      {/* Pending Alert */}
      {pendingCount > 0 && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
          <AlertCircle className="h-5 w-5 text-yellow-600" />
          <span className="text-yellow-800">
            {pendingCount} pending request(s) waiting for approval
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex gap-3">
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
          >
            <option value="all">All Status</option>
            <option value="PENDING">Pending</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
            <option value="RETURNED">Returned</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requester
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purpose
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Project
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {requests.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No requests found</p>
                    <p className="text-sm">Asset requests will appear here</p>
                  </td>
                </tr>
              ) : (
                requests.map((request: AssetRequest) => (
                  <tr key={request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <Link
                        href={`/dashboard/assets/${request.asset.id}`}
                        className="text-sm font-medium text-primary-600 hover:text-primary-900"
                      >
                        {request.asset.name}
                      </Link>
                      <div className="text-sm text-gray-500">{request.asset.type}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900">
                        {request.requester.firstName} {request.requester.lastName}
                      </div>
                      <div className="text-sm text-gray-500">{request.requester.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm text-gray-900 max-w-xs truncate">
                        {request.purpose}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.project ? (
                        <Link
                          href={`/dashboard/projects/${request.project.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          {request.project.title}
                        </Link>
                      ) : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getRequestStatusBadge(request.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(request.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      {request.status === 'PENDING' && (
                        <div className="flex space-x-2">
                          <button
                            onClick={() => approveMutation.mutate(request.id)}
                            disabled={approveMutation.isPending}
                            className="text-green-600 hover:text-green-900"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => rejectMutation.mutate(request.id)}
                            disabled={rejectMutation.isPending}
                            className="text-red-600 hover:text-red-900"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'APPROVED' && (
                        <button
                          onClick={() => returnMutation.mutate(request.id)}
                          disabled={returnMutation.isPending}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          Mark Returned
                        </button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
