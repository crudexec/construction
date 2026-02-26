'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Search,
  FileText,
  Building2,
  Home,
  User,
  Calendar,
  DollarSign,
  Plus,
  Edit,
  Trash2,
  X,
  Check,
  AlertCircle,
  Clock,
  CheckCircle,
  XCircle
} from 'lucide-react'
import Link from 'next/link'
import { format, differenceInDays } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'

interface Lease {
  id: string
  leaseNumber?: string
  type: string
  status: string
  startDate: string
  endDate: string
  moveInDate?: string
  monthlyRent: number
  securityDeposit: number
  property: {
    id: string
    name: string
    address: string
  }
  unit: {
    id: string
    unitNumber: string
    type: string
    bedrooms?: number
    bathrooms?: number
  }
  primaryTenant: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
  }
  tenants: Array<{
    tenant: {
      id: string
      firstName: string
      lastName: string
    }
  }>
  charges: Array<{
    id: string
    name: string
    amount: number
    frequency: string
  }>
  _count: { tenants: number }
  createdAt: string
}

interface Property {
  id: string
  name: string
  units: Array<{
    id: string
    unitNumber: string
    type: string
    status: string
    marketRent?: number
  }>
}

interface Tenant {
  id: string
  firstName: string
  lastName: string
  email: string
  status: string
}

