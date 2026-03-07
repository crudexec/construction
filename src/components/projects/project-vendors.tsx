'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Search,
  Truck,
  Phone,
  Mail,
  ExternalLink,
  X,
  Check,
  AlertCircle,
  Trash2,
  ChevronUp,
  ChevronDown
} from 'lucide-react'
import Link from 'next/link'
import toast from 'react-hot-toast'

interface Vendor {
  id: string
  name: string
  companyName: string
  email?: string
  phone?: string
  type: 'SUPPLY_AND_INSTALLATION' | 'SUPPLY' | 'INSTALLATION'
  isActive: boolean
}

interface ProjectVendor {
  id: string
  status: string
  assignedAt: string
  vendor: Vendor
}

interface ProjectVendorsProps {
  projectId: string
}

type SortColumn = 'name' | 'type' | 'status' | 'assignedAt' | null
type SortDirection = 'asc' | 'desc'

async function fetchProjectVendors(projectId: string): Promise<ProjectVendor[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/projects/${projectId}/vendors`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch project vendors')
  return response.json()
}

async function fetchAvailableVendors(): Promise<Vendor[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/vendors', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch vendors')
  return response.json()
}

async function assignVendorToProject(projectId: string, vendorId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/projects/${projectId}/vendors`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ vendorId })
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to assign vendor')
  }
  return response.json()
}

async function updateProjectVendorStatus(projectVendorId: string, status: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/projects/vendors/${projectVendorId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify({ status })
  })

  if (!response.ok) throw new Error('Failed to update vendor status')
  return response.json()
}

