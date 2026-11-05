'use client'
import { useAuthStore } from '@/store/auth'
import { useAssetTypes } from '@/components/assets/asset-type-select'
import { assetTypeLabel } from '@/lib/assets/type-options'
import { api, ErrorMessage } from '@/components/feedback/shared'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  ArrowLeft,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Package,
  X,
  type LucideIcon
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
  const statusConfig: Record<string, { bg: string, text: string, icon: LucideIcon }> = {
    'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    'RETURNED': { bg: 'bg-gray-100', text: 'text-gray-800', icon: RotateCcw }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] font-medium rounded ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {status.charAt(0) + status.slice(1).toLowerCase()}
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

  const currentPage = data?.page ?? 1
  const totalPages = data?.totalPages ?? 1
  const pageStart = (currentPage - 1) * (data?.pageSize ?? 25)
  const cell = 'px-2 py-1 border-r border-gray-200'
  const control = 'min-h-11 sm:min-h-9 rounded border border-gray-300 px-3 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50'
  const requestAction = 'inline-flex items-center justify-center min-h-11 sm:min-h-8 rounded px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 disabled:opacity-50'

  return (
    <div className="space-y-6 pb-24">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Clock aria-hidden="true" className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Requests</h1>
            <p className="text-sm text-gray-600">Review and manage asset requests</p>
          </div>
        </div>
        <Link href="/dashboard/assets" className="inline-flex min-h-11 items-center justify-center gap-2 rounded-md border bg-white px-4 py-2 text-gray-700 hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
          <ArrowLeft aria-hidden="true" className="h-4 w-4" />
          Back to assets
        </Link>
      </div>

      <div className="bg-white rounded-lg shadow border p-6">
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:items-center">
              <select
                value={filterStatus}
                aria-label="Filter requests by status"
                onChange={event => { setFilterStatus(event.target.value); setPage(1) }}
                className="min-h-11 sm:min-h-8 rounded border border-gray-300 bg-white px-2 text-xs text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value="all">Status: All</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
                <option value="RETURNED">Returned</option>
              </select>
              {filterStatus !== 'all' && (
                <button type="button" onClick={() => { setFilterStatus('all'); setPage(1) }} className="flex min-h-11 sm:min-h-8 items-center gap-1 text-xs text-gray-600 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">
                  <X aria-hidden="true" className="h-3 w-3" />Reset filters
                </button>
              )}
            </div>
            {data && !error && <div className="flex flex-wrap items-center gap-3 text-xs text-gray-600">
              <span>{data.total} requests</span>
              {pendingCount > 0 && <span className="inline-flex items-center gap-1 text-yellow-800">
                <Clock aria-hidden="true" className="h-3.5 w-3.5" />
                {pendingCount} pending approval
              </span>}
            </div>}
          </div>

          <ErrorMessage error={error} retry={() => { void refetch() }} />
          <ErrorMessage error={action.error} />
          <div className="overflow-hidden rounded border border-gray-300">
            <div className="overflow-x-auto focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-primary-500" tabIndex={0} role="region" aria-label="Asset requests table">
              <table aria-busy={isLoading} className="w-full min-w-[1020px] table-fixed border-collapse text-xs">
                <thead>
                  <tr className="border-b border-gray-300 bg-gray-100">
                    {[
                      ['#', 'w-8'], ['Equipment ID', 'w-28'], ['Asset', 'w-36'],
                      ['Requester', 'w-40'], ['Purpose', 'w-40'], ['Project', 'w-28'],
                      ['Status', 'w-24'], ['Date', 'w-24'], ['Actions', 'w-36'],
                    ].map(([label, width]) => <th key={label} scope="col" className={`${width} px-2 py-1.5 border-r border-gray-200 last:border-r-0 text-left font-semibold text-gray-700`}>{label}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {isLoading || error ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600"><span role="status">{isLoading ? 'Loading asset requests…' : 'Asset requests could not be loaded.'}</span></td></tr>
                  ) : requests.length === 0 ? (
                    <tr><td colSpan={9} className="px-4 py-8 text-center text-gray-600">
                      <Package aria-hidden="true" className="mx-auto mb-2 h-8 w-8 text-gray-400" />
                      <p className="font-medium">No requests found</p>
                      <p className="text-xs">{filterStatus !== 'all' ? 'Try adjusting filters' : 'Asset requests will appear here'}</p>
                    </td></tr>
                  ) : requests.map((request, index) => (
                    <tr key={request.id} className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="border-r border-gray-200 px-1 py-1 text-center tabular-nums text-gray-500">{pageStart + index + 1}</td>
                      <td className={`${cell} font-semibold text-gray-900 break-words`}>{request.asset.equipmentId || '—'}</td>
                      <td className={cell}>
                        <Link href={`/dashboard/assets/${request.asset.id}`} title={request.asset.name} className="block truncate font-medium text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{request.asset.name}</Link>
                        <div className="truncate text-[10px] text-gray-600" title={assetTypeLabel(request.asset.type, types.data)}>{assetTypeLabel(request.asset.type, types.data)}</div>
                      </td>
                      <td className={cell}>
                        <div className="truncate font-medium text-gray-900" title={`${request.requester.firstName} ${request.requester.lastName}`}>{request.requester.firstName} {request.requester.lastName}</div>
                        <div className="truncate text-[10px] text-gray-600" title={request.requester.email}>{request.requester.email}</div>
                      </td>
                      <td className={`${cell} text-gray-700 break-words`}>{request.purpose}</td>
                      <td className={`${cell} text-gray-600`}>
                        {request.project ? <Link href={`/dashboard/projects/${request.project.id}`} title={request.project.title} className="block truncate text-primary-700 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500">{request.project.title}</Link> : '—'}
                      </td>
                      <td className={cell}>{getRequestStatusBadge(request.status)}</td>
                      <td className={`${cell} text-gray-600 tabular-nums`}>{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td className="px-1 py-1">
                        {request.status === 'PENDING' && <div className="flex items-center gap-1">
                          <button type="button" onClick={() => action.mutate({ id: request.id, operation: 'approve' })} disabled={action.isPending} className={`${requestAction} text-green-700 hover:bg-green-50`}>Approve</button>
                          <button type="button" onClick={() => action.mutate({ id: request.id, operation: 'reject' })} disabled={action.isPending} className={`${requestAction} text-red-700 hover:bg-red-50`}>Reject</button>
                        </div>}
                        {request.status === 'APPROVED' && <button type="button" onClick={() => action.mutate({ id: request.id, operation: 'return' })} disabled={action.isPending} className={`${requestAction} text-primary-700 hover:bg-primary-50`}>Mark Returned</button>}
                        {(request.status === 'REJECTED' || request.status === 'RETURNED') && <span className="px-2 text-gray-500">—</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
          {data && !error && <nav aria-label="Asset request pages" className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 text-xs text-gray-600">
            <span role="status" className="tabular-nums">Showing {data.total === 0 ? 0 : pageStart + 1}–{pageStart + requests.length} of {data.total} requests</span>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={control} disabled={isLoading || currentPage <= 1} onClick={() => setPage(currentPage - 1)}>Previous</button>
              <span className="tabular-nums">Page {currentPage} of {totalPages}</span>
              <button type="button" className={control} disabled={isLoading || currentPage >= totalPages} onClick={() => setPage(currentPage + 1)}>Next</button>
            </div>
          </nav>}
        </div>
      </div>
    </div>
  )
}
