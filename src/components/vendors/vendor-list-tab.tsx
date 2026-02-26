'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Search, Truck, Star, Users, Tag, X, Settings2, Columns3, Filter, ChevronDown, ChevronUp } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

interface VendorContact {
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
}

interface ServiceTag {
  id: string
  name: string
  color: string
  category?: string
}

interface VendorCategory {
  id: string
  name: string
  color: string
  csiDivision?: string
}

interface VendorProject {
  id: string
  title: string
  status: string
}

interface Vendor {
  id: string
  name: string
  companyName: string
  email?: string
  phone?: string
  type: 'SUPPLY_AND_INSTALLATION' | 'SUPPLY' | 'INSTALLATION'
  category?: VendorCategory
  isActive: boolean
  contractStartDate?: string
  contractEndDate?: string
  averageRating?: number
  totalProjects?: number
  projects?: VendorProject[]
  createdAt: string
  primaryContact?: VendorContact
  tags?: ServiceTag[]
}

interface VendorTagOption {
  id: string
  name: string
  color: string
  category?: string
  vendorCount: number
}

interface VendorCategoryOption {
  id: string
  name: string
  color: string
  csiDivision?: string
  vendorCount: number
}

type DensityMode = 'compact' | 'normal' | 'comfortable'

interface ColumnConfig {
  id: string
  label: string
  visible: boolean
}

const DEFAULT_COLUMNS: ColumnConfig[] = [
  { id: 'company', label: 'Company', visible: true },
  { id: 'category', label: 'Category', visible: true },
  { id: 'type', label: 'Type', visible: true },
  { id: 'services', label: 'Services', visible: true },
  { id: 'contact', label: 'Primary Contact', visible: true },
  { id: 'rating', label: 'Rating', visible: true },
  { id: 'projects', label: 'Projects', visible: true },
  { id: 'status', label: 'Status', visible: true },
]

const DENSITY_CLASSES: Record<DensityMode, { row: string; cell: string }> = {
  compact: { row: '', cell: 'px-4 py-2' },
  normal: { row: '', cell: 'px-6 py-4' },
  comfortable: { row: '', cell: 'px-6 py-5' },
}

async function fetchVendors(tagIds: string[] = [], categoryId?: string, minRating?: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const params = new URLSearchParams()
  if (tagIds.length > 0) params.set('tagIds', tagIds.join(','))
  if (categoryId) params.set('categoryId', categoryId)
  if (minRating && minRating !== 'all') params.set('minRating', minRating)

  const url = params.toString() ? `/api/vendors?${params}` : '/api/vendors'

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch vendors')
  return response.json()
}

async function fetchCategories() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-categories', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function fetchTags() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendor-tags', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tags')
  return response.json()
}

const getVendorTypeLabel = (type: string) => {
  switch (type) {
    case 'SUPPLY_AND_INSTALLATION': return 'Supply & Install'
    case 'SUPPLY': return 'Supply Only'
    case 'INSTALLATION': return 'Install Only'
    default: return type
  }
}

