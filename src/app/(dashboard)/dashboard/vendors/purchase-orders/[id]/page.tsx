'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  Edit,
  Trash2,
  CheckCircle,
  Send,
  Package,
  Clock,
  FileText,
  XCircle,
  Building,
  Calendar,
  User,
  AlertCircle,
  Download
} from 'lucide-react'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useCurrency } from '@/hooks/useCurrency'

interface LineItem {
  id: string
  itemId: string
  quantity: number
  unitPrice: number
  total: number
  receivedQuantity: number
  notes: string | null
  item: {
    id: string
    name: string
    unit: string
    category: string
    sku: string | null
  }
}

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
  notes: string | null
  terms: string | null
  sentAt: string | null
  approvedAt: string | null
  createdAt: string
  updatedAt: string
  vendor: {
    id: string
    name: string
    companyName: string
    email: string
    phone: string
    address: string
    city: string
    state: string
    zipCode: string
  }
  project: {
    id: string
    title: string
  } | null
  lineItems: LineItem[]
  createdBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  approvedBy: {
    id: string
    firstName: string
    lastName: string
    email: string
  } | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bgColor: string }> = {
  DRAFT: { label: 'Draft', color: 'text-gray-700', bgColor: 'bg-gray-100' },
  PENDING_APPROVAL: { label: 'Pending Approval', color: 'text-yellow-700', bgColor: 'bg-yellow-100' },
  APPROVED: { label: 'Approved', color: 'text-blue-700', bgColor: 'bg-blue-100' },
  SENT: { label: 'Sent to Vendor', color: 'text-purple-700', bgColor: 'bg-purple-100' },
  PARTIALLY_RECEIVED: { label: 'Partially Received', color: 'text-orange-700', bgColor: 'bg-orange-100' },
  RECEIVED: { label: 'Received', color: 'text-green-700', bgColor: 'bg-green-100' },
  CANCELLED: { label: 'Cancelled', color: 'text-red-700', bgColor: 'bg-red-100' }
}

