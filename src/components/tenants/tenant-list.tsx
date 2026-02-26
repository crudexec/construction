'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  Users,
  Phone,
  Mail,
  Building2,
  Home,
  Calendar,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Briefcase
} from 'lucide-react'
import Link from 'next/link'
import { format } from 'date-fns'

interface Tenant {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  alternatePhone?: string
  dateOfBirth?: string
  employer?: string
  jobTitle?: string
  monthlyIncome?: number
  status: string
  portalEnabled: boolean
  leases: Array<{
    id: string
    status: string
    monthlyRent: number
    property: { id: string; name: string }
    unit: { id: string; unitNumber: string }
  }>
  _count: { leases: number }
  createdAt: string
}

async function fetchTenants(params: { status?: string; search?: string; page?: number }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const searchParams = new URLSearchParams()
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params.search) searchParams.set('search', params.search)
  if (params.page) searchParams.set('page', String(params.page))

  const response = await fetch(`/api/tenants?${searchParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tenants')
  return response.json()
}

async function createTenant(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/tenants', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to create tenant')
  }
  return response.json()
}

async function updateTenant(id: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/tenants/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data)
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to update tenant')
  }
  return response.json()
}

async function deleteTenant(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/tenants/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete tenant')
  }
  return response.json()
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'PROSPECT': return 'bg-blue-100 text-blue-800'
    case 'PAST': return 'bg-gray-100 text-gray-800'
    case 'EVICTED': return 'bg-red-100 text-red-800'
    case 'BLACKLISTED': return 'bg-red-200 text-red-900'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Active'
    case 'PROSPECT': return 'Prospect'
    case 'PAST': return 'Past Tenant'
    case 'EVICTED': return 'Evicted'
    case 'BLACKLISTED': return 'Blacklisted'
    default: return status
  }
}

export function TenantList() {
  const queryClient = useQueryClient()
  const [searchTerm, setSearchTerm] = useState('')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showModal, setShowModal] = useState(false)
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['tenants', { status: filterStatus, search: searchTerm, page }],
    queryFn: () => fetchTenants({ status: filterStatus, search: searchTerm, page })
  })

  const createMutation = useMutation({
    mutationFn: createTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowModal(false)
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => updateTenant(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setShowModal(false)
      setEditingTenant(null)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTenant,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      setDeleteConfirm(null)
    }
  })

  const tenants: Tenant[] = data?.tenants || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Calculate stats
  const stats = {
    total: pagination.total,
    active: tenants.filter(t => t.status === 'ACTIVE').length,
    withActiveLease: tenants.filter(t => t.leases.some(l => l.status === 'ACTIVE')).length
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
      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Users className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Total Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Check className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Active Tenants</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">With Active Lease</p>
              <p className="text-2xl font-bold text-gray-900">{stats.withActiveLease}</p>
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
                placeholder="Search tenants by name, email, or phone..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="ACTIVE">Active</option>
              <option value="PROSPECT">Prospect</option>
              <option value="PAST">Past Tenant</option>
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
            <button
              onClick={() => {
                setEditingTenant(null)
                setShowModal(true)
              }}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Tenant</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tenant List */}
      {tenants.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No tenants found</p>
          <p className="text-sm text-gray-500">Get started by adding your first tenant</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Add Tenant
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contact
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Current Property
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Employment
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
                {tenants.map((tenant) => {
                  const activeLease = tenant.leases.find(l => l.status === 'ACTIVE')
                  return (
                    <tr key={tenant.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium">
                              {tenant.firstName[0]}{tenant.lastName[0]}
                            </span>
                          </div>
                          <div className="ml-4">
                            <Link
                              href={`/dashboard/tenants/${tenant.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-primary-600"
                            >
                              {tenant.firstName} {tenant.lastName}
                            </Link>
                            <div className="text-xs text-gray-500">
                              {tenant._count.leases} lease{tenant._count.leases !== 1 ? 's' : ''} total
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm text-gray-900 flex items-center">
                          <Mail className="h-4 w-4 mr-1 text-gray-400" />
                          {tenant.email}
                        </div>
                        <div className="text-sm text-gray-500 flex items-center">
                          <Phone className="h-4 w-4 mr-1 text-gray-400" />
                          {tenant.phone}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeLease ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 flex items-center">
                              <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                              {activeLease.property.name}
                            </div>
                            <div className="text-sm text-gray-500">
                              Unit {activeLease.unit.unitNumber}
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">No active lease</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {tenant.employer ? (
                          <div>
                            <div className="text-sm text-gray-900 flex items-center">
                              <Briefcase className="h-4 w-4 mr-1 text-gray-400" />
                              {tenant.employer}
                            </div>
                            {tenant.jobTitle && (
                              <div className="text-sm text-gray-500">{tenant.jobTitle}</div>
                            )}
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">Not specified</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                          {getStatusLabel(tenant.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <button
                            onClick={() => {
                              setEditingTenant(tenant)
                              setShowModal(true)
                            }}
                            className="text-primary-600 hover:text-primary-900"
                            title="Edit"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {deleteConfirm === tenant.id ? (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => deleteMutation.mutate(tenant.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Confirm Delete"
                              >
                                <Check className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => setDeleteConfirm(null)}
                                className="text-gray-600 hover:text-gray-900"
                                title="Cancel"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDeleteConfirm(tenant.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {tenants.map((tenant) => {
            const activeLease = tenant.leases.find(l => l.status === 'ACTIVE')
            return (
              <div
                key={tenant.id}
                className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                        <span className="text-primary-700 font-semibold text-lg">
                          {tenant.firstName[0]}{tenant.lastName[0]}
                        </span>
                      </div>
                      <div className="ml-3">
                        <Link
                          href={`/dashboard/tenants/${tenant.id}`}
                          className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                        >
                          {tenant.firstName} {tenant.lastName}
                        </Link>
                        <span className={`ml-2 inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                          {getStatusLabel(tenant.status)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      {tenant.email}
                    </div>
                    <div className="flex items-center text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      {tenant.phone}
                    </div>
                    {activeLease && (
                      <div className="flex items-center text-gray-600">
                        <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                        {activeLease.property.name} - Unit {activeLease.unit.unitNumber}
                      </div>
                    )}
                    {tenant.employer && (
                      <div className="flex items-center text-gray-600">
                        <Briefcase className="h-4 w-4 mr-2 text-gray-400" />
                        {tenant.employer}
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <span className="text-xs text-gray-500">
                      {tenant._count.leases} lease{tenant._count.leases !== 1 ? 's' : ''}
                    </span>
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setEditingTenant(tenant)
                          setShowModal(true)
                        }}
                        className="text-primary-600 hover:text-primary-900 p-1"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(tenant.id)}
                        className="text-red-600 hover:text-red-900 p-1"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="flex justify-center items-center space-x-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {pagination.totalPages}
          </span>
          <button
            onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
            disabled={page === pagination.totalPages}
            className="px-3 py-1 border rounded-md disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50"
          >
            Next
          </button>
        </div>
      )}

      {/* Create/Edit Modal */}
      {showModal && (
        <TenantModal
          tenant={editingTenant}
          onClose={() => {
            setShowModal(false)
            setEditingTenant(null)
          }}
          onSave={(data) => {
            if (editingTenant) {
              updateMutation.mutate({ id: editingTenant.id, data })
            } else {
              createMutation.mutate(data)
            }
          }}
          isLoading={createMutation.isPending || updateMutation.isPending}
          error={createMutation.error?.message || updateMutation.error?.message}
        />
      )}

      {/* Delete Error */}
      {deleteMutation.error && (
        <div className="fixed bottom-4 right-4 bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {deleteMutation.error.message}
        </div>
      )}
    </div>
  )
}

interface TenantModalProps {
  tenant: Tenant | null
  onClose: () => void
  onSave: (data: any) => void
  isLoading: boolean
  error?: string
}

function TenantModal({ tenant, onClose, onSave, isLoading, error }: TenantModalProps) {
  const [formData, setFormData] = useState({
    firstName: tenant?.firstName || '',
    lastName: tenant?.lastName || '',
    email: tenant?.email || '',
    phone: tenant?.phone || '',
    alternatePhone: tenant?.alternatePhone || '',
    dateOfBirth: tenant?.dateOfBirth ? new Date(tenant.dateOfBirth).toISOString().split('T')[0] : '',
    employer: tenant?.employer || '',
    jobTitle: tenant?.jobTitle || '',
    monthlyIncome: tenant?.monthlyIncome?.toString() || '',
    emergencyName: '',
    emergencyPhone: '',
    emergencyRelation: '',
    status: tenant?.status || 'ACTIVE',
    notes: ''
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      monthlyIncome: formData.monthlyIncome ? parseFloat(formData.monthlyIncome) : null,
      dateOfBirth: formData.dateOfBirth || null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900">
            {tenant ? 'Edit Tenant' : 'Add New Tenant'}
          </h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Personal Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  First Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Last Name *
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email *
                </label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Phone *
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Alternate Phone
                </label>
                <input
                  type="tel"
                  value={formData.alternatePhone}
                  onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Date of Birth
                </label>
                <input
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData({ ...formData, dateOfBirth: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Employment Information */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Employment Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Employer
                </label>
                <input
                  type="text"
                  value={formData.employer}
                  onChange={(e) => setFormData({ ...formData, employer: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Job Title
                </label>
                <input
                  type="text"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monthly Income
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={formData.monthlyIncome}
                  onChange={(e) => setFormData({ ...formData, monthlyIncome: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                <select
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="ACTIVE">Active</option>
                  <option value="PROSPECT">Prospect</option>
                  <option value="PAST">Past Tenant</option>
                </select>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div>
            <h3 className="text-lg font-medium text-gray-900 mb-4">Emergency Contact</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Name
                </label>
                <input
                  type="text"
                  value={formData.emergencyName}
                  onChange={(e) => setFormData({ ...formData, emergencyName: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contact Phone
                </label>
                <input
                  type="tel"
                  value={formData.emergencyPhone}
                  onChange={(e) => setFormData({ ...formData, emergencyPhone: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Relationship
                </label>
                <input
                  type="text"
                  value={formData.emergencyRelation}
                  onChange={(e) => setFormData({ ...formData, emergencyRelation: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
            >
              {isLoading && (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              )}
              {tenant ? 'Update Tenant' : 'Create Tenant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
