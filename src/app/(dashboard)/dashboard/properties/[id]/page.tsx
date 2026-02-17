'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Building2,
  MapPin,
  ArrowLeft,
  Edit,
  Trash2,
  Plus,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  Calendar,
  Square,
  Car,
  Layers
} from 'lucide-react'
import { PropertyUnitGrid } from '@/components/properties/property-unit-grid'
import { UnitModal } from '@/components/properties/unit-modal'
import { useCurrency } from '@/hooks/useCurrency'

interface PropertyPageProps {
  params: Promise<{ id: string }>
}

async function fetchProperty(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/properties/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch property')
  return response.json()
}

async function deleteProperty(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/properties/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to delete property')
  return response.json()
}

const getPropertyTypeLabel = (type: string) => {
  switch (type) {
    case 'RESIDENTIAL_SINGLE': return 'Single Family'
    case 'RESIDENTIAL_MULTI': return 'Multi Family'
    case 'APARTMENT_COMPLEX': return 'Apartment Complex'
    case 'COMMERCIAL_OFFICE': return 'Office'
    case 'COMMERCIAL_RETAIL': return 'Retail'
    case 'COMMERCIAL_INDUSTRIAL': return 'Industrial'
    case 'MIXED_USE': return 'Mixed Use'
    case 'LAND': return 'Land'
    default: return type
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'UNDER_CONSTRUCTION': return 'bg-yellow-100 text-yellow-800'
    case 'RENOVATION': return 'bg-blue-100 text-blue-800'
    case 'INACTIVE': return 'bg-gray-100 text-gray-800'
    case 'SOLD': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function PropertyDetailPage({ params }: PropertyPageProps) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format } = useCurrency()
  const [showUnitModal, setShowUnitModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [activeTab, setActiveTab] = useState<'overview' | 'units' | 'financials'>('overview')

  const { data: property, isLoading, error } = useQuery({
    queryKey: ['property', id],
    queryFn: () => fetchProperty(id)
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteProperty(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['properties'] })
      router.push('/dashboard/properties')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !property) {
    return (
      <div className="text-center py-12">
        <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900">Property not found</p>
        <Link
          href="/dashboard/properties"
          className="mt-4 inline-flex items-center text-primary-600 hover:text-primary-700"
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          Back to Properties
        </Link>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/properties"
            className="p-2 hover:bg-gray-100 rounded-full"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <Building2 className="h-8 w-8 text-primary-600" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900">{property.name}</h1>
                <div className="flex items-center text-sm text-gray-500">
                  <MapPin className="h-4 w-4 mr-1" />
                  {property.address}, {property.city}, {property.state} {property.zipCode}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(property.status)}`}>
            {property.status.replace('_', ' ')}
          </span>
          <Link
            href={`/dashboard/properties/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="px-4 py-2 border border-red-300 text-red-700 rounded-md hover:bg-red-50 flex items-center space-x-2"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-6 w-6 text-blue-600" />
            <div>
              <p className="text-xs text-gray-500">Total Units</p>
              <p className="text-xl font-bold text-gray-900">{property.stats.totalUnits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Users className="h-6 w-6 text-green-600" />
            <div>
              <p className="text-xs text-gray-500">Occupied</p>
              <p className="text-xl font-bold text-green-700">{property.stats.occupiedUnits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-6 w-6 text-red-600" />
            <div>
              <p className="text-xs text-gray-500">Vacant</p>
              <p className="text-xl font-bold text-red-700">{property.stats.vacantUnits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-6 w-6 text-purple-600" />
            <div>
              <p className="text-xs text-gray-500">Occupancy</p>
              <p className="text-xl font-bold text-gray-900">{property.stats.occupancyRate}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-yellow-600" />
            <div>
              <p className="text-xs text-gray-500">Monthly Rent</p>
              <p className="text-lg font-bold text-gray-900">{format(property.stats.totalMonthlyRent)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-6 w-6 text-gray-600" />
            <div>
              <p className="text-xs text-gray-500">Lost Rent</p>
              <p className="text-lg font-bold text-red-600">{format(property.stats.lostRent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow border">
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('overview')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'overview'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Overview
            </button>
            <button
              onClick={() => setActiveTab('units')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'units'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Units ({property.units.length})
            </button>
            <button
              onClick={() => setActiveTab('financials')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'financials'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Financials
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Property Details */}
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900">Property Details</h3>
                <dl className="grid grid-cols-2 gap-4">
                  <div>
                    <dt className="text-sm text-gray-500">Type</dt>
                    <dd className="text-sm font-medium text-gray-900">{getPropertyTypeLabel(property.type)}</dd>
                  </div>
                  {property.yearBuilt && (
                    <div>
                      <dt className="text-sm text-gray-500">Year Built</dt>
                      <dd className="text-sm font-medium text-gray-900">{property.yearBuilt}</dd>
                    </div>
                  )}
                  {property.totalSqft && (
                    <div>
                      <dt className="text-sm text-gray-500">Total Sqft</dt>
                      <dd className="text-sm font-medium text-gray-900">{property.totalSqft.toLocaleString()} sqft</dd>
                    </div>
                  )}
                  {property.stories && (
                    <div>
                      <dt className="text-sm text-gray-500">Stories</dt>
                      <dd className="text-sm font-medium text-gray-900">{property.stories}</dd>
                    </div>
                  )}
                  {property.parkingSpaces && (
                    <div>
                      <dt className="text-sm text-gray-500">Parking Spaces</dt>
                      <dd className="text-sm font-medium text-gray-900">{property.parkingSpaces}</dd>
                    </div>
                  )}
                  {property.lotSize && (
                    <div>
                      <dt className="text-sm text-gray-500">Lot Size</dt>
                      <dd className="text-sm font-medium text-gray-900">{property.lotSize.toLocaleString()} sqft</dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Manager & Source */}
              <div className="space-y-4">
                {property.manager && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Property Manager</h3>
                    <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded-lg">
                      <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center">
                        <span className="text-primary-700 font-medium">
                          {property.manager.firstName[0]}{property.manager.lastName[0]}
                        </span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">
                          {property.manager.firstName} {property.manager.lastName}
                        </p>
                        <p className="text-sm text-gray-500">{property.manager.email}</p>
                      </div>
                    </div>
                  </div>
                )}

                {property.sourceProject && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Source Project</h3>
                    <Link
                      href={`/dashboard/projects/${property.sourceProject.id}`}
                      className="flex items-center space-x-3 p-3 bg-blue-50 rounded-lg hover:bg-blue-100"
                    >
                      <Building2 className="h-6 w-6 text-blue-600" />
                      <div>
                        <p className="font-medium text-blue-900">{property.sourceProject.title}</p>
                        <p className="text-sm text-blue-600">View Construction Project</p>
                      </div>
                    </Link>
                  </div>
                )}

                {property.amenities && property.amenities.length > 0 && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Amenities</h3>
                    <div className="flex flex-wrap gap-2">
                      {property.amenities.map((amenity: string, index: number) => (
                        <span
                          key={index}
                          className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm"
                        >
                          {amenity}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {property.description && (
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">Description</h3>
                    <p className="text-gray-600 text-sm">{property.description}</p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'units' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Units</h3>
                <button
                  onClick={() => setShowUnitModal(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Unit</span>
                </button>
              </div>
              <PropertyUnitGrid
                propertyId={id}
                units={property.units}
              />
            </div>
          )}

          {activeTab === 'financials' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-green-50 p-4 rounded-lg">
                  <p className="text-sm text-green-600">Current Monthly Revenue</p>
                  <p className="text-2xl font-bold text-green-700">{format(property.stats.totalMonthlyRent)}</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg">
                  <p className="text-sm text-blue-600">Potential Monthly Revenue</p>
                  <p className="text-2xl font-bold text-blue-700">{format(property.stats.potentialMonthlyRent)}</p>
                </div>
                <div className="bg-red-50 p-4 rounded-lg">
                  <p className="text-sm text-red-600">Lost Revenue (Vacancy)</p>
                  <p className="text-2xl font-bold text-red-700">{format(property.stats.lostRent)}</p>
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm text-gray-600">Average Rent per Unit</p>
                <p className="text-2xl font-bold text-gray-900">{format(property.stats.averageRent)}</p>
              </div>

              {property.purchasePrice && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 border rounded-lg">
                    <p className="text-sm text-gray-500">Purchase Price</p>
                    <p className="text-xl font-bold text-gray-900">{format(property.purchasePrice)}</p>
                    {property.purchaseDate && (
                      <p className="text-sm text-gray-500">
                        Purchased: {new Date(property.purchaseDate).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  {property.currentValue && (
                    <div className="p-4 border rounded-lg">
                      <p className="text-sm text-gray-500">Current Value</p>
                      <p className="text-xl font-bold text-gray-900">{format(property.currentValue)}</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Unit Modal */}
      {showUnitModal && (
        <UnitModal
          propertyId={id}
          onClose={() => setShowUnitModal(false)}
          onSuccess={() => {
            setShowUnitModal(false)
            queryClient.invalidateQueries({ queryKey: ['property', id] })
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Property</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this property? This will also delete all {property.units.length} units.
              This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate()}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Property'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