const fetchPurchaseOrder = async (id: string): Promise<PurchaseOrder> => {
  const response = await fetch(`/api/purchase-orders/${id}`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch purchase order')
  return response.json()
}

export default function PurchaseOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format } = useCurrency()
  const poId = params.id as string

  const [showReceiveModal, setShowReceiveModal] = useState(false)
  const [receiveItems, setReceiveItems] = useState<{ [key: string]: number }>({})

  const { data: po, isLoading, error } = useQuery({
    queryKey: ['purchase-order', poId],
    queryFn: () => fetchPurchaseOrder(poId),
    enabled: !!poId
  })

  const approveMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/purchase-orders/${poId}/approve`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to approve')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
    }
  })

  const sendMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/purchase-orders/${poId}/send`, {
        method: 'POST',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to mark as sent')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
    }
  })

  const receiveMutation = useMutation({
    mutationFn: async (items: { lineItemId: string; receivedQuantity: number }[]) => {
      const response = await fetch(`/api/purchase-orders/${poId}/receive`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ receivedItems: items })
      })
      if (!response.ok) throw new Error('Failed to receive items')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['purchase-order', poId] })
      setShowReceiveModal(false)
      setReceiveItems({})
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/purchase-orders/${poId}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to delete')
      return response.json()
    },
    onSuccess: () => {
      router.push('/dashboard/vendors?tab=purchase-orders')
    }
  })

  const exportToPDF = () => {
    if (!po) return

    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()

    // Header
    doc.setFontSize(20)
    doc.setFont('helvetica', 'bold')
    doc.text('PURCHASE ORDER', pageWidth / 2, 20, { align: 'center' })

    // PO Number and Status
    doc.setFontSize(12)
    doc.setFont('helvetica', 'normal')
    doc.text(`Order Number: ${po.orderNumber}`, 14, 35)
    doc.text(`Status: ${STATUS_CONFIG[po.status]?.label || po.status}`, 14, 42)
    doc.text(`Date: ${new Date(po.createdAt).toLocaleDateString()}`, 14, 49)

    // Vendor Information (right side)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('VENDOR:', pageWidth - 80, 35)
    doc.setFont('helvetica', 'normal')
    doc.text(po.vendor.companyName || po.vendor.name, pageWidth - 80, 42)
    if (po.vendor.companyName && po.vendor.name) {
      doc.text(po.vendor.name, pageWidth - 80, 48)
    }
    if (po.vendor.address) {
      doc.text(po.vendor.address, pageWidth - 80, 54)
      const cityStateZip = [po.vendor.city, po.vendor.state, po.vendor.zipCode].filter(Boolean).join(', ')
      if (cityStateZip) doc.text(cityStateZip, pageWidth - 80, 60)
    }
    if (po.vendor.email) doc.text(po.vendor.email, pageWidth - 80, 66)
    if (po.vendor.phone) doc.text(po.vendor.phone, pageWidth - 80, 72)

    // Project (if exists)
    let yPos = 85
    if (po.project) {
      doc.setFont('helvetica', 'bold')
      doc.text('Project:', 14, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(po.project.title, 45, yPos)
      yPos += 10
    }

    // Expected Delivery Date
    if (po.expectedDeliveryDate) {
      doc.setFont('helvetica', 'bold')
      doc.text('Expected Delivery:', 14, yPos)
      doc.setFont('helvetica', 'normal')
      doc.text(new Date(po.expectedDeliveryDate).toLocaleDateString(), 55, yPos)
      yPos += 10
    }

    // Line Items Table
    const tableData = po.lineItems.map(item => [
      item.item.name,
      item.item.category,
      item.item.unit,
      item.quantity.toString(),
      format(item.unitPrice),
      format(item.total)
    ])

    autoTable(doc, {
      startY: yPos + 5,
      head: [['Item', 'Category', 'Unit', 'Qty', 'Unit Price', 'Total']],
      body: tableData,
      theme: 'striped',
      headStyles: {
        fillColor: [59, 130, 246],
        textColor: 255,
        fontStyle: 'bold'
      },
      columnStyles: {
        0: { cellWidth: 50 },
        3: { halign: 'right' },
        4: { halign: 'right' },
        5: { halign: 'right' }
      },
      foot: [
        ['', '', '', '', 'Subtotal:', format(po.subtotal)],
        ...(po.tax > 0 ? [['', '', '', '', 'Tax:', format(po.tax)]] : []),
        ...(po.shipping > 0 ? [['', '', '', '', 'Shipping:', format(po.shipping)]] : []),
        ['', '', '', '', 'TOTAL:', format(po.total)]
      ],
      footStyles: {
        fillColor: [249, 250, 251],
        textColor: [17, 24, 39],
        fontStyle: 'bold'
      }
    })

    // Get final Y position after table
    const finalY = (doc as any).lastAutoTable.finalY || yPos + 50

    // Notes and Terms
    if (po.notes || po.terms) {
      let notesY = finalY + 15

      if (po.notes) {
        doc.setFont('helvetica', 'bold')
        doc.text('Notes:', 14, notesY)
        doc.setFont('helvetica', 'normal')
        const notesLines = doc.splitTextToSize(po.notes, pageWidth - 28)
        doc.text(notesLines, 14, notesY + 6)
        notesY += 6 + (notesLines.length * 5)
      }

      if (po.terms) {
        notesY += 10
        doc.setFont('helvetica', 'bold')
        doc.text('Terms & Conditions:', 14, notesY)
        doc.setFont('helvetica', 'normal')
        const termsLines = doc.splitTextToSize(po.terms, pageWidth - 28)
        doc.text(termsLines, 14, notesY + 6)
      }
    }

    // Footer
    const pageHeight = doc.internal.pageSize.getHeight()
    doc.setFontSize(8)
    doc.setTextColor(128)
    doc.text(`Generated on ${new Date().toLocaleString()}`, 14, pageHeight - 10)
    doc.text(`Created by ${po.createdBy.firstName} ${po.createdBy.lastName}`, pageWidth - 14, pageHeight - 10, { align: 'right' })

    // Save the PDF
    doc.save(`PO-${po.orderNumber}.pdf`)
  }

  const handleReceive = () => {
    const items = Object.entries(receiveItems)
      .filter(([_, qty]) => qty > 0)
      .map(([lineItemId, receivedQuantity]) => ({
        lineItemId,
        receivedQuantity
      }))

    if (items.length === 0) {
      alert('Please enter quantities to receive')
      return
    }

    receiveMutation.mutate(items)
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-gray-500">Loading purchase order...</div>
      </div>
    )
  }

  if (error || !po) {
    return (
      <div className="flex flex-col items-center justify-center h-64">
        <AlertCircle className="h-12 w-12 text-red-400 mb-4" />
        <h3 className="text-lg font-medium text-gray-900">Purchase order not found</h3>
        <Link
          href="/dashboard/vendors?tab=purchase-orders"
          className="mt-4 text-primary-600 hover:text-primary-800"
        >
          Back to Purchase Orders
        </Link>
      </div>
    )
  }

  const statusConfig = STATUS_CONFIG[po.status] || STATUS_CONFIG.DRAFT

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/vendors?tab=purchase-orders"
            className="p-2 rounded-md hover:bg-gray-100"
          >
            <ArrowLeft className="h-5 w-5 text-gray-500" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-semibold text-gray-900">{po.orderNumber}</h1>
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${statusConfig.bgColor} ${statusConfig.color}`}>
                {statusConfig.label}
              </span>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Created {new Date(po.createdAt).toLocaleDateString()} by {po.createdBy.firstName} {po.createdBy.lastName}
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Export PDF - always available */}
          <button
            onClick={exportToPDF}
            className="flex items-center px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Export PDF
          </button>

          {po.status === 'DRAFT' && (
            <>
              <button
                onClick={() => approveMutation.mutate()}
                disabled={approveMutation.isPending}
                className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {approveMutation.isPending ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={() => {
                  if (confirm('Delete this purchase order?')) {
                    deleteMutation.mutate()
                  }
                }}
                disabled={deleteMutation.isPending}
                className="flex items-center px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </button>
            </>
          )}

          {po.status === 'APPROVED' && (
            <button
              onClick={() => sendMutation.mutate()}
              disabled={sendMutation.isPending}
              className="flex items-center px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50"
            >
              <Send className="h-4 w-4 mr-2" />
              {sendMutation.isPending ? 'Marking as Sent...' : 'Mark as Sent'}
            </button>
          )}

          {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED') && (
            <button
              onClick={() => setShowReceiveModal(true)}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700"
            >
              <Package className="h-4 w-4 mr-2" />
              Receive Items
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Line Items */}
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-medium text-gray-900">Items</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Item</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                    {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && (
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Received</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {po.lineItems.map((item) => (
                    <tr key={item.id}>
                      <td className="px-6 py-4">
                        <Link
                          href={`/dashboard/procurement/${item.itemId}`}
                          className="font-medium text-gray-900 hover:text-primary-600"
                        >
                          {item.item.name}
                        </Link>
                        <p className="text-xs text-gray-500">
                          {item.item.category} &bull; {item.item.unit}
                          {item.item.sku && ` &bull; SKU: ${item.item.sku}`}
                        </p>
                      </td>
                      <td className="px-6 py-4 text-right text-gray-900">{item.quantity}</td>
                      <td className="px-6 py-4 text-right text-gray-900">{format(item.unitPrice)}</td>
                      <td className="px-6 py-4 text-right font-medium text-gray-900">{format(item.total)}</td>
                      {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && (
                        <td className="px-6 py-4 text-right">
                          <span className={item.receivedQuantity >= item.quantity ? 'text-green-600' : 'text-orange-600'}>
                            {item.receivedQuantity} / {item.quantity}
                          </span>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
                <tfoot className="bg-gray-50">
                  <tr>
                    <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-500">Subtotal</td>
                    <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{format(po.subtotal)}</td>
                    {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && <td />}
                  </tr>
                  {po.tax > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-500">Tax</td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{format(po.tax)}</td>
                      {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && <td />}
                    </tr>
                  )}
                  {po.shipping > 0 && (
                    <tr>
                      <td colSpan={3} className="px-6 py-3 text-right text-sm text-gray-500">Shipping</td>
                      <td className="px-6 py-3 text-right text-sm font-medium text-gray-900">{format(po.shipping)}</td>
                      {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && <td />}
                    </tr>
                  )}
                  <tr className="border-t-2">
                    <td colSpan={3} className="px-6 py-3 text-right text-sm font-medium text-gray-900">Total</td>
                    <td className="px-6 py-3 text-right text-lg font-semibold text-gray-900">{format(po.total)}</td>
                    {(po.status === 'SENT' || po.status === 'PARTIALLY_RECEIVED' || po.status === 'RECEIVED') && <td />}
                  </tr>
                </tfoot>
              </table>
            </div>
          </div>

          {/* Notes & Terms */}
          {(po.notes || po.terms) && (
            <div className="bg-white rounded-lg shadow border p-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {po.notes && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Internal Notes</h3>
                    <p className="text-gray-900 whitespace-pre-wrap">{po.notes}</p>
                  </div>
                )}
                {po.terms && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 mb-2">Terms & Conditions</h3>
                    <p className="text-gray-900 whitespace-pre-wrap">{po.terms}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Vendor Info */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <Building className="h-4 w-4 mr-2" />
              Vendor
            </h3>
            <Link
              href={`/dashboard/vendors/${po.vendor.id}`}
              className="text-lg font-medium text-gray-900 hover:text-primary-600"
            >
              {po.vendor.companyName || po.vendor.name}
            </Link>
            {po.vendor.companyName && (
              <p className="text-sm text-gray-500">{po.vendor.name}</p>
            )}
            {po.vendor.email && (
              <p className="text-sm text-gray-500 mt-2">{po.vendor.email}</p>
            )}
            {po.vendor.phone && (
              <p className="text-sm text-gray-500">{po.vendor.phone}</p>
            )}
            {po.vendor.address && (
              <p className="text-sm text-gray-500 mt-2">
                {po.vendor.address}
                {po.vendor.city && `, ${po.vendor.city}`}
                {po.vendor.state && `, ${po.vendor.state}`}
                {po.vendor.zipCode && ` ${po.vendor.zipCode}`}
              </p>
            )}
          </div>

          {/* Project */}
          {po.project && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
                <FileText className="h-4 w-4 mr-2" />
                Project
              </h3>
              <Link
                href={`/dashboard/projects/${po.project.id}`}
                className="text-lg font-medium text-gray-900 hover:text-primary-600"
              >
                {po.project.title}
              </Link>
            </div>
          )}

          {/* Dates & Status */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
              <Calendar className="h-4 w-4 mr-2" />
              Timeline
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Created</span>
                <span className="text-gray-900">{new Date(po.createdAt).toLocaleDateString()}</span>
              </div>
              {po.approvedAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Approved</span>
                  <span className="text-gray-900">{new Date(po.approvedAt).toLocaleDateString()}</span>
                </div>
              )}
              {po.sentAt && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Sent</span>
                  <span className="text-gray-900">{new Date(po.sentAt).toLocaleDateString()}</span>
                </div>
              )}
              {po.expectedDeliveryDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Expected Delivery</span>
                  <span className="text-gray-900">{new Date(po.expectedDeliveryDate).toLocaleDateString()}</span>
                </div>
              )}
              {po.deliveredDate && (
                <div className="flex justify-between">
                  <span className="text-gray-500">Delivered</span>
                  <span className="text-green-600 font-medium">{new Date(po.deliveredDate).toLocaleDateString()}</span>
                </div>
              )}
            </div>
          </div>

          {/* Approval Info */}
          {po.approvedBy && (
            <div className="bg-white rounded-lg shadow border p-6">
              <h3 className="text-sm font-medium text-gray-500 mb-4 flex items-center">
                <User className="h-4 w-4 mr-2" />
                Approved By
              </h3>
              <p className="font-medium text-gray-900">
                {po.approvedBy.firstName} {po.approvedBy.lastName}
              </p>
              <p className="text-sm text-gray-500">{po.approvedBy.email}</p>
            </div>
          )}
        </div>
      </div>

      {/* Receive Items Modal */}
      {showReceiveModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl p-6 max-h-[80vh] overflow-y-auto">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Receive Items</h3>
            <p className="text-sm text-gray-500 mb-4">Enter the quantities received for each item</p>

            <div className="space-y-4">
              {po.lineItems.map((item) => {
                const remaining = item.quantity - item.receivedQuantity
                return (
                  <div key={item.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{item.item.name}</p>
                      <p className="text-sm text-gray-500">
                        Ordered: {item.quantity} &bull; Received: {item.receivedQuantity} &bull; Remaining: {remaining}
                      </p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        min="0"
                        max={remaining}
                        value={receiveItems[item.id] || ''}
                        onChange={(e) => setReceiveItems({
                          ...receiveItems,
                          [item.id]: Math.min(parseInt(e.target.value) || 0, remaining)
                        })}
                        disabled={remaining === 0}
                        className="w-24 border border-gray-300 rounded-md px-3 py-2 text-right focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100"
                        placeholder="0"
                      />
                      <span className="text-sm text-gray-500">/ {remaining}</span>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="flex justify-end space-x-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setShowReceiveModal(false)
                  setReceiveItems({})
                }}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleReceive}
                disabled={receiveMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50"
              >
                {receiveMutation.isPending ? 'Recording...' : 'Record Receipt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
