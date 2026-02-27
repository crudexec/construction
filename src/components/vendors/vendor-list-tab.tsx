'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Truck,
  Star,
  Tag,
  X,
  Filter,
  Phone,
  Mail,
  FolderOpen,
  Eye,
  Edit,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
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

const typeColors: Record<string, string> = {
  'SUPPLY_AND_INSTALLATION': 'bg-purple-100 text-purple-700',
  'SUPPLY': 'bg-blue-100 text-blue-700',
  'INSTALLATION': 'bg-orange-100 text-orange-700'
}

export function VendorListTab() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterCategory, setFilterCategory] = useState<string>('all')
  const [filterMinRating, setFilterMinRating] = useState<string>('all')
  const [selectedTagIds, setSelectedTagIds] = useState<string[]>([])
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<string>('companyName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

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

  // Fetch vendors
  const { data: vendors = [], isLoading } = useQuery({
    queryKey: ['vendors', selectedTagIds, filterCategory, filterMinRating],
    queryFn: () => fetchVendors(
      selectedTagIds,
      filterCategory !== 'all' ? filterCategory : undefined,
      filterMinRating !== 'all' ? filterMinRating : undefined
    )
  })

  // Client-side filtering
  const filteredVendors = vendors.filter((vendor: Vendor) => {
    const matchesSearch = vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesType = filterType === 'all' || vendor.type === filterType
    const matchesStatus = filterStatus === 'all' ||
                         (filterStatus === 'active' && vendor.isActive) ||
                         (filterStatus === 'inactive' && !vendor.isActive)

    return matchesSearch && matchesType && matchesStatus
  })

  // Sorting
  const sortedVendors = [...filteredVendors].sort((a: Vendor, b: Vendor) => {
    let aVal: any, bVal: any

    switch (sortField) {
      case 'companyName':
        aVal = a.companyName.toLowerCase()
        bVal = b.companyName.toLowerCase()
        break
      case 'category':
        aVal = a.category?.name?.toLowerCase() || 'zzz'
        bVal = b.category?.name?.toLowerCase() || 'zzz'
        break
      case 'type':
        aVal = a.type
        bVal = b.type
        break
      case 'rating':
        aVal = a.averageRating || 0
        bVal = b.averageRating || 0
        break
      case 'projects':
        aVal = a.totalProjects || 0
        bVal = b.totalProjects || 0
        break
      case 'status':
        aVal = a.isActive ? 1 : 0
        bVal = b.isActive ? 1 : 0
        break
      default:
        aVal = a.companyName.toLowerCase()
        bVal = b.companyName.toLowerCase()
    }

    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    return 0
  })

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const SortIcon = ({ field }: { field: string }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 text-gray-300" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 text-primary-600" />
      : <ChevronDown className="h-3 w-3 text-primary-600" />
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
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

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <h3 className="text-lg font-medium text-gray-900">Vendors</h3>

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search vendors..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 w-48 text-sm border border-gray-300 rounded-md focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>

            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-md border transition-colors ${
                showFilters || activeFilterCount > 0
                  ? 'bg-primary-50 border-primary-300 text-primary-700'
                  : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
              }`}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="bg-primary-600 text-white text-xs font-medium px-1.5 py-0.5 rounded-full">
                  {activeFilterCount}
                </span>
              )}
            </button>

            {/* Results count */}
            <span className="text-sm text-gray-500">
              {sortedVendors.length} vendor{sortedVendors.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>

        {/* Expanded Filters Panel - All Filters Visible */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-gray-200 space-y-4">
            {/* Row 1: Dropdown Filters */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Categories</option>
                  {availableCategories.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} {cat.csiDivision ? `(${cat.csiDivision})` : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Types</option>
                  <option value="SUPPLY_AND_INSTALLATION">Supply & Install</option>
                  <option value="SUPPLY">Supply Only</option>
                  <option value="INSTALLATION">Install Only</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Rating</label>
                <select
                  value={filterMinRating}
                  onChange={(e) => setFilterMinRating(e.target.value)}
                  className="w-full text-sm border border-gray-300 rounded-md px-2 py-1.5 focus:ring-1 focus:ring-primary-500"
                >
                  <option value="all">Any Rating</option>
                  <option value="4">4+ Stars</option>
                  <option value="3">3+ Stars</option>
                  <option value="2">2+ Stars</option>
                  <option value="1">1+ Stars</option>
                </select>
              </div>
            </div>

            {/* Row 2: All Service Tags */}
            {availableTags.length > 0 && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-2">Service Tags</label>
                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleTagToggle(tag.id)}
                      className={`text-xs px-2.5 py-1 rounded-full border transition-colors ${
                        selectedTagIds.includes(tag.id)
                          ? 'bg-primary-100 border-primary-400 text-primary-700 ring-1 ring-primary-400'
                          : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-100'
                      }`}
                    >
                      {tag.name}
                      <span className="ml-1 text-gray-400">({tag.vendorCount})</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Clear Filters */}
            {activeFilterCount > 0 && (
              <div className="flex justify-end">
                <button
                  onClick={clearAllFilters}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-4 w-4" />
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Table with Card-style Rows */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        {/* Column Headers */}
        <div className="bg-gray-50 border-b border-gray-200">
          <div className="grid grid-cols-12 gap-2 px-4 py-2 text-xs font-medium text-gray-500 uppercase tracking-wider">
            <div
              className="col-span-4 flex items-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('companyName')}
            >
              Company <SortIcon field="companyName" />
            </div>
            <div
              className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('category')}
            >
              Category <SortIcon field="category" />
            </div>
            <div
              className="col-span-2 flex items-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('type')}
            >
              Type <SortIcon field="type" />
            </div>
            <div className="col-span-1 text-center">Contact</div>
            <div
              className="col-span-1 flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('rating')}
            >
              Rating <SortIcon field="rating" />
            </div>
            <div
              className="col-span-1 flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('projects')}
            >
              Projects <SortIcon field="projects" />
            </div>
            <div
              className="col-span-1 flex items-center justify-center gap-1 cursor-pointer hover:text-gray-700"
              onClick={() => handleSort('status')}
            >
              Status <SortIcon field="status" />
            </div>
          </div>
        </div>

        {/* Vendor Rows */}
        <div className="divide-y divide-gray-100">
          {sortedVendors.length === 0 ? (
            <div className="p-12 text-center">
              <Truck className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors found</h3>
              <p className="text-gray-500">
                {activeFilterCount > 0 ? 'Try adjusting your filters' : 'Add your first vendor to get started'}
              </p>
            </div>
          ) : (
            sortedVendors.map((vendor: Vendor) => (
              <div
                key={vendor.id}
                className="grid grid-cols-12 gap-2 px-4 py-3 hover:bg-gray-50 transition-colors cursor-pointer group items-center"
                onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
              >
                {/* Company - 4 cols */}
                <div className="col-span-4 min-w-0">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${vendor.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                    <div className="min-w-0">
                      <h4 className="text-sm font-medium text-gray-900 truncate">{vendor.companyName}</h4>
                      {vendor.primaryContact && (
                        <p className="text-xs text-gray-500 truncate">
                          {vendor.primaryContact.firstName} {vendor.primaryContact.lastName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Category - 2 cols */}
                <div className="col-span-2">
                  {vendor.category ? (
                    <span
                      className="inline-flex px-2 py-0.5 text-xs rounded-full truncate max-w-full"
                      style={{ backgroundColor: `${vendor.category.color}20`, color: vendor.category.color }}
                    >
                      {vendor.category.name}
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Type - 2 cols */}
                <div className="col-span-2">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${typeColors[vendor.type]}`}>
                    {getVendorTypeLabel(vendor.type)}
                  </span>
                </div>

                {/* Contact Info - 1 col */}
                <div className="col-span-1 flex items-center justify-center gap-1">
                  {vendor.phone && (
                    <a
                      href={`tel:${vendor.phone}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title={vendor.phone}
                    >
                      <Phone className="h-4 w-4" />
                    </a>
                  )}
                  {vendor.email && (
                    <a
                      href={`mailto:${vendor.email}`}
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title={vendor.email}
                    >
                      <Mail className="h-4 w-4" />
                    </a>
                  )}
                </div>

                {/* Rating - 1 col */}
                <div className="col-span-1 flex items-center justify-center">
                  {vendor.averageRating ? (
                    <div className="flex items-center gap-1">
                      <Star className="h-4 w-4 text-yellow-400 fill-yellow-400" />
                      <span className="text-sm font-medium">{vendor.averageRating.toFixed(1)}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Projects - 1 col */}
                <div className="col-span-1 flex items-center justify-center">
                  {(vendor.totalProjects || 0) > 0 ? (
                    <div className="flex items-center gap-1 text-sm text-gray-600">
                      <FolderOpen className="h-4 w-4" />
                      <span>{vendor.totalProjects}</span>
                    </div>
                  ) : (
                    <span className="text-xs text-gray-400">—</span>
                  )}
                </div>

                {/* Status & Actions - 1 col */}
                <div className="col-span-1 flex items-center justify-center gap-1">
                  <span className={`inline-flex px-2 py-0.5 text-xs font-medium rounded-full ${
                    vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {vendor.isActive ? 'Active' : 'Inactive'}
                  </span>

                  {/* Hover actions */}
                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity ml-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        router.push(`/dashboard/vendors/${vendor.id}`)
                      }}
                      className="p-1 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                      }}
                      className="p-1 text-gray-400 hover:text-gray-600 hover:bg-gray-200 rounded"
                      title="Edit"
                    >
                      <Edit className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}
