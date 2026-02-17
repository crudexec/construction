'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Building2,
  MapPin,
  Home,
  Users,
  DollarSign,
  TrendingUp,
  MoreVertical,
  Eye,
  Edit,
  Trash2
} from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

interface Property {
  id: string
  name: string
  type: string
  status: string
  address: string
  city: string
  state: string
  zipCode: string
  country: string
  totalUnits: number
  occupiedUnits: number
  vacantUnits: number
  occupancyRate: number
  totalMonthlyRent: number
  potentialMonthlyRent: number
  yearBuilt?: number
  totalSqft?: number
  manager?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  sourceProject?: {
    id: string
    title: string
  }
  createdAt: string
}

async function fetchProperties() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/properties', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch properties')
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

export function PropertyList() {
  const { format } = useCurrency()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid')

  const { data: properties = [], isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties
  })

  const filteredProperties = properties.filter((property: Property) => {
    const matchesSearch = property.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         property.city.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || property.type === filterType
    const matchesStatus = filterStatus === 'all' || property.status === filterStatus

    return matchesSearch && matchesType && matchesStatus
  })

  // Calculate portfolio stats
  const portfolioStats = {
    totalProperties: properties.length,
    totalUnits: properties.reduce((sum: number, p: Property) => sum + p.totalUnits, 0),
    occupiedUnits: properties.reduce((sum: number, p: Property) => sum + p.occupiedUnits, 0),
    totalRent: properties.reduce((sum: number, p: Property) => sum + p.totalMonthlyRent, 0),
    avgOccupancy: properties.length > 0
      ? properties.reduce((sum: number, p: Property) => sum + p.occupancyRate, 0) / properties.length
      : 0
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Portfolio Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Properties</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.totalProperties}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Total Units</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.totalUnits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Occupied</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.occupiedUnits}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <TrendingUp className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Avg Occupancy</p>
              <p className="text-2xl font-bold text-gray-900">{portfolioStats.avgOccupancy.toFixed(1)}%</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="text-xl font-bold text-gray-900">{format(portfolioStats.totalRent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search properties..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Types</option>
              <option value="RESIDENTIAL_SINGLE">Single Family</option>
              <option value="RESIDENTIAL_MULTI">Multi Family</option>
              <option value="APARTMENT_COMPLEX">Apartment Complex</option>
              <option value="COMMERCIAL_OFFICE">Office</option>
              <option value="COMMERCIAL_RETAIL">Retail</option>
              <option value="COMMERCIAL_INDUSTRIAL">Industrial</option>
              <option value="MIXED_USE">Mixed Use</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="UNDER_CONSTRUCTION">Under Construction</option>
              <option value="RENOVATION">Renovation</option>
              <option value="INACTIVE">Inactive</option>
            </select>
            <div className="flex border border-gray-300 rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-2 ${viewMode === 'grid' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`px-3 py-2 ${viewMode === 'table' ? 'bg-primary-100 text-primary-700' : 'bg-white text-gray-600'}`}
              >
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Properties Grid/Table */}
      {filteredProperties.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Building2 className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No properties found</p>
          <p className="text-sm text-gray-500">Get started by adding your first property</p>
          <Link
            href="/dashboard/properties/new"
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            Add Property
          </Link>
        </div>
      ) : viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredProperties.map((property: Property) => (
            <Link
              key={property.id}
              href={`/dashboard/properties/${property.id}`}
              className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
            >
              <div className="p-5">
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{property.name}</h3>
                    <div className="flex items-center text-sm text-gray-500 mt-1">
                      <MapPin className="h-4 w-4 mr-1" />
                      {property.city}, {property.state}
                    </div>
                  </div>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property.status)}`}>
                    {property.status.replace('_', ' ')}
                  </span>
                </div>

                <div className="flex items-center text-sm text-gray-600 mb-4">
                  <span className="bg-gray-100 px-2 py-1 rounded text-xs">
                    {getPropertyTypeLabel(property.type)}
                  </span>
                  {property.yearBuilt && (
                    <span className="ml-2 text-gray-500">Built {property.yearBuilt}</span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-3 mb-4">
                  <div className="text-center p-2 bg-gray-50 rounded">
                    <p className="text-lg font-bold text-gray-900">{property.totalUnits}</p>
                    <p className="text-xs text-gray-500">Units</p>
                  </div>
                  <div className="text-center p-2 bg-green-50 rounded">
                    <p className="text-lg font-bold text-green-700">{property.occupiedUnits}</p>
                    <p className="text-xs text-gray-500">Occupied</p>
                  </div>
                  <div className="text-center p-2 bg-red-50 rounded">
                    <p className="text-lg font-bold text-red-700">{property.vacantUnits}</p>
                    <p className="text-xs text-gray-500">Vacant</p>
                  </div>
                </div>

                <div className="flex justify-between items-center pt-3 border-t">
                  <div>
                    <p className="text-xs text-gray-500">Occupancy</p>
                    <div className="flex items-center">
                      <div className="w-24 h-2 bg-gray-200 rounded-full mr-2">
                        <div
                          className="h-2 bg-green-500 rounded-full"
                          style={{ width: `${property.occupancyRate}%` }}
                        />
                      </div>
                      <span className="text-sm font-medium">{property.occupancyRate}%</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500">Monthly Rent</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {format(property.totalMonthlyRent)}
                    </p>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Units
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Occupancy
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monthly Rent
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredProperties.map((property: Property) => (
                  <tr key={property.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{property.name}</div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <MapPin className="h-3 w-3 mr-1" />
                          {property.address}, {property.city}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getPropertyTypeLabel(property.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      <div className="flex items-center space-x-2">
                        <span className="font-medium">{property.totalUnits}</span>
                        <span className="text-gray-400">|</span>
                        <span className="text-green-600">{property.occupiedUnits} occupied</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-16 h-2 bg-gray-200 rounded-full mr-2">
                          <div
                            className="h-2 bg-green-500 rounded-full"
                            style={{ width: `${property.occupancyRate}%` }}
                          />
                        </div>
                        <span className="text-sm text-gray-900">{property.occupancyRate}%</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {format(property.totalMonthlyRent)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(property.status)}`}>
                        {property.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/properties/${property.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
