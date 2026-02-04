'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { DollarSign, Edit3, Save, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'

interface TaskBudgetSectionProps {
  taskId: string
  budgetAmount?: number | null
  approvedAmount?: number | null
  totalPaid: number
  onUpdate?: () => void
}

export function TaskBudgetSection({
  taskId,
  budgetAmount,
  approvedAmount,
  totalPaid,
  onUpdate
}: TaskBudgetSectionProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [editBudget, setEditBudget] = useState(budgetAmount?.toString() || '')
  const [editApproved, setEditApproved] = useState(approvedAmount?.toString() || '')
  const queryClient = useQueryClient()
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()

  const updateMutation = useMutation({
    mutationFn: async (data: { budgetAmount?: number; approvedAmount?: number }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) throw new Error('Failed to update budget')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      setIsEditing(false)
      toast.success('Budget updated successfully')
      onUpdate?.()
    },
    onError: () => {
      toast.error('Failed to update budget')
    }
  })

  const handleSave = () => {
    updateMutation.mutate({
      budgetAmount: editBudget ? parseFloat(editBudget) : undefined,
      approvedAmount: editApproved ? parseFloat(editApproved) : undefined
    })
  }

  const handleCancel = () => {
    setEditBudget(budgetAmount?.toString() || '')
    setEditApproved(approvedAmount?.toString() || '')
    setIsEditing(false)
  }

  const variance = (budgetAmount || 0) - (approvedAmount || 0)
  const remaining = (approvedAmount || 0) - totalPaid

  return (
    <div className="bg-white border rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
          <DollarSign className="h-4 w-4 text-green-600" />
          Budget & Payments
        </h4>
        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="text-gray-400 hover:text-gray-600"
          >
            <Edit3 className="h-4 w-4" />
          </button>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={handleSave}
              disabled={updateMutation.isPending}
              className="text-green-600 hover:text-green-700"
            >
              <Save className="h-4 w-4" />
            </button>
            <button
              onClick={handleCancel}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        {/* Budget Amount */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Budget Amount</span>
          {isEditing ? (
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
              <input
                type="number"
                value={editBudget}
                onChange={(e) => setEditBudget(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-500 text-right"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(budgetAmount || 0)}
            </span>
          )}
        </div>

        {/* Approved Amount */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Approved Amount</span>
          {isEditing ? (
            <div className="relative w-32">
              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">{currencySymbol}</span>
              <input
                type="number"
                value={editApproved}
                onChange={(e) => setEditApproved(e.target.value)}
                className="w-full pl-6 pr-2 py-1 text-sm border rounded focus:ring-1 focus:ring-primary-500 text-right"
                placeholder="0.00"
                step="0.01"
              />
            </div>
          ) : (
            <span className="text-sm font-medium text-gray-900">
              {formatCurrency(approvedAmount || 0)}
            </span>
          )}
        </div>

        {/* Variance */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-gray-600">Cost Variance</span>
          <span className={`text-sm font-medium ${variance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
            {variance >= 0 ? '+' : ''}{formatCurrency(Math.abs(variance))}
          </span>
        </div>

        {/* Total Paid */}
        <div className="flex justify-between items-center">
          <span className="text-sm text-gray-600">Total Paid</span>
          <span className="text-sm font-medium text-gray-900">
            {formatCurrency(totalPaid)}
          </span>
        </div>

        {/* Remaining */}
        <div className="flex justify-between items-center pt-2 border-t">
          <span className="text-sm text-gray-600 font-medium">Remaining</span>
          <span className={`text-sm font-bold ${remaining >= 0 ? 'text-blue-600' : 'text-red-600'}`}>
            {formatCurrency(remaining)}
          </span>
        </div>

        {/* Progress Bar */}
        {(approvedAmount || 0) > 0 && (
          <div className="mt-2">
            <div className="flex justify-between text-xs text-gray-500 mb-1">
              <span>Payment Progress</span>
              <span>{Math.round((totalPaid / (approvedAmount || 1)) * 100)}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${
                  totalPaid > (approvedAmount || 0) ? 'bg-red-500' : 'bg-green-500'
                }`}
                style={{ width: `${Math.min((totalPaid / (approvedAmount || 1)) * 100, 100)}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
