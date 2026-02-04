'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { X, AlertTriangle, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'

interface EscalateTaskModalProps {
  taskId: string
  taskTitle: string
  isEscalated: boolean
  isOpen: boolean
  onClose: () => void
  onSuccess?: () => void
}

export function EscalateTaskModal({
  taskId,
  taskTitle,
  isEscalated,
  isOpen,
  onClose,
  onSuccess
}: EscalateTaskModalProps) {
  const [reason, setReason] = useState('')
  const queryClient = useQueryClient()

  const escalateMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/${taskId}/escalate`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ reason })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to escalate task')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('Task escalated successfully')
      setReason('')
      onSuccess?.()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const deEscalateMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/task/${taskId}/escalate`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to de-escalate task')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      toast.success('Task de-escalated successfully')
      onSuccess?.()
      onClose()
    },
    onError: (error: Error) => {
      toast.error(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (isEscalated) {
      deEscalateMutation.mutate()
    } else {
      escalateMutation.mutate()
    }
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
              {isEscalated ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  De-escalate Task
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-red-600" />
                  Escalate Task
                </>
              )}
            </h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-sm text-gray-600">Task:</p>
              <p className="font-medium text-gray-900">{taskTitle}</p>
            </div>

            {isEscalated ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <p className="text-sm text-green-800">
                  This task is currently escalated. De-escalating will remove the escalation flag
                  and notify relevant parties that the issue has been resolved.
                </p>
              </div>
            ) : (
              <>
                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <p className="text-sm text-yellow-800">
                    Escalating this task will flag it for immediate attention and notify the project
                    owner and task assignee.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reason for Escalation
                  </label>
                  <textarea
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    rows={3}
                    className="w-full px-4 py-2 border rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    placeholder="Describe why this task needs to be escalated..."
                  />
                </div>
              </>
            )}

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
                disabled={escalateMutation.isPending || deEscalateMutation.isPending}
                className={`px-4 py-2 text-sm font-medium text-white rounded-md disabled:opacity-50 ${
                  isEscalated
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {escalateMutation.isPending || deEscalateMutation.isPending
                  ? 'Processing...'
                  : isEscalated
                  ? 'De-escalate Task'
                  : 'Escalate Task'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}
