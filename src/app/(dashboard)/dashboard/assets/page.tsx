'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Package, Truck, Wrench, Settings, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

interface Asset {
  id: string
  name: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber?: string
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  currentLocation?: string
  currentAssignee?: {
    id: string
    firstName: string
    lastName: string
  }
  purchaseCost?: number
  createdAt: string
  _count: {
    requests: number
    maintenanceRecords: number
  }
}

async function fetchAssets(type?: string, status?: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const params = new URLSearchParams()
  if (type && type !== 'all') params.append('type', type)
  if (status && status !== 'all') params.append('status', status)

  const response = await fetch(`/api/assets?${params.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch assets')
  return response.json()
}

const getAssetTypeIcon = (type: string) => {
  switch (type) {
    case 'VEHICLE': return <Truck className="h-5 w-5" />
    case 'EQUIPMENT': return <Settings className="h-5 w-5" />
    case 'TOOL': return <Wrench className="h-5 w-5" />
    default: return <Package className="h-5 w-5" />
  }
}

const getAssetTypeLabel = (type: string) => {
  switch (type) {
    case 'VEHICLE': return 'Vehicle'
    case 'EQUIPMENT': return 'Equipment'
    case 'TOOL': return 'Tool'
    default: return type
  }
}

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string, text: string, label: string }> = {
    'AVAILABLE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
    'IN_USE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Use' },
    'UNDER_MAINTENANCE': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
    'RETIRED': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Retired' },
    'LOST_DAMAGED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost/Damaged' }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }

  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', filterType, filterStatus],
    queryFn: () => fetchAssets(filterType, filterStatus)
  })

  const filteredAssets = assets.filter((asset: Asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  // Calculate stats
  const availableCount = assets.filter((a: Asset) => a.status === 'AVAILABLE').length
  const inUseCount = assets.filter((a: Asset) => a.status === 'IN_USE').length
  const maintenanceCount = assets.filter((a: Asset) => a.status === 'UNDER_MAINTENANCE').length
  const totalValue = assets.reduce((sum: number, a: Asset) => sum + (a.purchaseCost || 0), 0)

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Asset Management</h1>
            <p className="text-sm text-gray-600">Track and manage company assets</p>
          </div>
        </div>
        <div className="flex space-x-3">
          <Link
            href="/dashboard/assets/requests"
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>View Requests</span>
          </Link>
          <Link
            href="/dashboard/assets/new"
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
          >
            <Plus className="h-4 w-4" />
            <span>Add Asset</span>
          </Link>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Package className="h-8 w-8 text-primary-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{assets.length}</div>
              <div className="text-sm text-gray-500">Total Assets</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-green-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-green-600"></div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{availableCount}</div>
              <div className="text-sm text-gray-500">Available</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <div className="h-8 w-8 rounded-full bg-blue-100 flex items-center justify-center">
              <div className="h-3 w-3 rounded-full bg-blue-600"></div>
            </div>
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{inUseCount}</div>
              <div className="text-sm text-gray-500">In Use</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-yellow-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{maintenanceCount}</div>
              <div className="text-sm text-gray-500">Under Maintenance</div>
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
                placeholder="Search assets..."
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
              <option value="VEHICLE">Vehicles</option>
              <option value="EQUIPMENT">Equipment</option>
              <option value="TOOL">Tools</option>
            </select>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="AVAILABLE">Available</option>
              <option value="IN_USE">In Use</option>
              <option value="UNDER_MAINTENANCE">Under Maintenance</option>
              <option value="RETIRED">Retired</option>
              <option value="LOST_DAMAGED">Lost/Damaged</option>
            </select>
          </div>
        </div>
      </div>

      {/* Assets Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Asset
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Type
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Location
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Assigned To
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredAssets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-500">
                    <Package className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No assets found</p>
                    <p className="text-sm">Get started by adding your first asset</p>
                  </td>
                </tr>
              ) : (
                filteredAssets.map((asset: Asset) => (
                  <tr key={asset.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
                          {getAssetTypeIcon(asset.type)}
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{asset.name}</div>
                          {asset.serialNumber && (
                            <div className="text-sm text-gray-500">SN: {asset.serialNumber}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getAssetTypeLabel(asset.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(asset.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.currentLocation || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {asset.currentAssignee
                        ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}`
                        : '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <Link
                        href={`/dashboard/assets/${asset.id}`}
                        className="text-primary-600 hover:text-primary-900"
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