async function removeVendorFromProject(projectVendorId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/projects/vendors/${projectVendorId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to remove vendor')
  return response.json()
}

const getVendorTypeLabel = (type: string) => {
  switch (type) {
    case 'SUPPLY_AND_INSTALLATION': return 'Supply & Install'
    case 'SUPPLY': return 'Supply'
    case 'INSTALLATION': return 'Install'
    default: return type
  }
}

const getVendorTypeShort = (type: string) => {
  switch (type) {
    case 'SUPPLY_AND_INSTALLATION': return 'S&I'
    case 'SUPPLY': return 'S'
    case 'INSTALLATION': return 'I'
    default: return type
  }
}

const STATUS_OPTIONS = [
  { value: 'ASSIGNED', label: 'Assigned', color: 'bg-green-50 text-green-700 border-green-200' },
  { value: 'IN_PROGRESS', label: 'Active', color: 'bg-blue-50 text-blue-700 border-blue-200' },
  { value: 'COMPLETED', label: 'Done', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { value: 'ON_HOLD', label: 'On Hold', color: 'bg-yellow-50 text-yellow-700 border-yellow-200' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'bg-red-50 text-red-700 border-red-200' }
]

const getStatusColor = (status: string) => {
  const option = STATUS_OPTIONS.find(o => o.value === status.toUpperCase())
  return option?.color || 'bg-gray-50 text-gray-700 border-gray-200'
}

export function ProjectVendors({ projectId }: ProjectVendorsProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const queryClient = useQueryClient()

  const { data: projectVendors = [], isLoading } = useQuery({
    queryKey: ['project-vendors', projectId],
    queryFn: () => fetchProjectVendors(projectId)
  })

  const { data: availableVendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchAvailableVendors,
    enabled: isAddModalOpen
  })

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const assignVendorMutation = useMutation({
    mutationFn: ({ vendorId }: { vendorId: string }) => assignVendorToProject(projectId, vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
      toast.success('Vendor assigned')
      setIsAddModalOpen(false)
      setSearchTerm('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to assign vendor')
    }
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => updateProjectVendorStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
      toast.success('Status updated')
    },
    onError: () => {
      toast.error('Failed to update status')
    }
  })

  const removeVendorMutation = useMutation({
    mutationFn: removeVendorFromProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
      toast.success('Vendor removed')
    },
    onError: () => {
      toast.error('Failed to remove vendor')
    }
  })

  const assignedVendorIds = projectVendors.map(pv => pv.vendor.id)
  const unassignedVendors = availableVendors.filter(vendor =>
    !assignedVendorIds.includes(vendor.id) &&
    vendor.isActive &&
    (vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  // Sort vendors
  const sortedVendors = [...projectVendors].sort((a, b) => {
    if (!sortColumn) {
      return new Date(b.assignedAt).getTime() - new Date(a.assignedAt).getTime()
    }

    const multiplier = sortDirection === 'asc' ? 1 : -1

    switch (sortColumn) {
      case 'name':
        return a.vendor.name.localeCompare(b.vendor.name) * multiplier
      case 'type':
        return a.vendor.type.localeCompare(b.vendor.type) * multiplier
      case 'status':
        return a.status.localeCompare(b.status) * multiplier
      case 'assignedAt':
        return (new Date(a.assignedAt).getTime() - new Date(b.assignedAt).getTime()) * multiplier
      default:
        return 0
    }
  })

  // Calculate stats
  const totalVendors = projectVendors.length
  const activeCount = projectVendors.filter(pv => pv.status.toUpperCase() === 'IN_PROGRESS').length
  const completedCount = projectVendors.filter(pv => pv.status.toUpperCase() === 'COMPLETED').length
  const onHoldCount = projectVendors.filter(pv => pv.status.toUpperCase() === 'ON_HOLD').length

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Header Stats Bar */}
      <div className="bg-slate-800 rounded-lg p-2.5 text-white">
        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{totalVendors}</div>
            <div className="text-[10px] text-slate-400 uppercase">Total</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-blue-400">{activeCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Active</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Done</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${onHoldCount > 0 ? 'text-amber-400' : 'text-slate-300'}`}>{onHoldCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">On Hold</div>
          </div>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="flex items-center justify-end">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="inline-flex items-center px-2.5 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          Assign Vendor
        </button>
      </div>

      {/* Excel-like Table */}
      {projectVendors.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Truck className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">No vendors assigned</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs text-primary-600 hover:text-primary-700 mt-2"
          >
            Assign First Vendor
          </button>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[140px]"
                  onClick={() => handleSort('name')}
                >
                  <div className="flex items-center gap-1">
                    Vendor
                    <SortIcon column="name" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[70px]"
                  onClick={() => handleSort('type')}
                >
                  <div className="flex items-center gap-1">
                    Type
                    <SortIcon column="type" />
                  </div>
                </th>
                <th className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 w-[120px]">
                  Contact
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[90px]"
                  onClick={() => handleSort('status')}
                >
                  <div className="flex items-center gap-1">
                    Status
                    <SortIcon column="status" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[80px]"
                  onClick={() => handleSort('assignedAt')}
                >
                  <div className="flex items-center gap-1">
                    Assigned
                    <SortIcon column="assignedAt" />
                  </div>
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-[60px]">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedVendors.map((pv, index) => (
                <tr
                  key={pv.id}
                  className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  {/* Row Number */}
                  <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">
                    {index + 1}
                  </td>

                  {/* Vendor Name & Company */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    <div className="font-medium text-gray-900 truncate">{pv.vendor.name}</div>
                    <div className="text-[10px] text-gray-500 truncate">{pv.vendor.companyName}</div>
                  </td>

                  {/* Type */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]" title={getVendorTypeLabel(pv.vendor.type)}>
                      {getVendorTypeShort(pv.vendor.type)}
                    </span>
                  </td>

                  {/* Contact */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    <div className="space-y-0.5">
                      {pv.vendor.email && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-600 truncate">
                          <Mail className="h-2.5 w-2.5 flex-shrink-0" />
                          <span className="truncate">{pv.vendor.email}</span>
                        </div>
                      )}
                      {pv.vendor.phone && (
                        <div className="flex items-center gap-1 text-[10px] text-gray-600">
                          <Phone className="h-2.5 w-2.5 flex-shrink-0" />
                          <span>{pv.vendor.phone}</span>
                        </div>
                      )}
                      {!pv.vendor.email && !pv.vendor.phone && (
                        <span className="text-[10px] text-gray-400">-</span>
                      )}
                    </div>
                  </td>

                  {/* Status */}
                  <td className="px-2 py-1 border-r border-gray-200">
                    <select
                      value={pv.status.toUpperCase()}
                      onChange={(e) => updateStatusMutation.mutate({ id: pv.id, status: e.target.value })}
                      className={`text-[10px] border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full ${getStatusColor(pv.status)}`}
                    >
                      {STATUS_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </td>

                  {/* Assigned Date */}
                  <td className="px-2 py-1 border-r border-gray-200 text-gray-600">
                    {new Date(pv.assignedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                  </td>

                  {/* Actions */}
                  <td className="px-1 py-1 text-center">
                    <div className="flex items-center justify-center gap-0.5">
                      <Link
                        href={`/dashboard/vendors/${pv.vendor.id}`}
                        className="p-0.5 text-gray-400 hover:text-primary-600 rounded"
                        title="View vendor"
                      >
                        <ExternalLink className="h-3 w-3" />
                      </Link>
                      <button
                        onClick={() => {
                          if (confirm('Remove this vendor from the project?')) {
                            removeVendorMutation.mutate(pv.id)
                          }
                        }}
                        disabled={removeVendorMutation.isPending}
                        className="p-0.5 text-gray-400 hover:text-red-600 rounded disabled:opacity-50"
                        title="Remove"
                      >
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">Assign Vendor</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="p-4 border-b border-gray-200">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search vendors..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 w-full text-sm border border-gray-300 rounded focus:ring-1 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-2">
              {unassignedVendors.length === 0 ? (
                <div className="text-center py-8">
                  <Truck className="h-8 w-8 mx-auto text-gray-400 mb-2" />
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No vendors found' : 'All vendors assigned'}
                  </p>
                </div>
              ) : (
                <div className="space-y-1">
                  {unassignedVendors.map((vendor) => (
                    <div
                      key={vendor.id}
                      className="border border-gray-200 rounded p-2 hover:bg-gray-50 flex items-center justify-between"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-900 truncate">{vendor.name}</span>
                          <span className="px-1 py-0.5 bg-blue-50 text-blue-700 rounded text-[10px]">
                            {getVendorTypeShort(vendor.type)}
                          </span>
                        </div>
                        <div className="text-[10px] text-gray-500 truncate">{vendor.companyName}</div>
                        <div className="flex items-center gap-3 mt-1">
                          {vendor.email && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                              <Mail className="h-2.5 w-2.5" />
                              {vendor.email}
                            </span>
                          )}
                          {vendor.phone && (
                            <span className="flex items-center gap-0.5 text-[10px] text-gray-500">
                              <Phone className="h-2.5 w-2.5" />
                              {vendor.phone}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={() => assignVendorMutation.mutate({ vendorId: vendor.id })}
                        disabled={assignVendorMutation.isPending}
                        className="ml-2 px-2 py-1 bg-primary-600 text-white text-[10px] rounded hover:bg-primary-700 disabled:opacity-50 flex items-center gap-0.5"
                      >
                        <Check className="h-2.5 w-2.5" />
                        Assign
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {assignVendorMutation.error && (
                <div className="mt-3 bg-red-50 border border-red-200 rounded p-2 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-red-700">{assignVendorMutation.error.message}</p>
                </div>
              )}
            </div>

            <div className="px-4 py-3 border-t border-gray-200 flex justify-end">
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
