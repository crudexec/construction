'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { Plus, Trash2, Receipt, FileText } from 'lucide-react'
import toast from 'react-hot-toast'
import { AddPaymentModal } from './add-payment-modal'
import { useCurrency } from '@/hooks/useCurrency'

interface Payment {
  id: string
  amount: number
  invoiceNumber?: string
  referenceNumber?: string
  paymentDate: string
  notes?: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface TaskPaymentListProps {
  taskId: string
  payments: Payment[]
  onUpdate?: () => void
}

export function TaskPaymentList({ taskId, payments, onUpdate }: TaskPaymentListProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()

  const deleteMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/payments/${paymentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) throw new Error('Failed to delete payment')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('Payment deleted')
      onUpdate?.()
    },
    onError: () => {
      toast.error('Failed to delete payment')
    }
  })

  const handleDelete = (paymentId: string) => {
    if (confirm('Are you sure you want to delete this payment?')) {
      deleteMutation.mutate(paymentId)
    }
  }

  const totalPaid = payments.reduce((sum, p) => sum + p.amount, 0)

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <Receipt className="h-4 w-4 text-blue-600" />
          Payments ({payments.length})
        </h4>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center gap-1 text-sm text-primary-600 hover:text-primary-700"
        >
          <Plus className="h-4 w-4" />
          Add Payment
        </button>
      </div>

      {payments.length === 0 ? (
        <div className="text-center py-6 bg-gray-50 rounded-lg">
          <Receipt className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">No payments recorded yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {payments.map((payment) => (
            <div
              key={payment.id}
              className="flex items-start justify-between p-3 bg-gray-50 rounded-lg group"
            >
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-gray-900">
                    {formatCurrency(payment.amount)}
                  </span>
                  <span className="text-xs text-gray-500">
                    {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                  </span>
                </div>
                <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                  {payment.invoiceNumber && (
                    <span className="flex items-center gap-1">
                      <FileText className="h-3 w-3" />
                      Inv: {payment.invoiceNumber}
                    </span>
                  )}
                  {payment.referenceNumber && (
                    <span>Ref: {payment.referenceNumber}</span>
                  )}
                </div>
                {payment.notes && (
                  <p className="text-xs text-gray-500 mt-1">{payment.notes}</p>
                )}
                <p className="text-xs text-gray-400 mt-1">
                  Added by {payment.createdBy.firstName} {payment.createdBy.lastName}
                </p>
              </div>
              <button
                onClick={() => handleDelete(payment.id)}
                disabled={deleteMutation.isPending}
                className="opacity-0 group-hover:opacity-100 text-red-500 hover:text-red-700 p-1 transition-opacity"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}

          {/* Total */}
          <div className="flex justify-between items-center pt-3 border-t">
            <span className="text-sm font-medium text-gray-700">Total Paid</span>
            <span className="text-sm font-bold text-gray-900">
              {formatCurrency(totalPaid)}
            </span>
          </div>
        </div>
      )}

      <AddPaymentModal
        taskId={taskId}
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false)
          onUpdate?.()
        }}
      />
    </div>
  )
}
