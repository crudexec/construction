'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Package, Truck, Wrench, Settings, AlertTriangle, Eye } from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

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
    case 'VEHICLE': return <Truck className="h-3 w-3" />
    case 'EQUIPMENT': return <Settings className="h-3 w-3" />
    case 'TOOL': return <Wrench className="h-3 w-3" />
    default: return <Package className="h-3 w-3" />
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
    'AVAILABLE': { bg: 'bg-green-100', text: 'text-green-700', label: 'Available' },
    'IN_USE': { bg: 'bg-blue-100', text: 'text-blue-700', label: 'In Use' },
    'UNDER_MAINTENANCE': { bg: 'bg-yellow-100', text: 'text-yellow-700', label: 'Maintenance' },
    'RETIRED': { bg: 'bg-gray-100', text: 'text-gray-700', label: 'Retired' },
    'LOST_DAMAGED': { bg: 'bg-red-100', text: 'text-red-700', label: 'Lost/Damaged' }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-700', label: status }

  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

export default function AssetsPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const { format: formatCurrency } = useCurrency()

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
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex justify-between items-center py-1">
        <div className="flex items-center space-x-2">
          <Package className="h-4 w-4 text-gray-500" />
          <h1 className="text-sm font-medium text-gray-900">Assets</h1>
          <span className="text-xs text-gray-500">({assets.length} items)</span>
        </div>
        <div className="flex space-x-2">
          <Link
            href="/dashboard/assets/requests"
            className="bg-white text-gray-700 px-2 py-1 rounded text-xs border hover:bg-gray-50 flex items-center space-x-1"
          >
            <AlertTriangle className="h-3 w-3" />
            <span>Requests</span>
          </Link>
          <Link
            href="/dashboard/assets/new"
            className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 flex items-center space-x-1"
          >
            <Plus className="h-3 w-3" />
            <span>Add</span>
          </Link>
        </div>
      </div>

      {/* Compact Stats Bar */}
      <div className="bg-white border border-gray-200 rounded flex divide-x divide-gray-200">
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <Package className="h-3.5 w-3.5 text-primary-600" />
          <div>
            <div className="text-[10px] text-gray-500">Total</div>
            <div className="text-xs font-semibold text-gray-900">{assets.length}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-green-500"></div>
          <div>
            <div className="text-[10px] text-gray-500">Available</div>
            <div className="text-xs font-semibold text-green-600">{availableCount}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <div className="h-2.5 w-2.5 rounded-full bg-blue-500"></div>
          <div>
            <div className="text-[10px] text-gray-500">In Use</div>
            <div className="text-xs font-semibold text-blue-600">{inUseCount}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <Settings className="h-3.5 w-3.5 text-yellow-600" />
          <div>
            <div className="text-[10px] text-gray-500">Maintenance</div>
            <div className="text-xs font-semibold text-yellow-600">{maintenanceCount}</div>
          </div>
        </div>
        <div className="flex-1 px-3 py-2 flex items-center gap-2">
          <div className="text-[10px] text-gray-500">Value</div>
          <div className="text-xs font-semibold text-gray-900">{formatCurrency(totalValue)}</div>
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="flex items-center gap-2 p-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search assets..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 pr-2 py-1 w-full text-xs border border-gray-200 rounded focus:border-primary-500 focus:outline-none"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Types</option>
            <option value="VEHICLE">Vehicles</option>
            <option value="EQUIPMENT">Equipment</option>
            <option value="TOOL">Tools</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Status</option>
            <option value="AVAILABLE">Available</option>
            <option value="IN_USE">In Use</option>
            <option value="UNDER_MAINTENANCE">Maintenance</option>
            <option value="RETIRED">Retired</option>
            <option value="LOST_DAMAGED">Lost/Damaged</option>
          </select>
        </div>
      </div>

      {/* Compact Table */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Asset</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Type</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Status</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Location</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Assigned To</th>
              <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Cost</th>
              <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredAssets.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-2 py-8 text-center text-gray-500">
                  <Package className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                  <p className="text-xs font-medium">No assets found</p>
                  <p className="text-[10px]">Get started by adding your first asset</p>
                </td>
              </tr>
            ) : (
              filteredAssets.map((asset: Asset, index: number) => (
                <tr key={asset.id} className={`border-b border-gray-100 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-2 py-1.5">
                    <Link href={`/dashboard/assets/${asset.id}`} className="block">
                      <div className="flex items-center gap-2">
                        <div className="h-6 w-6 rounded bg-gray-100 flex items-center justify-center text-gray-600">
                          {getAssetTypeIcon(asset.type)}
                        </div>
                        <div>
                          <div className="text-xs font-medium text-gray-900 truncate max-w-[150px]">{asset.name}</div>
                          {asset.serialNumber && (
                            <div className="text-[10px] text-gray-500">SN: {asset.serialNumber}</div>
                          )}
                        </div>
                      </div>
                    </Link>
                  </td>
                  <td className="px-2 py-1.5">
                    <span className="inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded bg-blue-100 text-blue-700">
                      {getAssetTypeLabel(asset.type)}
                    </span>
                  </td>
                  <td className="px-2 py-1.5">
                    {getStatusBadge(asset.status)}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-600 truncate max-w-[100px]">
                    {asset.currentLocation || '-'}
                  </td>
                  <td className="px-2 py-1.5 text-xs text-gray-600">
                    {asset.currentAssignee
                      ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}`
                      : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right text-xs text-gray-900">
                    {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '-'}
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <Link
                      href={`/dashboard/assets/${asset.id}`}
                      className="p-0.5 text-primary-600 hover:text-primary-800 inline-flex"
                    >
                      <Eye className="h-3 w-3" />
                    </Link>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
