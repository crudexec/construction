'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Home,
  Bed,
  Bath,
  Square,
  MoreVertical,
  Edit,
  Trash2,
  User
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

interface Unit {
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
  currentLeaseId?: string
  currentTenantId?: string
  description?: string
}

interface PropertyUnitGridProps {
  propertyId: string
  units: Unit[]
}

const getUnitTypeLabel = (type: string) => {
  switch (type) {
    case 'STUDIO': return 'Studio'
    case 'ONE_BED': return '1 Bed'
    case 'TWO_BED': return '2 Bed'
    case 'THREE_BED': return '3 Bed'
    case 'FOUR_BED_PLUS': return '4+ Bed'
    case 'OFFICE': return 'Office'
    case 'RETAIL': return 'Retail'
    case 'WAREHOUSE': return 'Warehouse'
    default: return type
  }
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'VACANT': return 'bg-green-100 text-green-800 border-green-300'
    case 'OCCUPIED': return 'bg-blue-100 text-blue-800 border-blue-300'
    case 'NOTICE_GIVEN': return 'bg-yellow-100 text-yellow-800 border-yellow-300'
    case 'MAKE_READY': return 'bg-orange-100 text-orange-800 border-orange-300'
    case 'DOWN': return 'bg-red-100 text-red-800 border-red-300'
    case 'MODEL': return 'bg-purple-100 text-purple-800 border-purple-300'
    default: return 'bg-gray-100 text-gray-800 border-gray-300'
  }
}

async function deleteUnit(unitId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/units/${unitId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to delete unit')
  return response.json()
}

export function PropertyUnitGrid({ propertyId, units }: PropertyUnitGridProps) {
  const { format } = useCurrency()
  const queryClient = useQueryClient()
  const [selectedUnit, setSelectedUnit] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null)
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const deleteMutation = useMutation({
    mutationFn: deleteUnit,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['property', propertyId] })
      setShowDeleteConfirm(null)
    }
  })

  const filteredUnits = units.filter(unit => {
    return filterStatus === 'all' || unit.status === filterStatus
  })

  // Group units by status for summary
  const statusCounts = units.reduce((acc, unit) => {
    acc[unit.status] = (acc[unit.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return (
    <div className="space-y-4">
      {/* Status Filter */}
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setFilterStatus('all')}
          className={`px-3 py-1 rounded-full text-sm font-medium ${
            filterStatus === 'all'
              ? 'bg-primary-100 text-primary-800'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
        >
          All ({units.length})
        </button>
        {Object.entries(statusCounts).map(([status, count]) => (
          <button
            key={status}
            onClick={() => setFilterStatus(status)}
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              filterStatus === status
                ? getStatusColor(status)
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            {status.replace('_', ' ')} ({count})
          </button>
        ))}
      </div>

      {/* Units Grid */}
      {filteredUnits.length === 0 ? (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <Home className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-600">No units found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredUnits.map((unit) => (
            <div
              key={unit.id}
              className={`bg-white border-2 rounded-lg p-4 relative ${getStatusColor(unit.status).split(' ')[2]}`}
            >
              {/* Unit Header */}
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h4 className="text-lg font-bold text-gray-900">Unit {unit.unitNumber}</h4>
                  <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(unit.status)}`}>
                    {unit.status.replace('_', ' ')}
                  </span>
                </div>
                <div className="relative">
                  <button
                    onClick={() => setSelectedUnit(selectedUnit === unit.id ? null : unit.id)}
                    className="p-1 hover:bg-gray-100 rounded"
                  >
                    <MoreVertical className="h-4 w-4 text-gray-500" />
                  </button>
                  {selectedUnit === unit.id && (
                    <div className="absolute right-0 mt-1 w-32 bg-white border rounded-md shadow-lg z-10">
                      <button
                        onClick={() => {
                          // TODO: Open edit modal
                          setSelectedUnit(null)
                        }}
                        className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50 flex items-center"
                      >
                        <Edit className="h-4 w-4 mr-2" />
                        Edit
                      </button>
                      <button
                        onClick={() => {
                          setShowDeleteConfirm(unit.id)
                          setSelectedUnit(null)
                        }}
                        className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center"
                      >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Unit Type */}
              <div className="mb-3">
                <span className="text-sm text-gray-600">{getUnitTypeLabel(unit.type)}</span>
              </div>

              {/* Unit Specs */}
              <div className="grid grid-cols-3 gap-2 mb-3 text-sm">
                {unit.bedrooms !== undefined && (
                  <div className="flex items-center text-gray-600">
                    <Bed className="h-4 w-4 mr-1" />
                    {unit.bedrooms}
                  </div>
                )}
                {unit.bathrooms !== undefined && (
                  <div className="flex items-center text-gray-600">
                    <Bath className="h-4 w-4 mr-1" />
                    {unit.bathrooms}
                  </div>
                )}
                {unit.sqft !== undefined && (
                  <div className="flex items-center text-gray-600">
                    <Square className="h-4 w-4 mr-1" />
                    {unit.sqft}
                  </div>
                )}
              </div>

              {/* Rent */}
              <div className="pt-3 border-t">
                <div className="flex justify-between items-center">
                  <div>
                    <p className="text-xs text-gray-500">
                      {unit.status === 'OCCUPIED' ? 'Current Rent' : 'Market Rent'}
                    </p>
                    <p className="text-sm font-semibold text-gray-900">
                      {format(unit.status === 'OCCUPIED' ? (unit.currentRent || 0) : (unit.marketRent || 0))}
                      <span className="text-xs text-gray-500 font-normal">/mo</span>
                    </p>
                  </div>
                  {unit.floor && (
                    <div className="text-right">
                      <p className="text-xs text-gray-500">Floor</p>
                      <p className="text-sm font-medium text-gray-700">{unit.floor}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Occupied Indicator */}
              {unit.status === 'OCCUPIED' && (
                <div className="mt-2 pt-2 border-t flex items-center text-sm text-blue-600">
                  <User className="h-4 w-4 mr-1" />
                  Tenant Occupied
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete Unit</h3>
            <p className="text-gray-600 mb-4">
              Are you sure you want to delete this unit? This action cannot be undone.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={() => deleteMutation.mutate(showDeleteConfirm)}
                disabled={deleteMutation.isPending}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50"
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Unit'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
