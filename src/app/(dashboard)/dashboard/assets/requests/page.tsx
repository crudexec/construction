'use client'
import { useAuthStore } from '@/store/auth'
import { useAssetTypes } from '@/components/assets/asset-type-select'
import { assetTypeLabel } from '@/lib/assets/type-options'
import { api, button, ErrorMessage } from '@/components/feedback/shared'

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
    equipmentId?: string | null
    name: string
    type: string
  }
  project?: {
    id: string
    title: string
  }
}

type RequestPage = { items: AssetRequest[]; total: number; page: number; pageSize: number; totalPages: number; pendingCount: number }
async function fetchRequests(status: string, page: number, signal: AbortSignal): Promise<RequestPage> {
  const response = await fetch(`/api/asset-requests?${new URLSearchParams({ status, page: String(page) })}`, { signal: AbortSignal.any([signal, AbortSignal.timeout(20000)]) })
  const result = await response.json()
  if (!response.ok) throw new Error(result.error || 'Could not load asset requests')
  return result
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

  const userId = useAuthStore(state => state.user?.id), types = useAssetTypes()
  const [page, setPage] = useState(1)
  const { data, isPending: isLoading, error, refetch } = useQuery({
    queryKey: ['asset-requests', userId, filterStatus, page],
    queryFn: ({ signal }) => fetchRequests(filterStatus, page, signal), enabled: !!userId, retry: false,
  })
  const requests = data?.items || []
  const action = useMutation({
    mutationFn: ({ id, operation }: { id: string; operation: string }) => api(`/api/asset-requests/${id}/${operation}`, operation === 'return' ? { condition: 'GOOD' } : {}),
    onSuccess: async () => { await queryClient.invalidateQueries({ queryKey: ['asset-requests'] }); await queryClient.invalidateQueries({ queryKey: ['assets'] }) },
  })

  const pendingCount = data?.pendingCount || 0

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <p role="status" className="text-sm text-gray-600">Loading asset requests…</p>
      </div>
    )
  }

  if (error) return <div className="space-y-4"><h1 className="text-2xl font-bold">Asset Requests</h1><ErrorMessage error={error} retry={() => { void refetch() }} /><Link href="/dashboard/assets" className="text-primary-700 underline">Back to assets</Link></div>

  return (
    <div className="space-y-6 pb-24">
      <ErrorMessage error={action.error} />
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/assets"
            aria-label="Back to assets"
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
            {pendingCount} pending {pendingCount === 1 ? 'request' : 'requests'} waiting for approval
          </span>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex gap-3">
          <select
            value={filterStatus}
            aria-label="Filter requests by status"
            onChange={(e) => { setFilterStatus(e.target.value); setPage(1) }}
            className="min-h-11 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
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
                        {request.asset.equipmentId ? `${request.asset.equipmentId} · ` : ''}{request.asset.name}
                      </Link>
                      <div className="text-sm text-gray-500">{assetTypeLabel(request.asset.type, types.data)}</div>
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
                            onClick={() => action.mutate({ id: request.id, operation: 'approve' })}
                            disabled={action.isPending}
                            className="min-h-11 px-2 text-green-700 hover:text-green-900 disabled:opacity-50"
                          >
                            Approve
                          </button>
                          <button
                            onClick={() => action.mutate({ id: request.id, operation: 'reject' })}
                            disabled={action.isPending}
                            className="min-h-11 px-2 text-red-700 hover:text-red-900 disabled:opacity-50"
                          >
                            Reject
                          </button>
                        </div>
                      )}
                      {request.status === 'APPROVED' && (
                        <button
                          onClick={() => action.mutate({ id: request.id, operation: 'return' })}
                          disabled={action.isPending}
                          className="min-h-11 px-2 text-primary-700 hover:text-primary-900 disabled:opacity-50"
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
      {data && <nav aria-label="Asset request pages" className="flex flex-wrap items-center justify-between gap-3 text-sm text-gray-600"><span>{data.total} requests · Page {data.page} of {data.totalPages}</span><div className="flex gap-2"><button className={button} disabled={data.page <= 1} onClick={() => setPage(data.page - 1)}>Previous</button><button className={button} disabled={data.page >= data.totalPages} onClick={() => setPage(data.page + 1)}>Next</button></div></nav>}
    </div>
  )
}
