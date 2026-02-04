'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { X, ArrowUpCircle, ArrowDownCircle } from 'lucide-react'

interface Material {
  id: string
  name: string
  sku: string | null
  unit: string
  quantity: number
}

interface Project {
  id: string
  title: string
}

interface StockModalProps {
  isOpen: boolean
  onClose: () => void
  material: Material
  type: 'in' | 'out'
}

async function fetchProjects() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/projects?status=ACTIVE', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) return []
  return response.json()
}

async function stockIn(materialId: string, data: { quantity: number; reason?: string }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/inventory/${materialId}/stock-in`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to add stock')
  }
  return response.json()
}

async function stockOut(materialId: string, data: { quantity: number; reason?: string; projectId?: string }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/inventory/${materialId}/stock-out`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to remove stock')
  }
  return response.json()
}

export function StockModal({ isOpen, onClose, material, type }: StockModalProps) {
  const queryClient = useQueryClient()
  const [quantity, setQuantity] = useState<number>(1)
  const [reason, setReason] = useState('')
  const [projectId, setProjectId] = useState('')
  const [error, setError] = useState('')

  const { data: projects = [] } = useQuery<Project[]>({
    queryKey: ['projects-active'],
    queryFn: fetchProjects,
    enabled: type === 'out'
  })

  const stockInMutation = useMutation({
    mutationFn: (data: { quantity: number; reason?: string }) => stockIn(material.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const stockOutMutation = useMutation({
    mutationFn: (data: { quantity: number; reason?: string; projectId?: string }) => stockOut(material.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['inventory'] })
      onClose()
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!quantity || quantity <= 0) {
      setError('Quantity must be greater than 0')
      return
    }

    if (type === 'out' && quantity > material.quantity) {
      setError(`Insufficient stock. Available: ${material.quantity} ${material.unit}`)
      return
    }

    const data = {
      quantity,
      reason: reason.trim() || undefined,
      ...(type === 'out' && projectId ? { projectId } : {})
    }

    if (type === 'in') {
      stockInMutation.mutate(data)
    } else {
      stockOutMutation.mutate(data)
    }
  }

  if (!isOpen) return null

  const isPending = stockInMutation.isPending || stockOutMutation.isPending
  const isStockIn = type === 'in'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-xl max-w-md w-full mx-4 shadow-xl">
        <div className={`border-b px-6 py-4 flex items-center justify-between ${isStockIn ? 'bg-green-50' : 'bg-red-50'}`}>
          <div className="flex items-center gap-3">
            {isStockIn ? (
              <ArrowUpCircle className="h-6 w-6 text-green-600" />
            ) : (
              <ArrowDownCircle className="h-6 w-6 text-red-600" />
            )}
            <h2 className="text-lg font-semibold text-gray-900">
              {isStockIn ? 'Stock In' : 'Stock Out'}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Material Info */}
          <div className="bg-gray-50 rounded-lg p-4">
            <p className="font-medium text-gray-900">{material.name}</p>
            {material.sku && <p className="text-sm text-gray-500">SKU: {material.sku}</p>}
            <p className="text-sm text-gray-600 mt-1">
              Current Stock: <span className="font-semibold">{material.quantity} {material.unit}</span>
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Quantity ({material.unit}) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              min="0.01"
              step="0.01"
              value={quantity}
              onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              autoFocus
            />
            {type === 'out' && (
              <p className="text-xs text-gray-500 mt-1">
                New quantity will be: {Math.max(0, material.quantity - quantity).toFixed(2)} {material.unit}
              </p>
            )}
            {type === 'in' && (
              <p className="text-xs text-gray-500 mt-1">
                New quantity will be: {(material.quantity + quantity).toFixed(2)} {material.unit}
              </p>
            )}
          </div>

          {type === 'out' && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Allocate to Project
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="">No project (general use)</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>{project.title}</option>
                ))}
              </select>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Reason / Notes
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              rows={2}
              className="w-full px-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder={isStockIn ? 'e.g., Received from supplier' : 'e.g., Used for installation'}
            />
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`flex-1 px-4 py-2 text-white rounded-lg transition-colors disabled:opacity-50 ${
                isStockIn
                  ? 'bg-green-600 hover:bg-green-700'
                  : 'bg-red-600 hover:bg-red-700'
              }`}
            >
              {isPending ? 'Processing...' : isStockIn ? 'Add Stock' : 'Remove Stock'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
