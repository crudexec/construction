'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { AssetStatusSelect } from '@/components/assets/asset-status-select'
import { AssetCategoryField } from '@/components/assets/asset-category-field'
import { AssetLocationSelect, AssetPersonSelect, locationFields } from '@/components/assets/asset-context-fields'

interface AssetFormData {
  equipmentId: string
  category: string
  name: string
  description: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber: string
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  statusDefinitionId: string
  make: string
  model: string
  year: string
  vin: string
  licensePlate: string
  locationSelection: string
  currentAssigneeId: string
  purchaseCost: string
  purchaseDate: string
  warrantyExpiry: string
  notes: string
}

interface AssetStatusDefinition {
  id: string
  name: string
  baseStatus: AssetFormData['status']
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

function getAuthHeaders(extraHeaders: HeadersInit = {}) {
  const token = getToken()
  return {
    ...extraHeaders,
    ...(token ? { Authorization: `Bearer ${token}` } : {})
  }
}

async function fetchAssetStatuses(): Promise<AssetStatusDefinition[]> {
  const response = await fetch('/api/asset-statuses', {
    headers: getAuthHeaders(),
    credentials: 'include'
  })
  if (!response.ok) return []
  return response.json()
}

export default function NewAssetPage() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [error, setError] = useState<string | null>(null)
  const { symbol: currencySymbol } = useCurrency()

  const [formData, setFormData] = useState<AssetFormData>({
    equipmentId: '',
    category: '',
    name: '',
    description: '',
    type: 'EQUIPMENT',
    serialNumber: '',
    status: 'AVAILABLE',
    statusDefinitionId: '',
    make: '',
    model: '',
    year: '',
    vin: '',
    licensePlate: '',
    locationSelection: '',
    currentAssigneeId: '',
    purchaseCost: '',
    purchaseDate: '',
    warrantyExpiry: '',
    notes: ''
  })

  const { data: assetStatuses = [] } = useQuery({
    queryKey: ['asset-statuses'],
    queryFn: fetchAssetStatuses
  })

