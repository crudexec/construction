'use client'

import { useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Plus, X, Building2 } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface PropertyFormProps {
  property?: {
    id: string
    name: string
    type: string
    status: string
    address: string
    city: string
    state: string
    zipCode: string
    country: string
    yearBuilt?: number
    totalUnits?: number
    totalSqft?: number
    lotSize?: number
    stories?: number
    parkingSpaces?: number
    purchasePrice?: number
    purchaseDate?: string
    currentValue?: number
    managerId?: string
    description?: string
    amenities?: string[]
    notes?: string
  }
}

async function fetchUsers() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}

async function createProperty(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/properties', {
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
    throw new Error(error.error || 'Failed to create property')
  }
  return response.json()
}

async function updateProperty(id: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/properties/${id}`, {
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
    throw new Error(error.error || 'Failed to update property')
  }
  return response.json()
}

export function PropertyForm({ property }: PropertyFormProps) {
  const router = useRouter()
  const { currency } = useCurrency()
  const isEditing = !!property

  const [formData, setFormData] = useState({
    name: property?.name || '',
    type: property?.type || 'APARTMENT_COMPLEX',
    status: property?.status || 'ACTIVE',
    address: property?.address || '',
    city: property?.city || '',
    state: property?.state || '',
    zipCode: property?.zipCode || '',
    country: property?.country || 'Kenya',
    yearBuilt: property?.yearBuilt?.toString() || '',
    totalUnits: property?.totalUnits?.toString() || '',
    totalSqft: property?.totalSqft?.toString() || '',
    lotSize: property?.lotSize?.toString() || '',
    stories: property?.stories?.toString() || '',
    parkingSpaces: property?.parkingSpaces?.toString() || '',
    purchasePrice: property?.purchasePrice?.toString() || '',
    purchaseDate: property?.purchaseDate ? property.purchaseDate.split('T')[0] : '',
    currentValue: property?.currentValue?.toString() || '',
    managerId: property?.managerId || '',
    description: property?.description || '',
    amenities: property?.amenities || [],
    notes: property?.notes || ''
  })

  const [newAmenity, setNewAmenity] = useState('')
  const [error, setError] = useState<string | null>(null)

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  })

  const createMutation = useMutation({
    mutationFn: createProperty,
    onSuccess: (data) => {
      router.push(`/dashboard/properties/${data.id}`)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateProperty(property!.id, data),
    onSuccess: () => {
      router.push(`/dashboard/properties/${property!.id}`)
    },
    onError: (error: Error) => {
      setError(error.message)
    }
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    const data = {
      name: formData.name,
      type: formData.type,
      status: formData.status,
      address: formData.address,
      city: formData.city,
      state: formData.state,
      zipCode: formData.zipCode,
      country: formData.country,
      yearBuilt: formData.yearBuilt ? parseInt(formData.yearBuilt) : undefined,
      totalUnits: formData.totalUnits ? parseInt(formData.totalUnits) : undefined,
      totalSqft: formData.totalSqft ? parseFloat(formData.totalSqft) : undefined,
      lotSize: formData.lotSize ? parseFloat(formData.lotSize) : undefined,
      stories: formData.stories ? parseInt(formData.stories) : undefined,
      parkingSpaces: formData.parkingSpaces ? parseInt(formData.parkingSpaces) : undefined,
      purchasePrice: formData.purchasePrice ? parseFloat(formData.purchasePrice) : undefined,
      purchaseDate: formData.purchaseDate || undefined,
      currentValue: formData.currentValue ? parseFloat(formData.currentValue) : undefined,
      managerId: formData.managerId || undefined,
      description: formData.description || undefined,
      amenities: formData.amenities,
      notes: formData.notes || undefined
    }

    if (isEditing) {
      updateMutation.mutate(data)
    } else {
      createMutation.mutate(data)
    }
  }

  const addAmenity = () => {
    if (newAmenity.trim() && !formData.amenities.includes(newAmenity.trim())) {
      setFormData({
        ...formData,
        amenities: [...formData.amenities, newAmenity.trim()]
      })
      setNewAmenity('')
    }
  }

  const removeAmenity = (amenity: string) => {
    setFormData({
      ...formData,
      amenities: formData.amenities.filter(a => a !== amenity)
    })
  }

  const isPending = createMutation.isPending || updateMutation.isPending

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
          {error}
        </div>
      )}

      {/* Basic Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Basic Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="e.g., Sunrise Apartments"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            >
              <option value="RESIDENTIAL_SINGLE">Single Family</option>
              <option value="RESIDENTIAL_MULTI">Multi Family</option>
              <option value="APARTMENT_COMPLEX">Apartment Complex</option>
              <option value="COMMERCIAL_OFFICE">Office</option>
              <option value="COMMERCIAL_RETAIL">Retail</option>
              <option value="COMMERCIAL_INDUSTRIAL">Industrial</option>
              <option value="MIXED_USE">Mixed Use</option>
              <option value="LAND">Land</option>
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
              <option value="ACTIVE">Active</option>
              <option value="UNDER_CONSTRUCTION">Under Construction</option>
              <option value="RENOVATION">Renovation</option>
              <option value="INACTIVE">Inactive</option>
              <option value="SOLD">Sold</option>
            </select>
          </div>
        </div>
      </div>

      {/* Location */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Location</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Street Address *
            </label>
            <input
              type="text"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="123 Main Street"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              City *
            </label>
            <input
              type="text"
              value={formData.city}
              onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              State/County *
            </label>
            <input
              type="text"
              value={formData.state}
              onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Postal Code *
            </label>
            <input
              type="text"
              value={formData.zipCode}
              onChange={(e) => setFormData({ ...formData, zipCode: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Country
            </label>
            <input
              type="text"
              value={formData.country}
              onChange={(e) => setFormData({ ...formData, country: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>
        </div>
      </div>

      {/* Property Details */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Property Details</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Year Built
            </label>
            <input
              type="number"
              value={formData.yearBuilt}
              onChange={(e) => setFormData({ ...formData, yearBuilt: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="1800"
              max={new Date().getFullYear()}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Units
            </label>
            <input
              type="number"
              value={formData.totalUnits}
              onChange={(e) => setFormData({ ...formData, totalUnits: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Total Sqft
            </label>
            <input
              type="number"
              value={formData.totalSqft}
              onChange={(e) => setFormData({ ...formData, totalSqft: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Stories
            </label>
            <input
              type="number"
              value={formData.stories}
              onChange={(e) => setFormData({ ...formData, stories: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Lot Size (sqft)
            </label>
            <input
              type="number"
              value={formData.lotSize}
              onChange={(e) => setFormData({ ...formData, lotSize: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Parking Spaces
            </label>
            <input
              type="number"
              value={formData.parkingSpaces}
              onChange={(e) => setFormData({ ...formData, parkingSpaces: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Financial Information */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Financial Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Price ({currency})
            </label>
            <input
              type="number"
              value={formData.purchasePrice}
              onChange={(e) => setFormData({ ...formData, purchasePrice: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Purchase Date
            </label>
            <input
              type="date"
              value={formData.purchaseDate}
              onChange={(e) => setFormData({ ...formData, purchaseDate: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Current Value ({currency})
            </label>
            <input
              type="number"
              value={formData.currentValue}
              onChange={(e) => setFormData({ ...formData, currentValue: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              min="0"
            />
          </div>
        </div>
      </div>

      {/* Management */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Management</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Property Manager
            </label>
            <select
              value={formData.managerId}
              onChange={(e) => setFormData({ ...formData, managerId: e.target.value })}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="">Select a manager</option>
              {users.map((user: any) => (
                <option key={user.id} value={user.id}>
                  {user.firstName} {user.lastName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Amenities */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Amenities</h3>
        <div className="flex flex-wrap gap-2 mb-3">
          {formData.amenities.map((amenity, index) => (
            <span
              key={index}
              className="inline-flex items-center px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm"
            >
              {amenity}
              <button
                type="button"
                onClick={() => removeAmenity(amenity)}
                className="ml-2 hover:text-primary-600"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <input
            type="text"
            value={newAmenity}
            onChange={(e) => setNewAmenity(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addAmenity())}
            className="flex-1 border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            placeholder="Add amenity (e.g., Pool, Gym, Security)"
          />
          <button
            type="button"
            onClick={addAmenity}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200"
          >
            <Plus className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Description */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Description & Notes</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Description
            </label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              rows={3}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Property description..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Internal Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={2}
              className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              placeholder="Internal notes (not visible to tenants)..."
            />
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end space-x-3 pt-6 border-t">
        <button
          type="button"
          onClick={() => router.back()}
          className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isPending}
          className="px-6 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-2"
        >
          <Building2 className="h-5 w-5" />
          <span>{isPending ? 'Saving...' : isEditing ? 'Update Property' : 'Create Property'}</span>
        </button>
      </div>
    </form>
  )
}
