'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Search,
  Filter,
  ShoppingCart,
  FileText,
  Clock,
  CheckCircle,
  Send,
  Package,
  XCircle,
  ChevronLeft,
  ChevronRight
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface PurchaseOrder {
  id: string
  orderNumber: string
  status: string
  subtotal: number
  tax: number
  shipping: number
  total: number
  expectedDeliveryDate: string | null
  deliveredDate: string | null
  createdAt: string
  vendor: {
    id: string
    name: string
    companyName: string
  }
  project: {
    id: string
    title: string
  } | null
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  approvedBy: {
    id: string
    firstName: string
    lastName: string
  } | null
  _count: {
    lineItems: number
  }
}

interface Pagination {
  page: number
  limit: number
  total: number
  totalPages: number
}

const STATUS_CONFIG: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-800', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'bg-yellow-100 text-yellow-800', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-800', icon: CheckCircle },
  SENT: { label: 'Sent', color: 'bg-purple-100 text-purple-800', icon: Send },
  PARTIALLY_RECEIVED: { label: 'Partially Received', color: 'bg-orange-100 text-orange-800', icon: Package },
  RECEIVED: { label: 'Received', color: 'bg-green-100 text-green-800', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-800', icon: XCircle }
}

const fetchPurchaseOrders = async (params: {
  page: number
  status?: string
  search?: string
}): Promise<{ data: PurchaseOrder[]; pagination: Pagination }> => {
  const queryParams = new URLSearchParams({
    page: params.page.toString(),
    limit: '20'
  })
  if (params.status) queryParams.set('status', params.status)

  const response = await fetch(`/api/purchase-orders?${queryParams}`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch purchase orders')
  return response.json()
}

export function PurchaseOrdersTab() {
  const { format } = useCurrency()
  const [page, setPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [searchQuery, setSearchQuery] = useState('')

  const { data, isLoading, error } = useQuery({
    queryKey: ['purchase-orders', page, statusFilter],
    queryFn: () => fetchPurchaseOrders({ page, status: statusFilter || undefined })
  })

  const purchaseOrders = data?.data || []
  const pagination = data?.pagination

  // Filter by search query locally
  const filteredOrders = searchQuery
    ? purchaseOrders.filter(
        po =>
          po.orderNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
          po.vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          po.vendor.companyName?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : purchaseOrders

  return (
    <div className="space-y-6">
      {/* Filters */}
      <div className="bg-white rounded-lg shadow border p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search by order number or vendor..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setPage(1)
              }}
              className="border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-1 focus:ring-primary-500"
            >
              <option value="">All Statuses</option>
              {Object.entries(STATUS_CONFIG).map(([value, config]) => (
                <option key={value} value={value}>
                  {config.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Purchase Orders Table */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading purchase orders...</div>
        ) : error ? (
          <div className="p-8 text-center text-red-500">Failed to load purchase orders</div>
        ) : filteredOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders found</h3>
            <p className="text-gray-500">
              {statusFilter
                ? 'No purchase orders match the selected filter'
                : 'Create your first purchase order to get started'}
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Order
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Vendor
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Total
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredOrders.map((po) => {
                    const statusConfig = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT
                    const StatusIcon = statusConfig.icon

                    return (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/vendors/purchase-orders/${po.id}`}
                            className="text-primary-600 hover:text-primary-800 font-medium"
                          >
                            {po.orderNumber}
                          </Link>
                          <p className="text-xs text-gray-500">{po._count.lineItems} items</p>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <Link
                            href={`/dashboard/vendors/${po.vendor.id}`}
                            className="text-gray-900 hover:text-primary-600"
                          >
                            {po.vendor.companyName || po.vendor.name}
                          </Link>
                          {po.vendor.companyName && (
                            <p className="text-xs text-gray-500">{po.vendor.name}</p>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {po.project ? (
                            <Link
                              href={`/dashboard/projects/${po.project.id}`}
                              className="text-gray-900 hover:text-primary-600"
                            >
                              {po.project.title}
                            </Link>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span
                            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${statusConfig.color}`}
                          >
                            <StatusIcon className="h-3 w-3 mr-1" />
                            {statusConfig.label}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-right font-medium text-gray-900">
                          {format(po.total)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(po.createdAt).toLocaleDateString()}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination && pagination.totalPages > 1 && (
              <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {(pagination.page - 1) * pagination.limit + 1} to{' '}
                  {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total}
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => setPage(page - 1)}
                    disabled={page === 1}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <span className="text-sm text-gray-700">
                    Page {pagination.page} of {pagination.totalPages}
                  </span>
                  <button
                    onClick={() => setPage(page + 1)}
                    disabled={page >= pagination.totalPages}
                    className="p-2 rounded-md border border-gray-300 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
