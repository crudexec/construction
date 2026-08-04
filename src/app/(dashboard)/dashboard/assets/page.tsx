'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Plus, Search, Package, Truck, Wrench, Settings, AlertTriangle, X, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrency } from '@/hooks/useCurrency'

interface Asset {
  id: string
  name: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber?: string
  make?: string | null
  model?: string | null
  year?: number | null
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  statusDefinition?: {
    id: string
    name: string
    baseStatus: Asset['status']
    color?: string | null
  } | null
  currentLocation?: string
  currentAssignee?: {
    id: string
    firstName: string
    lastName: string
  }
  purchaseCost?: number
  createdAt: string
  attachments?: { id: string; url: string }[]
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

const getStatusBadge = (status: string, customStatus?: Asset['statusDefinition']) => {
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
      {customStatus?.name || config.label}
    </span>
  )
}

export default function AssetsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [sortField, setSortField] = useState<string>('name')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const { format: formatCurrency } = useCurrency()

  const { data: assets = [], isLoading } = useQuery({
    queryKey: ['assets', filterType, filterStatus],
    queryFn: () => fetchAssets(filterType, filterStatus)
  })

  const filteredAssets = assets.filter((asset: Asset) => {
    const matchesSearch = asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (asset.serialNumber?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (asset.make?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (asset.model?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (asset.currentLocation?.toLowerCase().includes(searchTerm.toLowerCase()))
    return matchesSearch
  })

  const sortedAssets = [...filteredAssets].sort((a: Asset, b: Asset) => {
    let aVal: string | number = ''
    let bVal: string | number = ''

    switch (sortField) {
      case 'name':
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
        break
      case 'makeModel':
        aVal = [a.make, a.model, a.year].filter(Boolean).join(' ').toLowerCase()
        bVal = [b.make, b.model, b.year].filter(Boolean).join(' ').toLowerCase()
        break
      case 'type':
        aVal = a.type
        bVal = b.type
        break
      case 'status':
        aVal = a.statusDefinition?.name || a.status
        bVal = b.statusDefinition?.name || b.status
        break
      case 'location':
        aVal = a.currentLocation?.toLowerCase() || 'zzz'
        bVal = b.currentLocation?.toLowerCase() || 'zzz'
        break
      case 'assignee':
        aVal = a.currentAssignee ? `${a.currentAssignee.firstName} ${a.currentAssignee.lastName}`.toLowerCase() : 'zzz'
        bVal = b.currentAssignee ? `${b.currentAssignee.firstName} ${b.currentAssignee.lastName}`.toLowerCase() : 'zzz'
        break
      case 'cost':
        aVal = a.purchaseCost || 0
        bVal = b.purchaseCost || 0
        break
      default:
        aVal = a.name.toLowerCase()
        bVal = b.name.toLowerCase()
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const activeFilterCount = [filterType !== 'all', filterStatus !== 'all'].filter(Boolean).length

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const handleSelectAll = () => {
    if (selectedRows.size === sortedAssets.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(sortedAssets.map((asset: Asset) => asset.id)))
    }
  }

  const handleRowSelect = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRows(next)
  }

  const clearAllFilters = () => {
    setFilterType('all')
    setFilterStatus('all')
  }

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
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
            <p className="text-sm text-gray-600">Manage equipment, vehicles, tools, and service history</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/assets/requests"
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Requests</span>
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

      <div className="bg-white rounded-lg shadow border p-6">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2 px-1">
            <div className="flex items-center gap-2">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-7 pr-2 py-1 w-40 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Types</option>
                <option value="VEHICLE">Vehicles</option>
                <option value="EQUIPMENT">Equipment</option>
                <option value="TOOL">Tools</option>
              </select>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
              >
                <option value="all">All Status</option>
                <option value="AVAILABLE">Available</option>
                <option value="IN_USE">In Use</option>
                <option value="UNDER_MAINTENANCE">Maintenance</option>
                <option value="RETIRED">Retired</option>
                <option value="LOST_DAMAGED">Lost/Damaged</option>
              </select>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearAllFilters}
                  className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-0.5"
                >
                  <X className="h-3 w-3" />
                  Clear
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {selectedRows.size > 0 && (
                <span className="text-primary-600 font-medium">{selectedRows.size} selected</span>
              )}
              <span>{sortedAssets.length} assets</span>
              <span className="hidden md:inline text-gray-300">|</span>
              <span className="hidden md:inline">{availableCount} available</span>
              <span className="hidden md:inline">{inUseCount} in use</span>
              <span className="hidden md:inline">{maintenanceCount} maintenance</span>
              <span className="hidden lg:inline">{formatCurrency(totalValue)}</span>
            </div>
          </div>

          <div className="border border-gray-300 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="w-8 px-1 py-1.5 border-r border-gray-200">
                      <input
                        type="checkbox"
                        checked={selectedRows.size === sortedAssets.length && sortedAssets.length > 0}
                        onChange={handleSelectAll}
                        className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                    <th onClick={() => handleSort('name')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[190px]">
                      <div className="flex items-center gap-1">Asset <SortIcon field="name" /></div>
                    </th>
                    <th onClick={() => handleSort('makeModel')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]">
                      <div className="flex items-center gap-1">Make / Model <SortIcon field="makeModel" /></div>
                    </th>
                    <th onClick={() => handleSort('type')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-24">
                      <div className="flex items-center gap-1">Type <SortIcon field="type" /></div>
                    </th>
                    <th onClick={() => handleSort('status')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-28">
                      <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                    </th>
                    <th onClick={() => handleSort('location')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]">
                      <div className="flex items-center gap-1">Location <SortIcon field="location" /></div>
                    </th>
                    <th onClick={() => handleSort('assignee')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]">
                      <div className="flex items-center gap-1">Assigned <SortIcon field="assignee" /></div>
                    </th>
                    <th onClick={() => handleSort('cost')} className="px-2 py-1.5 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-24">
                      <div className="flex items-center justify-end gap-1">Cost <SortIcon field="cost" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssets.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                        <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-medium">No assets found</p>
                        <p className="text-[10px]">{activeFilterCount > 0 || searchTerm ? 'Try adjusting filters' : 'Add your first asset'}</p>
                      </td>
                    </tr>
                  ) : (
                    sortedAssets.map((asset: Asset, index: number) => (
                      <tr
                        key={asset.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer ${
                          selectedRows.has(asset.id) ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => router.push(`/dashboard/assets/${asset.id}`)}
                      >
                        <td className="px-1 py-1 border-r border-gray-200 text-center" onClick={(event) => handleRowSelect(asset.id, event)}>
                          <input
                            type="checkbox"
                            checked={selectedRows.has(asset.id)}
                            onChange={() => {}}
                            className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">{index + 1}</td>
                        <td className="px-2 py-1 border-r border-gray-200">
                          <div className="flex items-center gap-1.5">
                            <div className="w-5 h-5 rounded bg-gray-100 flex items-center justify-center text-gray-500 flex-shrink-0">
                              {getAssetTypeIcon(asset.type)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-gray-900 truncate block max-w-[170px]">{asset.name}</span>
                              {asset.serialNumber ? <span className="text-[10px] text-gray-500">SN: {asset.serialNumber}</span> : null}
                            </div>
                          </div>
                        </td>
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-700 truncate">
                          {[asset.make, asset.model, asset.year].filter(Boolean).join(' ') || <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-600">{getAssetTypeLabel(asset.type)}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{getStatusBadge(asset.status, asset.statusDefinition)}</td>
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-600 truncate">{asset.currentLocation || <span className="text-gray-400">-</span>}</td>
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-600">
                          {asset.currentAssignee ? `${asset.currentAssignee.firstName} ${asset.currentAssignee.lastName}` : <span className="text-gray-400">-</span>}
                        </td>
                        <td className="px-2 py-1 text-right text-gray-700">{asset.purchaseCost ? formatCurrency(asset.purchaseCost) : <span className="text-gray-400">-</span>}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between px-1 text-[10px] text-gray-500">
            <span>Showing {sortedAssets.length} of {assets.length} assets</span>
            <span>Click row to view details | Sort by clicking column headers</span>
          </div>
        </div>
      </div>
    </div>
  )
}