async function fetchLeases(params: { status?: string; propertyId?: string; page?: number }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const searchParams = new URLSearchParams()
  if (params.status && params.status !== 'all') searchParams.set('status', params.status)
  if (params.propertyId && params.propertyId !== 'all') searchParams.set('propertyId', params.propertyId)
  if (params.page) searchParams.set('page', String(params.page))

  const response = await fetch(`/api/leases?${searchParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch leases')
  return response.json()
}

async function fetchProperties() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/properties', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch properties')
  return response.json()
}

async function fetchTenants() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/tenants?status=ACTIVE&limit=100', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tenants')
  const data = await response.json()
  return data.tenants
}

async function createLease(data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/leases', {
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
    throw new Error(error.error || 'Failed to create lease')
  }
  return response.json()
}

async function deleteLease(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/leases/${id}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to delete lease')
  }
  return response.json()
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'PENDING_SIGNATURE': return 'bg-yellow-100 text-yellow-800'
    case 'EXPIRED': return 'bg-orange-100 text-orange-800'
    case 'RENEWED': return 'bg-blue-100 text-blue-800'
    case 'TERMINATED': return 'bg-red-100 text-red-800'
    case 'EVICTION': return 'bg-red-200 text-red-900'
    default: return 'bg-gray-100 text-gray-800'
  }
}

const getStatusLabel = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'Active'
    case 'DRAFT': return 'Draft'
    case 'PENDING_SIGNATURE': return 'Pending Signature'
    case 'EXPIRED': return 'Expired'
    case 'RENEWED': return 'Renewed'
    case 'TERMINATED': return 'Terminated'
    case 'EVICTION': return 'Eviction'
    default: return status
  }
}

const getTypeLabel = (type: string) => {
  switch (type) {
    case 'FIXED_TERM': return 'Fixed Term'
    case 'MONTH_TO_MONTH': return 'Month to Month'
    case 'CORPORATE': return 'Corporate'
    case 'STUDENT': return 'Student'
    default: return type
  }
}

export function LeaseList() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [filterProperty, setFilterProperty] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('table')
  const [showModal, setShowModal] = useState(false)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)

  const { data, isLoading } = useQuery({
    queryKey: ['leases', { status: filterStatus, propertyId: filterProperty, page }],
    queryFn: () => fetchLeases({ status: filterStatus, propertyId: filterProperty, page })
  })

  const { data: properties = [] } = useQuery({
    queryKey: ['properties'],
    queryFn: fetchProperties
  })

  const createMutation = useMutation({
    mutationFn: createLease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      setShowModal(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteLease,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      setDeleteConfirm(null)
    }
  })

  const leases: Lease[] = data?.leases || []
  const pagination = data?.pagination || { page: 1, totalPages: 1, total: 0 }

  // Calculate stats
  const stats = {
    total: pagination.total,
    active: leases.filter(l => l.status === 'ACTIVE').length,
    expiringSoon: leases.filter(l => {
      if (l.status !== 'ACTIVE') return false
      const daysLeft = differenceInDays(new Date(l.endDate), new Date())
      return daysLeft >= 0 && daysLeft <= 60
    }).length,
    totalRent: leases.filter(l => l.status === 'ACTIVE').reduce((sum, l) => sum + l.monthlyRent, 0)
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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <FileText className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Total Leases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <CheckCircle className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Active Leases</p>
              <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Clock className="h-8 w-8 text-yellow-600" />
            <div>
              <p className="text-sm text-gray-500">Expiring Soon</p>
              <p className="text-2xl font-bold text-gray-900">{stats.expiringSoon}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Monthly Revenue</p>
              <p className="text-xl font-bold text-gray-900">{formatCurrency(stats.totalRent)}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg shadow border">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1 flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Status</option>
              <option value="DRAFT">Draft</option>
              <option value="PENDING_SIGNATURE">Pending Signature</option>
              <option value="ACTIVE">Active</option>
              <option value="EXPIRED">Expired</option>
              <option value="TERMINATED">Terminated</option>
            </select>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
            >
              <option value="all">All Properties</option>
              {properties.map((p: Property) => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
          <div className="flex gap-3">
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
              onClick={() => setShowModal(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>New Lease</span>
            </button>
          </div>
        </div>
      </div>

      {/* Lease List */}
      {leases.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900">No leases found</p>
          <p className="text-sm text-gray-500">Get started by creating your first lease</p>
          <button
            onClick={() => setShowModal(true)}
            className="mt-4 inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
          >
            <Plus className="h-4 w-4 mr-2" />
            Create Lease
          </button>
        </div>
      ) : viewMode === 'table' ? (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Lease
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Property / Unit
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tenant
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Term
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Rent
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
                {leases.map((lease) => {
                  const daysLeft = differenceInDays(new Date(lease.endDate), new Date())
                  const isExpiringSoon = lease.status === 'ACTIVE' && daysLeft >= 0 && daysLeft <= 60

                  return (
                    <tr key={lease.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/leases/${lease.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {lease.leaseNumber || 'Draft Lease'}
                        </Link>
                        <div className="text-xs text-gray-500">
                          {getTypeLabel(lease.type)}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <Building2 className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <Link
                              href={`/dashboard/properties/${lease.property.id}`}
                              className="text-sm font-medium text-gray-900 hover:text-primary-600"
                            >
                              {lease.property.name}
                            </Link>
                            <div className="text-xs text-gray-500">
                              Unit {lease.unit.unitNumber}
                              {lease.unit.bedrooms && ` • ${lease.unit.bedrooms} BR`}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/tenants/${lease.primaryTenant.id}`}
                          className="text-sm font-medium text-gray-900 hover:text-primary-600"
                        >
                          {lease.primaryTenant.firstName} {lease.primaryTenant.lastName}
                        </Link>
                        {lease._count.tenants > 1 && (
                          <div className="text-xs text-gray-500">
                            +{lease._count.tenants - 1} other{lease._count.tenants > 2 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        <div>{format(new Date(lease.startDate), 'MMM d, yyyy')}</div>
                        <div className="text-gray-500">to {format(new Date(lease.endDate), 'MMM d, yyyy')}</div>
                        {isExpiringSoon && (
                          <div className="text-xs text-yellow-600 font-medium">
                            {daysLeft} days left
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(lease.monthlyRent)}/mo
                        </div>
                        {lease.charges.length > 0 && (
                          <div className="text-xs text-gray-500">
                            +{lease.charges.length} charge{lease.charges.length > 1 ? 's' : ''}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lease.status)}`}>
                          {getStatusLabel(lease.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-3">
                          <Link
                            href={`/dashboard/leases/${lease.id}`}
                            className="text-primary-600 hover:text-primary-900"
                            title="View"
                          >
                            <Edit className="h-4 w-4" />
                          </Link>
                          {lease.status === 'DRAFT' && (
                            deleteConfirm === lease.id ? (
                              <div className="flex items-center space-x-2">
                                <button
                                  onClick={() => deleteMutation.mutate(lease.id)}
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
                                onClick={() => setDeleteConfirm(lease.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )
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
          {leases.map((lease) => {
            const daysLeft = differenceInDays(new Date(lease.endDate), new Date())
            const isExpiringSoon = lease.status === 'ACTIVE' && daysLeft >= 0 && daysLeft <= 60

            return (
              <div
                key={lease.id}
                className="bg-white rounded-lg shadow border hover:shadow-lg transition-shadow"
              >
                <div className="p-5">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <Link
                        href={`/dashboard/leases/${lease.id}`}
                        className="text-lg font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {lease.leaseNumber || 'Draft Lease'}
                      </Link>
                      <p className="text-sm text-gray-500">{getTypeLabel(lease.type)}</p>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(lease.status)}`}>
                      {getStatusLabel(lease.status)}
                    </span>
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center text-sm text-gray-600">
                      <Building2 className="h-4 w-4 mr-2 text-gray-400" />
                      {lease.property.name} - Unit {lease.unit.unitNumber}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2 text-gray-400" />
                      {lease.primaryTenant.firstName} {lease.primaryTenant.lastName}
                    </div>
                    <div className="flex items-center text-sm text-gray-600">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
                    </div>
                    {isExpiringSoon && (
                      <div className="text-sm text-yellow-600 font-medium">
                        Expires in {daysLeft} days
                      </div>
                    )}
                  </div>

                  <div className="mt-4 pt-4 border-t flex justify-between items-center">
                    <div>
                      <p className="text-lg font-semibold text-gray-900">{formatCurrency(lease.monthlyRent)}</p>
                      <p className="text-xs text-gray-500">per month</p>
                    </div>
                    <Link
                      href={`/dashboard/leases/${lease.id}`}
                      className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                    >
                      View Details
                    </Link>
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

      {/* Create Lease Modal */}
      {showModal && (
        <LeaseModal
          onClose={() => setShowModal(false)}
          onSave={(data) => createMutation.mutate(data)}
          isLoading={createMutation.isPending}
          error={createMutation.error?.message}
          properties={properties}
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

interface LeaseModalProps {
  onClose: () => void
  onSave: (data: any) => void
  isLoading: boolean
  error?: string
  properties: Property[]
}

function LeaseModal({ onClose, onSave, isLoading, error, properties }: LeaseModalProps) {
  const { format: formatCurrency } = useCurrency()
  const [step, setStep] = useState(1)
  const [formData, setFormData] = useState({
    propertyId: '',
    unitId: '',
    primaryTenantId: '',
    type: 'FIXED_TERM',
    startDate: '',
    endDate: '',
    moveInDate: '',
    monthlyRent: '',
    rentDueDay: '1',
    gracePeriodDays: '5',
    lateFeeType: 'FLAT',
    lateFeeAmount: '',
    securityDeposit: '',
    petsAllowed: false,
    petDeposit: '',
    petRent: '',
    smokingAllowed: false,
    notes: ''
  })

  const { data: tenants = [], isLoading: tenantsLoading } = useQuery({
    queryKey: ['tenants-active'],
    queryFn: fetchTenants
  })

  const selectedProperty = properties.find(p => p.id === formData.propertyId)
  const availableUnits = selectedProperty?.units.filter(u => u.status === 'VACANT') || []
  const selectedUnit = availableUnits.find(u => u.id === formData.unitId)

  useEffect(() => {
    if (selectedUnit?.marketRent && !formData.monthlyRent) {
      setFormData(prev => ({ ...prev, monthlyRent: String(selectedUnit.marketRent) }))
    }
  }, [selectedUnit])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      ...formData,
      monthlyRent: parseFloat(formData.monthlyRent),
      rentDueDay: parseInt(formData.rentDueDay),
      gracePeriodDays: parseInt(formData.gracePeriodDays),
      lateFeeAmount: formData.lateFeeAmount ? parseFloat(formData.lateFeeAmount) : null,
      securityDeposit: formData.securityDeposit ? parseFloat(formData.securityDeposit) : 0,
      petDeposit: formData.petDeposit ? parseFloat(formData.petDeposit) : null,
      petRent: formData.petRent ? parseFloat(formData.petRent) : null
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto">
        <div className="sticky top-0 bg-white px-6 py-4 border-b flex justify-between items-center">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Create New Lease</h2>
            <p className="text-sm text-gray-500">Step {step} of 3</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b bg-gray-50">
          <div className="flex items-center justify-between">
            {['Property & Unit', 'Tenant', 'Lease Terms'].map((label, i) => (
              <div key={label} className="flex items-center">
                <div className={`flex items-center justify-center w-8 h-8 rounded-full ${
                  step > i + 1 ? 'bg-green-500 text-white' :
                  step === i + 1 ? 'bg-primary-600 text-white' :
                  'bg-gray-200 text-gray-600'
                }`}>
                  {step > i + 1 ? <Check className="h-4 w-4" /> : i + 1}
                </div>
                <span className={`ml-2 text-sm ${step === i + 1 ? 'font-medium text-gray-900' : 'text-gray-500'}`}>
                  {label}
                </span>
                {i < 2 && <div className="w-16 h-0.5 mx-4 bg-gray-200" />}
              </div>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
              <AlertCircle className="h-5 w-5 mr-2" />
              {error}
            </div>
          )}

          {/* Step 1: Property & Unit */}
          {step === 1 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Property *
                </label>
                <select
                  required
                  value={formData.propertyId}
                  onChange={(e) => setFormData({ ...formData, propertyId: e.target.value, unitId: '' })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">Select a property</option>
                  {properties.map((p: Property) => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {formData.propertyId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Unit *
                  </label>
                  {availableUnits.length === 0 ? (
                    <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                      No vacant units available in this property
                    </div>
                  ) : (
                    <select
                      required
                      value={formData.unitId}
                      onChange={(e) => setFormData({ ...formData, unitId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    >
                      <option value="">Select a unit</option>
                      {availableUnits.map((u) => (
                        <option key={u.id} value={u.id}>
                          Unit {u.unitNumber} - {u.type}
                          {u.marketRent && ` (${formatCurrency(u.marketRent)}/mo)`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}

              <div className="flex justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  disabled={!formData.propertyId || !formData.unitId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Tenant Selection */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Primary Tenant *
                </label>
                {tenantsLoading ? (
                  <div className="text-sm text-gray-500">Loading tenants...</div>
                ) : tenants.length === 0 ? (
                  <div className="text-sm text-yellow-600 bg-yellow-50 p-3 rounded-md">
                    No active tenants available. Please create a tenant first.
                  </div>
                ) : (
                  <select
                    required
                    value={formData.primaryTenantId}
                    onChange={(e) => setFormData({ ...formData, primaryTenantId: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="">Select a tenant</option>
                    {tenants.map((t: Tenant) => (
                      <option key={t.id} value={t.id}>
                        {t.firstName} {t.lastName} ({t.email})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="flex justify-between pt-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setStep(3)}
                  disabled={!formData.primaryTenantId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          )}

          {/* Step 3: Lease Terms */}
          {step === 3 && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Lease Type *
                  </label>
                  <select
                    required
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    <option value="FIXED_TERM">Fixed Term</option>
                    <option value="MONTH_TO_MONTH">Month to Month</option>
                    <option value="CORPORATE">Corporate</option>
                    <option value="STUDENT">Student</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Monthly Rent *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={formData.monthlyRent}
                    onChange={(e) => setFormData({ ...formData, monthlyRent: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Move-in Date
                  </label>
                  <input
                    type="date"
                    value={formData.moveInDate}
                    onChange={(e) => setFormData({ ...formData, moveInDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rent Due Day
                  </label>
                  <select
                    value={formData.rentDueDay}
                    onChange={(e) => setFormData({ ...formData, rentDueDay: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {[...Array(28)].map((_, i) => (
                      <option key={i + 1} value={i + 1}>{i + 1}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Grace Period (Days)
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={formData.gracePeriodDays}
                    onChange={(e) => setFormData({ ...formData, gracePeriodDays: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Security Deposit
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={formData.securityDeposit}
                    onChange={(e) => setFormData({ ...formData, securityDeposit: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="petsAllowed"
                    checked={formData.petsAllowed}
                    onChange={(e) => setFormData({ ...formData, petsAllowed: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="petsAllowed" className="ml-2 text-sm text-gray-700">
                    Pets Allowed
                  </label>
                </div>
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="smokingAllowed"
                    checked={formData.smokingAllowed}
                    onChange={(e) => setFormData({ ...formData, smokingAllowed: e.target.checked })}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                  />
                  <label htmlFor="smokingAllowed" className="ml-2 text-sm text-gray-700">
                    Smoking Allowed
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  placeholder="Any additional notes about this lease..."
                />
              </div>

              <div className="flex justify-between pt-4 border-t">
                <button
                  type="button"
                  onClick={() => setStep(2)}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
                >
                  Back
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  {isLoading && (
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  )}
                  Create Lease
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
