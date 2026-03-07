'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  Search,
  Truck,
  Star,
  X,
  Filter,
  ChevronUp,
  ChevronDown,
  Download
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
    case 'SUPPLY_AND_INSTALLATION': return 'S&I'
    case 'SUPPLY': return 'Supply'
    case 'INSTALLATION': return 'Install'
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
  const [showFilters, setShowFilters] = useState(false)
  const [sortField, setSortField] = useState<string>('companyName')
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())

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
                         vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (vendor.email?.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (vendor.phone?.includes(searchTerm))
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
      case 'contact':
        aVal = a.primaryContact ? `${a.primaryContact.firstName} ${a.primaryContact.lastName}`.toLowerCase() : 'zzz'
        bVal = b.primaryContact ? `${b.primaryContact.firstName} ${b.primaryContact.lastName}`.toLowerCase() : 'zzz'
        break
      case 'email':
        aVal = (a.email || a.primaryContact?.email || 'zzz').toLowerCase()
        bVal = (b.email || b.primaryContact?.email || 'zzz').toLowerCase()
        break
      case 'phone':
        aVal = a.phone || a.primaryContact?.phone || 'zzz'
        bVal = b.phone || b.primaryContact?.phone || 'zzz'
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
    if (sortField !== field) return null
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3" />
      : <ChevronDown className="h-3 w-3" />
  }

  const handleTagToggle = (tagId: string) => {
    setSelectedTagIds(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    )
  }

  const handleSelectAll = () => {
    if (selectedRows.size === sortedVendors.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(sortedVendors.map((v: Vendor) => v.id)))
    }
  }

  const handleRowSelect = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
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
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          {/* Search */}
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

          {/* Quick Filters */}
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Categories</option>
            {availableCategories.map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Types</option>
            <option value="SUPPLY_AND_INSTALLATION">S&I</option>
            <option value="SUPPLY">Supply</option>
            <option value="INSTALLATION">Install</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="text-xs border border-gray-300 rounded px-2 py-1 focus:ring-1 focus:ring-primary-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>

          {/* More Filters Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-1 px-2 py-1 text-xs rounded border ${
              showFilters || selectedTagIds.length > 0
                ? 'bg-primary-50 border-primary-300 text-primary-700'
                : 'bg-white border-gray-300 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <Filter className="h-3 w-3" />
            Tags
            {selectedTagIds.length > 0 && (
              <span className="bg-primary-600 text-white text-[10px] px-1 rounded-full">
                {selectedTagIds.length}
              </span>
            )}
          </button>

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
          <span>{sortedVendors.length} vendors</span>
        </div>
      </div>

      {/* Tags Filter Row */}
      {showFilters && availableTags.length > 0 && (
        <div className="flex flex-wrap gap-1 px-1 py-1 bg-gray-50 rounded border">
          {availableTags.map((tag) => (
            <button
              key={tag.id}
              onClick={() => handleTagToggle(tag.id)}
              className={`text-[10px] px-2 py-0.5 rounded-full border transition-colors ${
                selectedTagIds.includes(tag.id)
                  ? 'bg-primary-100 border-primary-400 text-primary-700'
                  : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-100'
              }`}
            >
              {tag.name} ({tag.vendorCount})
            </button>
          ))}
        </div>
      )}

      {/* Excel-like Table */}
      <div className="border border-gray-300 rounded overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="w-8 px-1 py-1.5 border-r border-gray-200">
                  <input
                    type="checkbox"
                    checked={selectedRows.size === sortedVendors.length && sortedVendors.length > 0}
                    onChange={handleSelectAll}
                    className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                  />
                </th>
                <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[180px]"
                  onClick={() => handleSort('companyName')}
                >
                  <div className="flex items-center gap-1">
                    Company <SortIcon field="companyName" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                  onClick={() => handleSort('contact')}
                >
                  <div className="flex items-center gap-1">
                    Contact <SortIcon field="contact" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[160px]"
                  onClick={() => handleSort('email')}
                >
                  <div className="flex items-center gap-1">
                    Email <SortIcon field="email" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                  onClick={() => handleSort('phone')}
                >
                  <div className="flex items-center gap-1">
                    Phone <SortIcon field="phone" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[100px]"
                  onClick={() => handleSort('category')}
                >
                  <div className="flex items-center gap-1">
                    Category <SortIcon field="category" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-16"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type <SortIcon field="type" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-14"
                  onClick={() => handleSort('rating')}
                >
                  <div className="flex items-center justify-center gap-1">
                    <Star className="h-3 w-3" /> <SortIcon field="rating" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-12"
                  onClick={() => handleSort('projects')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Proj <SortIcon field="projects" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-16"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Status <SortIcon field="status" />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVendors.length === 0 ? (
                <tr>
                  <td colSpan={11} className="px-4 py-8 text-center text-gray-500">
                    <Truck className="h-8 w-8 text-gray-300 mx-auto mb-2" />
                    <p className="font-medium">No vendors found</p>
                    <p className="text-[10px]">{activeFilterCount > 0 ? 'Try adjusting filters' : 'Add your first vendor'}</p>
                  </td>
                </tr>
              ) : (
                sortedVendors.map((vendor: Vendor, index: number) => (
                  <tr
                    key={vendor.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer ${
                      selectedRows.has(vendor.id) ? 'bg-blue-100' : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}`)}
                  >
                    <td className="px-1 py-1 border-r border-gray-200 text-center" onClick={(e) => handleRowSelect(vendor.id, e)}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(vendor.id)}
                        onChange={() => {}}
                        className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">{index + 1}</td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${vendor.isActive ? 'bg-green-500' : 'bg-gray-300'}`} />
                        <span className="font-medium text-gray-900 truncate">{vendor.companyName}</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-700 truncate">
                      {vendor.primaryContact
                        ? `${vendor.primaryContact.firstName} ${vendor.primaryContact.lastName}`
                        : <span className="text-gray-400">-</span>
                      }
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600 truncate">
                      {vendor.email || vendor.primaryContact?.email || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600">
                      {vendor.phone || vendor.primaryContact?.phone || <span className="text-gray-400">-</span>}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      {vendor.category ? (
                        <span className="text-gray-700">{vendor.category.name}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600">
                      {getVendorTypeLabel(vendor.type)}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-center">
                      {vendor.averageRating ? (
                        <span className="text-gray-700">{vendor.averageRating.toFixed(1)}</span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-center text-gray-600">
                      {vendor.totalProjects || 0}
                    </td>
                    <td className="px-2 py-1 text-center">
                      <span className={`inline-block px-1.5 py-0.5 rounded text-[10px] font-medium ${
                        vendor.isActive ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'
                      }`}>
                        {vendor.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between px-1 text-[10px] text-gray-500">
        <span>Showing {sortedVendors.length} of {vendors.length} vendors</span>
        <span>Click row to view details | Sort by clicking column headers</span>
      </div>
    </div>
  )
}
