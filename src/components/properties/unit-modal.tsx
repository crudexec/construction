'use client'

import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { X } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface UnitModalProps {
  propertyId: string
  unit?: {
    id: string
    unitNumber: string
    type: string
    status: string
    bedrooms?: number
    bathrooms?: number
    sqft?: number
    floor?: number
    marketRent?: number
    currentRent?: number
    depositAmount?: number
    features: string[]
    description?: string
    notes?: string
  }
  onClose: () => void
  onSuccess: () => void
}

async function createUnit(propertyId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/properties/${propertyId}/units`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create unit')
  }
  return response.json()
}

async function updateUnit(unitId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/units/${unitId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update unit')
  }
  return response.json()
}

export function UnitModal({ propertyId, unit, onClose, onSuccess }: UnitModalProps) {
  const { currency } = useCurrency()
  const isEditing = !!unit

  const [formData, setFormData] = useState({
    unitNumber: unit?.unitNumber || '',
    type: unit?.type || 'OTHER',
    status: unit?.status || 'VACANT',
    bedrooms: unit?.bedrooms?.toString() || '',
    bathrooms: unit?.bathrooms?.toString() || '',
    sqft: unit?.sqft?.toString() || '',
    floor: unit?.floor?.toString() || '',
    marketRent: unit?.marketRent?.toString() || '',
    currentRent: unit?.currentRent?.toString() || '',
    depositAmount: unit?.depositAmount?.toString() || '',
    features: unit?.features?.join(', ') || '',
    description: unit?.description || '',
    notes: unit?.notes || ''
  })

  const [error, setError] = useState<string | null>(null)

  const createMutation = useMutation({
    mutationFn: (data: any) => createUnit(propertyId, data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateUnit(unit!.id, data),
    onSuccess: () => {
      onSuccess()
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      unitNumber: formData.unitNumber,
      type: formData.type,
      status: formData.status,
      bedrooms: formData.bedrooms ? parseInt(formData.bedrooms) : undefined,
      bathrooms: formData.bathrooms ? parseFloat(formData.bathrooms) : undefined,
      sqft: formData.sqft ? parseFloat(formData.sqft) : undefined,
      floor: formData.floor ? parseInt(formData.floor) : undefined,
      marketRent: formData.marketRent ? parseFloat(formData.marketRent) : undefined,
      currentRent: formData.currentRent ? parseFloat(formData.currentRent) : undefined,
      depositAmount: formData.depositAmount ? parseFloat(formData.depositAmount) : undefined,
      features: formData.features ? formData.features.split(',').map(f => f.trim()).filter(Boolean) : [],
      description: formData.description || undefined,
      notes: formData.notes || undefined
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-4 border-b sticky top-0 bg-white">
          <h2 className="text-xl font-semibold text-gray-900">
            {isEditing ? 'Edit Unit' : 'Add New Unit'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
              {error}
            </div>
          )}

          {/* Basic Info */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Number *
              </label>
              <input
                type="text"
                value={formData.unitNumber}
                onChange={(e) => setFormData({ ...formData, unitNumber: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 101, A1"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Unit Type
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="STUDIO">Studio</option>
                <option value="ONE_BED">1 Bedroom</option>
                <option value="TWO_BED">2 Bedroom</option>
                <option value="THREE_BED">3 Bedroom</option>
                <option value="FOUR_BED_PLUS">4+ Bedroom</option>
                <option value="OFFICE">Office</option>
                <option value="RETAIL">Retail</option>
                <option value="WAREHOUSE">Warehouse</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              >
                <option value="VACANT">Vacant</option>
                <option value="OCCUPIED">Occupied</option>
                <option value="NOTICE_GIVEN">Notice Given</option>
                <option value="MAKE_READY">Make Ready</option>
                <option value="DOWN">Down</option>
                <option value="MODEL">Model</option>
              </select>
            </div>
          </div>

          {/* Specs */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bedrooms
              </label>
              <input
                type="number"
                value={formData.bedrooms}
                onChange={(e) => setFormData({ ...formData, bedrooms: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bathrooms
              </label>
              <input
                type="number"
                step="0.5"
                value={formData.bathrooms}
                onChange={(e) => setFormData({ ...formData, bathrooms: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Sqft
              </label>
              <input
                type="number"
                value={formData.sqft}
                onChange={(e) => setFormData({ ...formData, sqft: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Floor
              </label>
              <input
                type="number"
                value={formData.floor}
                onChange={(e) => setFormData({ ...formData, floor: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>

          {/* Rent */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Market Rent ({currency})
              </label>
              <input
                type="number"
                value={formData.marketRent}
                onChange={(e) => setFormData({ ...formData, marketRent: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Current Rent ({currency})
              </label>
              <input
                type="number"
                value={formData.currentRent}
                onChange={(e) => setFormData({ ...formData, currentRent: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Deposit Amount ({currency})
              </label>
              <input
                type="number"
                value={formData.depositAmount}
                onChange={(e) => setFormData({ ...formData, depositAmount: e.target.value })}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                min="0"
              />
            </div>
          </div>

          {/* Features */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Features
            </label>
            <input
              type="text"
              value={formData.features}
              onChange={(e) => setFormData({ ...formData, features: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Balcony, Parking, In-unit Laundry (comma separated)"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
            >
              {isPending ? 'Saving...' : isEditing ? 'Update Unit' : 'Add Unit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
