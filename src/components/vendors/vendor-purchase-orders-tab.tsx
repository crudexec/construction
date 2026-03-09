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
  DRAFT: { label: 'Draft', color: 'bg-gray-100 text-gray-700', icon: FileText },
  PENDING_APPROVAL: { label: 'Pending', color: 'bg-yellow-100 text-yellow-700', icon: Clock },
  APPROVED: { label: 'Approved', color: 'bg-blue-100 text-blue-700', icon: CheckCircle },
  SENT: { label: 'Sent', color: 'bg-purple-100 text-purple-700', icon: Send },
  PARTIALLY_RECEIVED: { label: 'Partial', color: 'bg-orange-100 text-orange-700', icon: Package },
  RECEIVED: { label: 'Received', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  CANCELLED: { label: 'Cancelled', color: 'bg-red-100 text-red-700', icon: XCircle }
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
    <div className="space-y-3">
      {/* Compact Stats Row */}
      <div className="bg-white rounded border">
        <div className="px-3 py-2 border-b border-gray-100 bg-gray-50 flex justify-between items-center">
          <h3 className="text-sm font-medium text-gray-900">Purchase Orders ({totalPOs})</h3>
          <Link
            href={`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`}
            className="text-xs text-white bg-primary-600 hover:bg-primary-700 px-2 py-1 rounded flex items-center gap-1"
          >
            <Plus className="h-3 w-3" /> Create PO
          </Link>
        </div>
        <div className="px-3 py-2 flex items-center gap-6 text-xs">
          <div className="flex items-center gap-1.5">
            <FileText className="h-3.5 w-3.5 text-blue-500" />
            <span className="text-gray-500">Total:</span>
            <span className="font-semibold text-gray-900">{totalPOs}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="h-3.5 w-3.5 text-green-500" />
            <span className="text-gray-500">Value:</span>
            <span className="font-semibold text-gray-900">{format(totalValue)}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <TrendingUp className="h-3.5 w-3.5 text-orange-500" />
            <span className="text-gray-500">Pending:</span>
            <span className="font-semibold text-gray-900">{pendingDeliveries}</span>
          </div>
        </div>
      </div>

      {/* Compact PO Table */}
      <div className="bg-white rounded border overflow-hidden">
        {isLoading ? (
          <div className="py-6 text-center">
            <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-600 mx-auto"></div>
          </div>
        ) : purchaseOrders.length === 0 ? (
          <div className="py-6 text-center">
            <ShoppingCart className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <p className="text-xs text-gray-500 mb-2">No purchase orders yet</p>
            <Link
              href={`/dashboard/vendors/purchase-orders/new?vendorId=${vendorId}`}
              className="text-xs text-primary-600 hover:text-primary-800"
            >
              + Create Purchase Order
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200">
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Order #</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Project</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Status</th>
                  <th className="px-3 py-2 text-right text-[10px] font-semibold text-gray-600 uppercase">Total</th>
                  <th className="px-3 py-2 text-left text-[10px] font-semibold text-gray-600 uppercase">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {purchaseOrders.map((po, idx) => {
                  const statusConfig = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT
                  const StatusIcon = statusConfig.icon

                  return (
                    <tr
                      key={po.id}
                      className={`hover:bg-blue-50 cursor-pointer ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      onClick={() => window.location.href = `/dashboard/vendors/purchase-orders/${po.id}`}
                    >
                      <td className="px-3 py-1.5">
                        <Link
                          href={`/dashboard/vendors/purchase-orders/${po.id}`}
                          className="text-xs font-medium text-primary-600 hover:text-primary-800"
                          onClick={(e) => e.stopPropagation()}
                        >
                          {po.orderNumber}
                        </Link>
                        <span className="text-[10px] text-gray-400 ml-1">({po._count.lineItems})</span>
                      </td>
                      <td className="px-3 py-1.5">
                        {po.project ? (
                          <Link
                            href={`/dashboard/projects/${po.project.id}`}
                            className="text-xs text-gray-700 hover:text-primary-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {po.project.title}
                          </Link>
                        ) : (
                          <span className="text-xs text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-3 py-1.5">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${statusConfig.color}`}>
                          <StatusIcon className="h-2.5 w-2.5 mr-0.5" />
                          {statusConfig.label}
                        </span>
                      </td>
                      <td className="px-3 py-1.5 text-right">
                        <span className="text-xs font-medium text-gray-900">{format(po.total)}</span>
                      </td>
                      <td className="px-3 py-1.5 text-xs text-gray-500">
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
