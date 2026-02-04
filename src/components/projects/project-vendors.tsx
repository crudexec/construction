'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, Search, Truck, Star, Phone, Mail, ExternalLink, X, Check, AlertCircle } from 'lucide-react'
import Link from 'next/link'

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
    case 'SUPPLY_AND_INSTALLATION': return 'Supply & Installation'
    case 'SUPPLY': return 'Supply Only'
    case 'INSTALLATION': return 'Installation Only'
    default: return type
  }
}

const getStatusColor = (status: string) => {
  switch (status.toLowerCase()) {
    case 'assigned': return 'bg-green-100 text-green-800'
    case 'in_progress': return 'bg-blue-100 text-blue-800'
    case 'completed': return 'bg-purple-100 text-purple-800'
    case 'on_hold': return 'bg-yellow-100 text-yellow-800'
    case 'cancelled': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status.toLowerCase()) {
    case 'assigned': return 'Assigned'
    case 'in_progress': return 'In Progress'
    case 'completed': return 'Completed'
    case 'on_hold': return 'On Hold'
    case 'cancelled': return 'Cancelled'
    default: return status
  }
}

export function ProjectVendors({ projectId }: ProjectVendorsProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
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

  const assignVendorMutation = useMutation({
    mutationFn: ({ vendorId }: { vendorId: string }) => assignVendorToProject(projectId, vendorId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
      setIsAddModalOpen(false)
      setSearchTerm('')
    }
  })

  const removeVendorMutation = useMutation({
    mutationFn: removeVendorFromProject,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-vendors', projectId] })
    }
  })

  const assignedVendorIds = projectVendors.map(pv => pv.vendor.id)
  const unassignedVendors = availableVendors.filter(vendor => 
    !assignedVendorIds.includes(vendor.id) &&
    vendor.isActive &&
    (vendor.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
     vendor.companyName.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">Project Vendors</h2>
          <p className="text-sm text-gray-600">Manage vendors assigned to this project</p>
        </div>
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
        >
          <Plus className="h-4 w-4" />
          <span>Assign Vendor</span>
        </button>
      </div>

      {/* Vendors List */}
      {projectVendors.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No vendors assigned</h3>
          <p className="text-gray-600 mb-4">Get started by assigning vendors to this project</p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
          >
            Assign First Vendor
          </button>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Vendor
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Type
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Assigned Date
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {projectVendors.map((pv) => (
                  <tr key={pv.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{pv.vendor.name}</div>
                        <div className="text-sm text-gray-500">{pv.vendor.companyName}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                        {getVendorTypeLabel(pv.vendor.type)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      <div className="space-y-1">
                        {pv.vendor.email && (
                          <div className="flex items-center space-x-1">
                            <Mail className="h-3 w-3" />
                            <span>{pv.vendor.email}</span>
                          </div>
                        )}
                        {pv.vendor.phone && (
                          <div className="flex items-center space-x-1">
                            <Phone className="h-3 w-3" />
                            <span>{pv.vendor.phone}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pv.status)}`}>
                        {getStatusLabel(pv.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {new Date(pv.assignedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <Link
                        href={`/dashboard/vendors/${pv.vendor.id}`}
                        className="text-primary-600 hover:text-primary-900 inline-flex items-center space-x-1"
                      >
                        <ExternalLink className="h-3 w-3" />
                        <span>View</span>
                      </Link>
                      <button
                        onClick={() => removeVendorMutation.mutate(pv.id)}
                        disabled={removeVendorMutation.isPending}
                        className="text-red-600 hover:text-red-900 disabled:opacity-50"
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Vendor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen px-4">
            <div className="fixed inset-0 bg-black bg-opacity-50" onClick={() => setIsAddModalOpen(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-screen overflow-y-auto">
              <div className="flex items-center justify-between p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Assign Vendor to Project</h3>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="text-gray-400 hover:text-gray-500"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="p-6">
                {/* Search */}
                <div className="mb-6">
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

                {/* Available Vendors */}
                <div className="space-y-3 max-h-96 overflow-y-auto">
                  {unassignedVendors.length === 0 ? (
                    <div className="text-center py-8">
                      <Truck className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                      <p className="text-gray-500">
                        {searchTerm ? 'No vendors found matching your search' : 'All active vendors are already assigned'}
                      </p>
                    </div>
                  ) : (
                    unassignedVendors.map((vendor) => (
                      <div key={vendor.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <div>
                                <h4 className="text-sm font-medium text-gray-900">{vendor.name}</h4>
                                <p className="text-sm text-gray-500">{vendor.companyName}</p>
                              </div>
                              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                                {getVendorTypeLabel(vendor.type)}
                              </span>
                            </div>
                            <div className="mt-2 flex items-center space-x-4 text-xs text-gray-500">
                              {vendor.email && (
                                <div className="flex items-center space-x-1">
                                  <Mail className="h-3 w-3" />
                                  <span>{vendor.email}</span>
                                </div>
                              )}
                              {vendor.phone && (
                                <div className="flex items-center space-x-1">
                                  <Phone className="h-3 w-3" />
                                  <span>{vendor.phone}</span>
                                </div>
                              )}
                            </div>
                          </div>
                          <button
                            onClick={() => assignVendorMutation.mutate({ vendorId: vendor.id })}
                            disabled={assignVendorMutation.isPending}
                            className="bg-primary-600 text-white px-3 py-1 rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center space-x-1"
                          >
                            <Check className="h-3 w-3" />
                            <span>Assign</span>
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                {assignVendorMutation.error && (
                  <div className="mt-4 bg-red-50 border border-red-200 rounded-md p-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                      <div className="ml-3">
                        <p className="text-sm text-red-800">
                          {assignVendorMutation.error.message}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-4 p-6 border-t border-gray-200">
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}