export function VendorListTab() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterMinRating, setFilterMinRating] = useState<string>('all')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [showSettings, setShowSettings] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [density, setDensity] = useState<DensityMode>('normal')
  const [columns, setColumns] = useState<ColumnConfig[]>(DEFAULT_COLUMNS)

  // Load settings from localStorage
  useEffect(() => {
    const savedDensity = localStorage.getItem('vendor-list-density')
    const savedColumns = localStorage.getItem('vendor-list-columns')
    if (savedDensity) setDensity(savedDensity as DensityMode)
    if (savedColumns) {
      try {
        setColumns(JSON.parse(savedColumns))
      } catch (e) {
        // Use defaults if parse fails
      }
    }
  }, [])

  // Save settings to localStorage
  const saveDensity = (mode: DensityMode) => {
    setDensity(mode)
    localStorage.setItem('vendor-list-density', mode)
  }

  const toggleColumn = (columnId: string) => {
    const newColumns = columns.map(col =>
      col.id === columnId ? { ...col, visible: !col.visible } : col
    )
    setColumns(newColumns)
    localStorage.setItem('vendor-list-columns', JSON.stringify(newColumns))
  }

  const isColumnVisible = (columnId: string) =>
    columns.find(c => c.id === columnId)?.visible ?? true

  const cellClass = DENSITY_CLASSES[density].cell

  // Fetch available tags
  const { data: availableTags = [] } = useQuery<VendorTagOption[]>({
    queryKey: ['vendor-tags'],
    queryFn: fetchTags
  })

  // Fetch available categories
  const { data: availableCategories = [] } = useQuery<VendorCategoryOption[]>({
    queryKey: ['vendor-categories'],
    queryFn: fetchCategories
  })

  // Fetch vendors (with tag, category, and rating filters applied server-side)
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', selectedTagIds, filterCategory, filterMinRating],
    queryFn: () => fetchVendors(
      selectedTagIds,
      filterCategory !== 'all' ? filterCategory : undefined,
      filterMinRating !== 'all' ? filterMinRating : undefined
    )
  })

  // Client-side filtering for search, type, and status
  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || vendor.type === filterType
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && vendor.isActive) ||
                         (filterStatus === 'inactive' && !vendor.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const clearTagFilters = () => {
    setSelectedTagIds([])
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  // Count active filters
  const activeFilterCount = [
    filterCategory !== 'all',
    filterType !== 'all',
    filterStatus !== 'all',
    filterMinRating !== 'all',
    selectedTagIds.length > 0
  ].filter(Boolean).length

  const clearAllFilters = () => {
    setFilterCategory('all')
    setFilterType('all')
    setFilterStatus('all')
    setFilterMinRating('all')
    setSelectedTagIds([])
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col gap-3">
          {/* Search and Filter Toggle Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              {activeFilterCount > 0 && (
                <span className="bg-primary-600 text-white text-xs font-medium px-2 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
              {showFilters ? (
                <ChevronUp className="h-4 w-4" />
              ) : (
                <ChevronDown className="h-4 w-4" />
              )}
            </button>
          </div>

          {/* Collapsible Filters Section */}
          {showFilters && (
            <div className="border-t pt-3 space-y-4">
              {/* Dropdown Filters */}
              <div className="flex flex-wrap gap-3">
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.csiDivision ? `(${cat.csiDivision})` : ''}
                    </option>
                  ))}
                </select>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">All Types</option>
                  <option value="SUPPLY_AND_INSTALLATION">Supply & Installation</option>
                  <option value="SUPPLY">Supply Only</option>
                  <option value="INSTALLATION">Installation Only</option>
                </select>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
                <select
                  value={filterMinRating}
                  onChange={(e) => setFilterMinRating(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 text-sm"
                >
                  <option value="all">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
                {activeFilterCount > 0 && (
                  <button
                    onClick={clearAllFilters}
                    className="flex items-center gap-1 px-3 py-2 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
                  >
                    <X className="h-4 w-4" />
                    Clear all
                  </button>
                )}
              </div>

              {/* Service Tags Filter */}
              {availableTags.length > 0 && (
                <div className="border-t pt-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium text-gray-700">Filter by Services:</span>
                    {selectedTagIds.length > 0 && (
                      <button
                        onClick={clearTagFilters}
                        className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1"
                      >
                        <X className="h-3 w-3" />
                        Clear
                      </button>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map((tag) => (
                      <button
                        key={tag.id}
                        onClick={() => handleTagToggle(tag.id)}
                        className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                          selectedTagIds.includes(tag.id)
                            ? 'ring-2 ring-offset-1 ring-primary-500'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: `${tag.color}20`,
                          color: tag.color,
                          borderColor: tag.color
                        }}
                      >
                        {tag.name}
                        <span className="ml-1 text-gray-500">({tag.vendorCount})</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Active Filters Summary (when collapsed) */}
          {!showFilters && activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <span className="text-gray-500">Active filters:</span>
              {filterCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {availableCategories.find(c => c.id === filterCategory)?.name || 'Category'}
                  <button onClick={() => setFilterCategory('all')} className="hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterType !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {getVendorTypeLabel(filterType)}
                  <button onClick={() => setFilterType('all')} className="hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterStatus !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs capitalize">
                  {filterStatus}
                  <button onClick={() => setFilterStatus('all')} className="hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {filterMinRating !== 'all' && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {filterMinRating}+ Stars
                  <button onClick={() => setFilterMinRating('all')} className="hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              {selectedTagIds.length > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-1 bg-gray-100 rounded-full text-xs">
                  {selectedTagIds.length} service{selectedTagIds.length > 1 ? 's' : ''}
                  <button onClick={clearTagFilters} className="hover:text-gray-700">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              )}
              <button
                onClick={clearAllFilters}
                className="text-xs text-gray-500 hover:text-gray-700 underline"
              >
                Clear all
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Table Settings */}
      <div className="flex justify-end">
        <div className="relative">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="flex items-center gap-2 px-3 py-1.5 text-sm text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-md transition-colors"
          >
            <Settings2 className="h-4 w-4" />
            Table Settings
          </button>

          {showSettings && (
            <div className="absolute right-0 top-full mt-1 w-64 bg-white rounded-lg shadow-lg border p-4 z-10">
              {/* Density Control */}
              <div className="mb-4">
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                  Density
                </label>
                <div className="flex gap-1 mt-2">
                  {(['compact', 'normal', 'comfortable'] as DensityMode[]).map((mode) => (
                    <button
                      key={mode}
                      onClick={() => saveDensity(mode)}
                      className={`flex-1 px-2 py-1 text-xs rounded capitalize ${
                        density === mode
                          ? 'bg-primary-600 text-white'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {mode}
                    </button>
                  ))}
                </div>
              </div>

              {/* Column Visibility */}
              <div>
                <label className="text-xs font-medium text-gray-700 uppercase tracking-wide flex items-center gap-1">
                  <Columns3 className="h-3 w-3" />
                  Columns
                </label>
                <div className="mt-2 space-y-1">
                  {columns.map((col) => (
                    <label
                      key={col.id}
                      className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer hover:bg-gray-50 px-1 py-0.5 rounded"
                    >
                      <input
                        type="checkbox"
                        checked={col.visible}
                        onChange={() => toggleColumn(col.id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                      {col.label}
                    </label>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Vendors Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {isColumnVisible('company') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Company
                  </th>
                )}
                {isColumnVisible('category') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                )}
                {isColumnVisible('type') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                )}
                {isColumnVisible('services') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Services
                  </th>
                )}
                {isColumnVisible('contact') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Primary Contact
                  </th>
                )}
                {isColumnVisible('rating') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rating
                  </th>
                )}
                {isColumnVisible('projects') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Projects
                  </th>
                )}
                {isColumnVisible('status') && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredVendors.length === 0 ? (
                <tr>
                  <td colSpan={columns.filter(c => c.visible).length} className="px-6 py-12 text-center text-gray-500">
                    <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                    <p className="text-lg font-medium">No vendors found</p>
                    <p className="text-sm">
                      {selectedTagIds.length > 0
                        ? 'Try removing some filters'
                        : 'Get started by adding your first vendor'
                      }
                    </p>
                  </td>
                </tr>
              ) : (
                filteredVendors.map((vendor: Vendor) => (
                  <tr
                    key={vendor.id}
                    className="hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                  >
                    {isColumnVisible('company') && (
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <div className="text-sm font-medium text-gray-900">{vendor.companyName}</div>
                      </td>
                    )}
                    {isColumnVisible('category') && (
                      <td className={`${cellClass} whitespace-nowrap`}>
                        {vendor.category ? (
                          <span
                            className="inline-flex px-2 py-1 text-xs font-semibold rounded-full"
                            style={{
                              backgroundColor: `${vendor.category.color}20`,
                              color: vendor.category.color
                            }}
                          >
                            {vendor.category.name}
                            {vendor.category.csiDivision && (
                              <span className="ml-1 opacity-70">({vendor.category.csiDivision})</span>
                            )}
                          </span>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('type') && (
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                          {getVendorTypeLabel(vendor.type)}
                        </span>
                      </td>
                    )}
                    {isColumnVisible('services') && (
                      <td className={cellClass}>
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {vendor.tags && vendor.tags.length > 0 ? (
                            vendor.tags.slice(0, 3).map((tag) => (
                              <span
                                key={tag.id}
                                className="inline-flex px-2 py-0.5 text-xs rounded-full"
                                style={{
                                  backgroundColor: `${tag.color}20`,
                                  color: tag.color
                                }}
                              >
                                {tag.name}
                              </span>
                            ))
                          ) : (
                            <span className="text-xs text-gray-400">-</span>
                          )}
                          {vendor.tags && vendor.tags.length > 3 && (
                            <span className="text-xs text-gray-500">
                              +{vendor.tags.length - 3}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    {isColumnVisible('contact') && (
                      <td className={`${cellClass} whitespace-nowrap text-sm text-gray-500`}>
                        <div>
                          {vendor.primaryContact ? (
                            <>
                              <div className="font-medium text-gray-900">
                                {vendor.primaryContact.firstName} {vendor.primaryContact.lastName}
                              </div>
                              {density !== 'compact' && vendor.primaryContact.phone && (
                                <div className="text-xs">{vendor.primaryContact.phone}</div>
                              )}
                            </>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </div>
                      </td>
                    )}
                    {isColumnVisible('rating') && (
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <div className="flex items-center">
                          <Star className="h-4 w-4 text-yellow-400 mr-1" />
                          <span className="text-sm text-gray-900">
                            {vendor.averageRating ? vendor.averageRating.toFixed(1) : '-'}
                          </span>
                        </div>
                      </td>
                    )}
                    {isColumnVisible('projects') && (
                      <td className={cellClass} onClick={(e) => e.stopPropagation()}>
                        {vendor.projects && vendor.projects.length > 0 ? (
                          <div className="space-y-1 max-w-xs">
                            {vendor.projects.slice(0, 2).map((project) => (
                              <Link
                                key={project.id}
                                href={`/dashboard/projects/${project.id}`}
                                className="block text-sm text-primary-600 hover:text-primary-700 hover:underline truncate"
                                onClick={(e) => e.stopPropagation()}
                              >
                                {project.title}
                              </Link>
                            ))}
                            {vendor.totalProjects && vendor.totalProjects > 2 && (
                              <Link
                                href={`/dashboard/vendors/${vendor.id}?tab=projects`}
                                className="text-xs text-primary-500 hover:text-primary-700 hover:underline"
                                onClick={(e) => e.stopPropagation()}
                              >
                                +{vendor.totalProjects - 2} more
                              </Link>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                    )}
                    {isColumnVisible('status') && (
                      <td className={`${cellClass} whitespace-nowrap`}>
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          vendor.isActive
                            ? 'bg-green-100 text-green-800'
                            : 'bg-red-100 text-red-800'
                        }`}>
                          {vendor.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                    )}
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
