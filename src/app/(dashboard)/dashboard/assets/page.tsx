'use client'

import { useEffect, useState } from 'react'
import { keepPreviousData, useQuery } from '@tanstack/react-query'
import { Plus, Search, Package, Truck, Wrench, Settings, AlertTriangle, X, ChevronUp, ChevronDown } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useCurrency } from '@/hooks/useCurrency'
import { AssetFilterSelect } from '@/components/assets/asset-filter-select'
import { fetchAssetCategories } from '@/components/assets/asset-category-field'
import { useAuthStore } from '@/store/auth'

import type { AssetListItem as Asset, AssetListResponse } from '@/lib/assets/list'

interface AssetQuery {
  types: string[] | null
  statuses: string[] | null
  categories: string[] | null
  search: string
  sortField: string
  sortDirection: 'asc' | 'desc'
  page: number
  pageSize: number
}

async function fetchAssets(query: AssetQuery, signal: AbortSignal): Promise<AssetListResponse> {
  const params = new URLSearchParams({
    page: String(query.page),
    pageSize: String(query.pageSize),
    sortField: query.sortField,
    sortDirection: query.sortDirection,
  })
  if (query.types !== null) params.set('types', JSON.stringify(query.types))
  params.set('statuses', JSON.stringify(query.statuses ?? STATUS_OPTIONS.map(option => option.value)))
  if (query.categories !== null) params.set('categories', JSON.stringify(query.categories))
  if (query.search) params.set('search', query.search)

  const response = await fetch(`/api/assets?${params}`, { credentials: 'include', signal })
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

const TYPE_OPTIONS = [
  { value: 'VEHICLE', label: 'Vehicles' },
  { value: 'EQUIPMENT', label: 'Equipment' },
  { value: 'TOOL', label: 'Tools' },
]
const STATUS_OPTIONS = [
  { value: 'AVAILABLE', label: 'Available' },
  { value: 'IN_USE', label: 'In Use' },
  { value: 'UNDER_MAINTENANCE', label: 'Maintenance' },
  { value: 'RETIRED', label: 'Retired' },
  { value: 'LOST_DAMAGED', label: 'Lost/Damaged' },
]
const DEFAULT_STATUSES = STATUS_OPTIONS.filter(option => option.value !== 'RETIRED').map(option => option.value)

export default function AssetsPage() {
  const router = useRouter()
  const user = useAuthStore(state => state.user)
  const [searchTerm, setSearchTerm] = useState('')
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string[] | null>(null)
  const [filterStatus, setFilterStatus] = useState<string[] | null>(DEFAULT_STATUSES)
  const [filterCategory, setFilterCategory] = useState<string[] | null>(null)
  const [sortField, setSortField] = useState<string>('equipmentId')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(25)
  const { format: formatCurrency } = useCurrency()

  const query: AssetQuery = { types: filterType, statuses: filterStatus, categories: filterCategory, search, sortField, sortDirection, page, pageSize }
  const { data, isLoading, isFetching, isPlaceholderData, isError, refetch } = useQuery({
    queryKey: ['assets', 'list', query],
    queryFn: ({ signal }) => fetchAssets(query, signal),
    placeholderData: keepPreviousData,
  })
  const searchPending = searchTerm.trim() !== search
  const isUpdating = isFetching || searchPending

  useEffect(() => {
    if (searchTerm.trim() === search) return
    const timer = setTimeout(() => {
      setSearch(searchTerm.trim())
      setPage(1)
      setSelectedRows(new Set())
    }, 300)
    return () => clearTimeout(timer)
  }, [searchTerm, search])

  const { data: categories = [], isError: categoriesError } = useQuery({
    queryKey: ['asset-categories', 'all'],
    queryFn: () => fetchAssetCategories()
  })

  const retiredHidden = filterStatus !== null && !filterStatus.includes('RETIRED')
  const hasCustomFilters = filterType !== null || filterCategory !== null || filterStatus === null ||
    filterStatus.length !== DEFAULT_STATUSES.length || DEFAULT_STATUSES.some(status => !filterStatus.includes(status)) || !!searchTerm
  const paginatedAssets = data?.data ?? []
  const totalAssets = data?.pagination.total ?? 0
  const totalPages = data?.pagination.totalPages ?? 1
  const currentPage = data?.pagination.page ?? 1
  const pageStart = (currentPage - 1) * (data?.pagination.pageSize ?? pageSize)
  const allPageSelected = paginatedAssets.length > 0 && paginatedAssets.every(asset => selectedRows.has(asset.id))
  const somePageSelected = paginatedAssets.some(asset => selectedRows.has(asset.id))

  // The server clamps the page when deletions or refreshed data shrink the list.
  useEffect(() => {
    if (data && !isPlaceholderData && !isUpdating && !isError) setPage(data.pagination.page)
  }, [data, isPlaceholderData, isUpdating, isError])

  const resetResults = () => {
    setPage(1)
    setSelectedRows(new Set())
  }

  const handleSort = (field: string) => {
    setPage(1)
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
    setSelectedRows(previous => {
      const next = new Set(previous)
      paginatedAssets.forEach(asset => {
        if (allPageSelected) next.delete(asset.id)
        else next.add(asset.id)
      })
      return next
    })
  }

  const handleRowSelect = (id: string, event: React.MouseEvent) => {
    event.stopPropagation()
    const next = new Set(selectedRows)
    if (next.has(id)) next.delete(id)
    else next.add(id)
    setSelectedRows(next)
  }

  const clearAllFilters = () => {
    resetResults()
    setFilterType(null)
    setFilterStatus(DEFAULT_STATUSES)
    setFilterCategory(null)
    setSearchTerm('')
    setSearch('')
  }

  const { availableCount = 0, inUseCount = 0, maintenanceCount = 0, totalValue = 0 } = data?.summary ?? {}

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center space-x-3">
          <Package className="h-8 w-8 text-primary-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Assets</h1>
            <p className="text-sm text-gray-600">Manage equipment, vehicles, tools, and service history</p>
            {user?.role === 'ADMIN' && <Link href="/dashboard/assets/import-reviews" className="inline-flex min-h-8 items-center text-xs text-primary-700 underline underline-offset-2">Import reviews</Link>}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href="/dashboard/assets/issues"
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <AlertTriangle className="h-4 w-4" />
            <span>Equipment Issues</span>
          </Link>
          <Link
            href="/dashboard/assets/work-orders"
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <Wrench className="h-4 w-4" />
            <span>Work Orders</span>
          </Link>
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
          <div className="flex flex-wrap items-center justify-between gap-2 px-1">
            <div className="flex w-full flex-col gap-2 sm:w-auto sm:flex-row sm:flex-wrap sm:items-center">
              <div className="relative">
                <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search ID, name..."
                  aria-label="Search assets"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  maxLength={200}
                  className="pl-7 pr-2 py-1 min-h-11 sm:min-h-8 w-full sm:w-40 text-xs border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <AssetFilterSelect
                label="Type" ariaLabel="Filter by asset type" options={TYPE_OPTIONS} selected={filterType}
                onChange={values => { setFilterType(values); resetResults() }}
              />
              <AssetFilterSelect
                label="Category" ariaLabel="Filter by category"
                options={[...categories.map(category => ({ value: category, label: category })), { value: '', label: 'Uncategorized' }]}
                selected={filterCategory}
                onChange={values => { setFilterCategory(values); resetResults() }}
              />
              <AssetFilterSelect
                label="Status" ariaLabel="Filter by status" options={STATUS_OPTIONS} selected={filterStatus}
                onChange={values => { setFilterStatus(values); resetResults() }}
              />
              {hasCustomFilters && (
                <button
                  onClick={clearAllFilters}
                  className="min-h-11 sm:min-h-8 text-xs text-gray-600 hover:text-gray-900 flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500"
                >
                  <X aria-hidden="true" className="h-3 w-3" />
                  Reset filters
                </button>
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-gray-500">
              {selectedRows.size > 0 && (
                <span className="text-primary-600 font-medium">{selectedRows.size} selected</span>
              )}
              <span>{totalAssets} assets</span>
              <span className="hidden md:inline text-gray-300">|</span>
              <span className="hidden md:inline">{availableCount} available</span>
              <span className="hidden md:inline">{inUseCount} in use</span>
              <span className="hidden md:inline">{maintenanceCount} maintenance</span>
              <span className="hidden lg:inline">{formatCurrency(totalValue)}</span>
            </div>
          </div>

          {retiredHidden && <p className="px-1 text-xs text-gray-600">Retired assets hidden. Include them using the Status filter.</p>}
          {categoriesError && <p role="alert" className="text-xs text-red-600">Category filters could not be loaded.</p>}
          {isError && <p role="alert" className="text-sm text-red-600">Could not load assets. <button onClick={() => refetch()} className="underline">Retry</button></p>}

          <div className="border border-gray-300 rounded overflow-hidden">
            <div className="overflow-x-auto">
              <table aria-busy={isUpdating} className="w-full text-xs border-collapse">
                <thead>
                  <tr className="bg-gray-100 border-b border-gray-300">
                    <th className="w-8 px-1 py-1.5 border-r border-gray-200">
                      <input
                        type="checkbox"
                        aria-label="Select all assets on this page"
                        disabled={isUpdating || isError}
                        checked={allPageSelected}
                        ref={input => { if (input) input.indeterminate = somePageSelected && !allPageSelected }}
                        onChange={handleSelectAll}
                        className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </th>
                    <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                    <th onClick={() => handleSort('equipmentId')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[110px]">
                      <div className="flex items-center gap-1">Equipment ID <SortIcon field="equipmentId" /></div>
                    </th>
                    <th onClick={() => handleSort('name')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[190px]">
                      <div className="flex items-center gap-1">Asset <SortIcon field="name" /></div>
                    </th>
                    <th onClick={() => handleSort('makeModel')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]">
                      <div className="flex items-center gap-1">Make / Model <SortIcon field="makeModel" /></div>
                    </th>
                    <th onClick={() => handleSort('type')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-24">
                      <div className="flex items-center gap-1">Type <SortIcon field="type" /></div>
                    </th>
                    <th onClick={() => handleSort('category')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[110px]">
                      <div className="flex items-center gap-1">Category <SortIcon field="category" /></div>
                    </th>
                    <th onClick={() => handleSort('status')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-28">
                      <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                    </th>
                    <th onClick={() => handleSort('location')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]">
                      <div className="flex items-center gap-1">Location <SortIcon field="location" /></div>
                    </th>
                    <th onClick={() => handleSort('assignee')} className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]">
                      <div className="flex items-center gap-1">Assignment <SortIcon field="assignee" /></div>
                    </th>
                    <th onClick={() => handleSort('cost')} className="px-2 py-1.5 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-24">
                      <div className="flex items-center justify-end gap-1">Cost <SortIcon field="cost" /></div>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading || isError ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        {isLoading ? 'Loading assets…' : 'Assets could not be loaded.'}
                      </td>
                    </tr>
                  ) : totalAssets === 0 ? (
                    <tr>
                      <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                        <Package className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                        <p className="font-medium">No assets found</p>
                        <p className="text-[10px]">{hasCustomFilters || retiredHidden ? 'Try adjusting filters' : 'Add your first asset'}</p>
                      </td>
                    </tr>
                  ) : (
                    paginatedAssets.map((asset: Asset, index: number) => (
                      <tr
                        key={asset.id}
                        className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer ${
                          selectedRows.has(asset.id) ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                        }`}
                        onClick={() => { if (!isUpdating) router.push(`/dashboard/assets/${asset.id}`) }}
                      >
                        <td className="px-1 py-1 border-r border-gray-200 text-center" onClick={(event) => { event.stopPropagation(); if (!isUpdating) handleRowSelect(asset.id, event) }}>
                          <input
                            type="checkbox"
                            aria-label={`Select ${asset.equipmentId || asset.name}`}
                            disabled={isUpdating}
                            checked={selectedRows.has(asset.id)}
                            onChange={() => {}}
                            className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                          />
                        </td>
                        <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">{pageStart + index + 1}</td>
                        <td className="px-2 py-1 border-r border-gray-200 font-semibold text-gray-900">{asset.equipmentId || <span className="font-normal text-gray-400">—</span>}</td>
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
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-600">{asset.category || <span className="text-gray-400">—</span>}</td>
                        <td className="px-2 py-1 border-r border-gray-200">{getStatusBadge(asset.status, asset.statusDefinition)}</td>
                        <td className="px-2 py-1 border-r border-gray-200 text-gray-600 truncate">{asset.currentProject?.title || asset.currentYard?.name || asset.currentLocation || <span className="text-gray-400">-</span>}</td>
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

          {!isError && (
            <nav aria-label="Asset pagination" className="flex flex-wrap items-center justify-between gap-3 px-1 pt-2 text-xs text-gray-600">
              <span role="status" className="tabular-nums">
                {isUpdating ? 'Loading assets…' : `Showing ${totalAssets === 0 ? 0 : pageStart + 1}–${pageStart + paginatedAssets.length} of ${totalAssets} assets`}
              </span>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2">
                  Rows per page
                  <select
                    value={pageSize}
                    onChange={event => { setPageSize(Number(event.target.value)); setPage(1) }}
                    className="min-h-9 rounded border border-gray-300 bg-white px-2 focus:ring-2 focus:ring-primary-500"
                  >
                    {[25, 50, 100].map(size => <option key={size} value={size}>{size}</option>)}
                  </select>
                </label>
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setPage(currentPage - 1)}
                    disabled={isUpdating || currentPage === 1}
                    className="min-h-9 rounded border border-gray-300 px-3 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Previous
                  </button>
                  <span className="tabular-nums">Page {currentPage} of {totalPages}</span>
                  <button
                    type="button"
                    onClick={() => setPage(currentPage + 1)}
                    disabled={isUpdating || currentPage === totalPages}
                    className="min-h-9 rounded border border-gray-300 px-3 hover:bg-gray-50 focus-visible:ring-2 focus-visible:ring-primary-500 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    Next
                  </button>
                </div>
              </div>
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}
