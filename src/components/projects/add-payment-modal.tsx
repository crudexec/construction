'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, DollarSign } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

interface AddPaymentModalProps {
  taskId: string
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function AddPaymentModal({ taskId, isOpen, onClose, onSuccess }: AddPaymentModalProps) {
  const [amount, setAmount] = useState('')
  const [invoiceNumber, setInvoiceNumber] = useState('')
  const [referenceNumber, setReferenceNumber] = useState('')
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0])
  const [notes, setNotes] = useState('')

  const queryClient = useQueryClient()
  const { symbol: currencySymbol } = useCurrency()

  const createMutation = useMutation({
    mutationFn: async (data: {
      amount: number
      invoiceNumber?: string
      referenceNumber?: string
      paymentDate: string
      notes?: string
    }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/${taskId}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to add payment')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('Payment added successfully')
      resetForm()
      onSuccess?.()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const resetForm = () => {
    setAmount('')
    setInvoiceNumber('')
    setReferenceNumber('')
    setPaymentDate(new Date().toISOString().split('T')[0])
    setNotes('')
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (!amount || parseFloat(amount) <= 0) {
      toast.error('Please enter a valid amount')
      return
    }

    createMutation.mutate({
      amount: parseFloat(amount),
      invoiceNumber: invoiceNumber || undefined,
      referenceNumber: referenceNumber || undefined,
      paymentDate,
      notes: notes || undefined
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10001 }}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-green-600" />
              Add Payment
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount *
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{currencySymbol}</span>
                <input
                  type="number"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full pl-8 pr-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                  step="0.01"
                  min="0.01"
                  required
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Payment Date *
              </label>
              <DatePicker
                value={paymentDate}
                onChange={(date) => setPaymentDate(date)}
                placeholder="Select payment date"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Invoice Number
                </label>
                <input
                  type="text"
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="INV-001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Reference Number
                </label>
                <input
                  type="text"
                  value={referenceNumber}
                  onChange={(e) => setReferenceNumber(e.target.value)}
                  className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="REF-001"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Notes
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Optional notes about this payment..."
              />
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createMutation.isPending}
                className="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-md hover:bg-primary-700 disabled:opacity-50"
              >
                {createMutation.isPending ? 'Adding...' : 'Add Payment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
