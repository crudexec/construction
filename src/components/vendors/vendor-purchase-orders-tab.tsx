'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Plus,
  ShoppingCart,
  FileText,
  Clock,
  CheckCircle,
  Send,
  Package,
  XCircle,
  DollarSign,
  TrendingUp
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
  project: {
    id: string
    title: string
  } | null
  _count: {
    lineItems: number
  }
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

interface VendorPurchaseOrdersTabProps {
  vendorId: string
}

export function VendorPurchaseOrdersTab({ vendorId }: VendorPurchaseOrdersTabProps) {
  const { format } = useCurrency()

  const { data, isLoading } = useQuery({
    queryKey: ['vendor-purchase-orders', vendorId],
    queryFn: async () => {
      const response = await fetch(`/api/purchase-orders?vendorId=${vendorId}`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch purchase orders')
      const result = await response.json()
      return result.data || []
    }
  })

  const purchaseOrders: PurchaseOrder[] = data || []

  // Calculate stats
  const totalPOs = purchaseOrders.length
  const totalValue = purchaseOrders.reduce((sum, po) => sum + po.total, 0)
  const pendingDeliveries = purchaseOrders.filter(po =>
    po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED'
  ).length

  return (
    <div className="space-y-6">
      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 rounded-lg">
              <FileText className="h-5 w-5 text-blue-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total POs</p>
              <p className="text-xl font-semibold">{totalPOs}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-green-100 rounded-lg">
              <DollarSign className="h-5 w-5 text-green-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Total Value</p>
              <p className="text-xl font-semibold">{format(totalValue)}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-lg shadow-sm border">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-orange-100 rounded-lg">
              <TrendingUp className="h-5 w-5 text-orange-600" />
            </div>
            <div>
              <p className="text-sm text-gray-500">Pending Deliveries</p>
              <p className="text-xl font-semibold">{pendingDeliveries}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Header with Create PO button */}
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Purchase Orders</h3>
        <Link
          href={`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`}
          className="flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create PO for this Vendor
        </Link>
      </div>

      {/* Purchase Orders List */}
      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-gray-500">Loading purchase orders...</div>
        ) : purchaseOrders.length === 0 ? (
          <div className="p-8 text-center">
            <ShoppingCart className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No purchase orders yet</h3>
            <p className="text-gray-500 mb-4">
              Create your first purchase order for this vendor
            </p>
            <Link
              href={`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`}
              className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Create Purchase Order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Order
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
                {purchaseOrders.map((po) => {
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
        )}
      </div>
    </div>
  )
}