  const createMutation = useMutation({
    mutationFn: async (data: AssetFormData) => {
      const response = await fetch('/api/assets', {
        method: 'POST',
        headers: getAuthHeaders({
          'Content-Type': 'application/json'
        }),
        credentials: 'include',
        body: JSON.stringify({
          equipmentId: data.equipmentId.trim() || null,
          category: data.category.trim() || null,
          name: data.name,
          description: data.description || undefined,
          type: data.type,
          serialNumber: data.serialNumber || undefined,
          status: data.status,
          statusDefinitionId: data.statusDefinitionId || undefined,
          make: data.make || undefined,
          model: data.model || undefined,
          year: data.year || undefined,
          vin: data.vin || undefined,
          licensePlate: data.licensePlate || undefined,
          ...locationFields(data.locationSelection),
          currentAssigneeId: data.currentAssigneeId || null,
          purchaseCost: data.purchaseCost ? parseFloat(data.purchaseCost) : undefined,
          purchaseDate: data.purchaseDate || undefined,
          warrantyExpiry: data.warrantyExpiry || undefined,
          notes: data.notes || undefined
        })
      })

      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to create asset')
      }
      return response.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      router.push(`/dashboard/assets/${data.id}`)
    },
    onError: (err: Error) => {
      setError(err.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (!formData.name.trim()) {
      setError('Asset name is required')
      return
    }

    createMutation.mutate(formData)
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          href="/dashboard/assets"
          className="text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-6 w-6" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Add New Asset</h1>
          <p className="text-gray-600">Create a new equipment, vehicle, or tool profile</p>
        </div>
      </div>

      {/* Error Alert */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
          {error}
        </div>
      )}

      {/* Form */}
      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Information */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Basic Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="md:col-span-2">
              <label htmlFor="equipmentId" className="block text-sm font-medium text-gray-700 mb-1">Equipment ID</label>
              <input id="equipmentId" name="equipmentId" value={formData.equipmentId} onChange={handleChange} maxLength={100} placeholder="e.g., EX-001" className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
              <p className="mt-1 text-xs text-gray-500">Your fleet identifier. Optional; must be unique within your company.</p>
            </div>
            <div className="md:col-span-2">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Asset Name *
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., CAT 320 Excavator"
                required
              />
            </div>

            <div>
              <label htmlFor="status" className="block text-sm font-medium text-gray-700 mb-1">
                Status *
              </label>
              <AssetStatusSelect
                id="status"
                status={formData.status}
                statusDefinitionId={formData.statusDefinitionId}
                definitions={assetStatuses}
                onChange={(value) => setFormData(prev => ({ ...prev, ...value }))}
              />
            </div>

            <div>
              <label htmlFor="type" className="block text-sm font-medium text-gray-700 mb-1">
                Asset Type *
              </label>
              <select
                id="type"
                name="type"
                value={formData.type}
                onChange={event => setFormData(prev => ({ ...prev, type: event.target.value as AssetFormData['type'], category: '' }))}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                required
              >
                <option value="VEHICLE">Vehicle</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="TOOL">Tool</option>
              </select>
            </div>

            <AssetCategoryField type={formData.type} value={formData.category} onChange={category => setFormData(prev => ({ ...prev, category }))} />

            <div>
              <label htmlFor="serialNumber" className="block text-sm font-medium text-gray-700 mb-1">
                Serial Number
              </label>
              <input
                type="text"
                id="serialNumber"
                name="serialNumber"
                value={formData.serialNumber}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., SN-12345678"
              />
            </div>

            <div>
              <label htmlFor="make" className="block text-sm font-medium text-gray-700 mb-1">
                Make
              </label>
              <input
                type="text"
                id="make"
                name="make"
                value={formData.make}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., CAT, Ford"
              />
            </div>

            <div>
              <label htmlFor="model" className="block text-sm font-medium text-gray-700 mb-1">
                Model
              </label>
              <input
                type="text"
                id="model"
                name="model"
                value={formData.model}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 320, F-150"
              />
            </div>

            <div>
              <label htmlFor="year" className="block text-sm font-medium text-gray-700 mb-1">
                Year
              </label>
              <input
                type="number"
                id="year"
                name="year"
                value={formData.year}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="e.g., 2022"
              />
            </div>

            <div>
              <label htmlFor="vin" className="block text-sm font-medium text-gray-700 mb-1">
                VIN
              </label>
              <input
                type="text"
                id="vin"
                name="vin"
                value={formData.vin}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div>
              <label htmlFor="licensePlate" className="block text-sm font-medium text-gray-700 mb-1">
                License Plate
              </label>
              <input
                type="text"
                id="licensePlate"
                name="licensePlate"
                value={formData.licensePlate}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            <div className="md:col-span-2">
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description
              </label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleChange}
                rows={3}
                className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                placeholder="Brief description of the asset..."
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Assignment and Location</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <AssetLocationSelect value={formData.locationSelection} onChange={locationSelection => setFormData(prev => ({ ...prev, locationSelection }))} />
            <AssetPersonSelect value={formData.currentAssigneeId} onChange={currentAssigneeId => setFormData(prev => ({ ...prev, currentAssigneeId }))} />
          </div>
        </div>

        {/* Purchase Information */}
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-6">Purchase Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div>
              <label htmlFor="purchaseCost" className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Cost
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500">{currencySymbol}</span>
                <input
                  type="number"
                  id="purchaseCost"
                  name="purchaseCost"
                  value={formData.purchaseCost}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            <div>
              <label htmlFor="purchaseDate" className="block text-sm font-medium text-gray-700 mb-1">
                Purchase Date
              </label>
              <DatePicker
                value={formData.purchaseDate}
                onChange={(date) => setFormData({...formData, purchaseDate: date})}
                placeholder="Select purchase date"
              />
            </div>

            <div>
              <label htmlFor="warrantyExpiry" className="block text-sm font-medium text-gray-700 mb-1">
                Warranty Expiry
              </label>
              <DatePicker
                value={formData.warrantyExpiry}
                onChange={(date) => setFormData({...formData, warrantyExpiry: date})}
                placeholder="Select warranty expiry"
              />
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-lg shadow border p-6">
          <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
            Additional Notes
          </label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes}
            onChange={handleChange}
            rows={4}
            className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Any additional notes about this asset..."
          />
        </div>

        {/* Submit Buttons */}
        <div className="flex justify-end space-x-3 pt-4 border-t">
          <Link
            href="/dashboard/assets"
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={createMutation.isPending}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {createMutation.isPending ? 'Creating...' : 'Create Asset'}
          </button>
        </div>
      </form>
    </div>
  )
}
