'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  FileText,
  Building2,
  Home,
  User,
  Calendar,
  DollarSign,
  Mail,
  Phone,
  Edit,
  Trash2,
  Check,
  X,
  AlertCircle,
  Clock,
  CheckCircle,
  Shield,
  PawPrint,
  Cigarette
} from 'lucide-react'
import { format, differenceInDays } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'

interface LeaseDetail {
  id: string
  leaseNumber?: string
  type: string
  status: string
  startDate: string
  endDate: string
  moveInDate?: string
  moveOutDate?: string
  monthlyRent: number
  rentDueDay: number
  gracePeriodDays: number
  lateFeeType: string
  lateFeeAmount?: number
  lateFeePercent?: number
  securityDeposit: number
  petDeposit?: number
  otherDeposits?: any
  petsAllowed: boolean
  petRent?: number
  smokingAllowed: boolean
  maxOccupants?: number
  renewalStatus?: string
  notes?: string
  specialTerms?: string
  signedAt?: string
  signedByTenant: boolean
  signedByLandlord: boolean
  createdAt: string
  updatedAt: string
  property: {
    id: string
    name: string
    address: string
    city: string
    state: string
    zipCode: string
  }
  unit: {
    id: string
    unitNumber: string
    type: string
    bedrooms?: number
    bathrooms?: number
    sqft?: number
  }
  primaryTenant: {
    id: string
    firstName: string
    lastName: string
    email: string
    phone: string
    status: string
  }
  tenants: Array<{
    tenant: {
      id: string
      firstName: string
      lastName: string
      email: string
      phone: string
    }
  }>
  charges: Array<{
    id: string
    name: string
    amount: number
    frequency: string
    isActive: boolean
    startDate?: string
    endDate?: string
  }>
}

async function fetchLease(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/leases/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch lease')
  return response.json()
}

async function updateLease(id: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/leases/${id}`, {
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
    throw new Error(error.error || 'Failed to update lease')
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

export default function LeaseDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState<'overview' | 'charges' | 'documents'>('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)

  const { data: lease, isLoading, error } = useQuery({
    queryKey: ['lease', id],
    queryFn: () => fetchLease(id)
  })

  const updateMutation = useMutation({
    mutationFn: (data: any) => updateLease(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lease', id] })
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      setShowStatusModal(false)
    }
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteLease(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['leases'] })
      router.push('/dashboard/leases')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !lease) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
        <p className="font-medium">Error loading lease</p>
        <p className="text-sm">{error?.message || 'Lease not found'}</p>
        <Link href="/dashboard/leases" className="text-sm underline mt-2 inline-block">
          Back to leases
        </Link>
      </div>
    )
  }

  const daysLeft = differenceInDays(new Date(lease.endDate), new Date())
  const isExpiringSoon = lease.status === 'ACTIVE' && daysLeft >= 0 && daysLeft <= 60
  const totalMonthlyCharges = lease.charges.filter((c: any) => c.isActive && c.frequency === 'MONTHLY')
    .reduce((sum: number, c: any) => sum + c.amount, 0)
  const totalMonthly = lease.monthlyRent + totalMonthlyCharges + (lease.petRent || 0)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/leases"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <div className="flex items-center space-x-3">
              <h1 className="text-2xl font-bold text-gray-900">
                {lease.leaseNumber || 'Draft Lease'}
              </h1>
              <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(lease.status)}`}>
                {getStatusLabel(lease.status)}
              </span>
            </div>
            <p className="text-sm text-gray-500">
              {getTypeLabel(lease.type)} • Created {format(new Date(lease.createdAt), 'MMMM d, yyyy')}
            </p>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          {lease.status === 'DRAFT' && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 flex items-center space-x-2"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Activate</span>
            </button>
          )}
          {lease.status === 'ACTIVE' && (
            <button
              onClick={() => setShowStatusModal(true)}
              className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 flex items-center space-x-2"
            >
              <Edit className="h-4 w-4" />
              <span>Change Status</span>
            </button>
          )}
          {lease.status === 'DRAFT' && (
            showDeleteConfirm ? (
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => deleteMutation.mutate()}
                  disabled={deleteMutation.isPending}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                >
                  <Check className="h-4 w-4" />
                  <span>Confirm</span>
                </button>
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="px-4 py-2 border border-red-300 text-red-600 rounded-md hover:bg-red-50 flex items-center space-x-2"
              >
                <Trash2 className="h-4 w-4" />
                <span>Delete</span>
              </button>
            )
          )}
        </div>
      </div>

      {/* Errors */}
      {(deleteMutation.error || updateMutation.error) && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {deleteMutation.error?.message || updateMutation.error?.message}
        </div>
      )}

      {/* Expiring Soon Warning */}
      {isExpiringSoon && (
        <div className="bg-yellow-50 border border-yellow-200 text-yellow-800 px-4 py-3 rounded-md flex items-center">
          <Clock className="h-5 w-5 mr-2" />
          This lease expires in {daysLeft} days ({format(new Date(lease.endDate), 'MMMM d, yyyy')})
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Property</p>
              <Link
                href={`/dashboard/properties/${lease.property.id}`}
                className="font-semibold text-gray-900 hover:text-primary-600"
              >
                {lease.property.name}
              </Link>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Unit</p>
              <p className="font-semibold text-gray-900">
                Unit {lease.unit.unitNumber}
                {lease.unit.bedrooms && ` • ${lease.unit.bedrooms} BR`}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Monthly Total</p>
              <p className="font-semibold text-gray-900">{formatCurrency(totalMonthly)}</p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Lease Term</p>
              <p className="font-semibold text-gray-900">
                {format(new Date(lease.startDate), 'MMM yyyy')} - {format(new Date(lease.endDate), 'MMM yyyy')}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'charges', 'documents'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              className={`py-4 px-1 border-b-2 font-medium text-sm capitalize ${
                activeTab === tab
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Primary Tenant */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Primary Tenant</h2>
            <div className="space-y-4">
              <div className="flex items-center space-x-4">
                <div className="h-12 w-12 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-semibold">
                    {lease.primaryTenant.firstName[0]}{lease.primaryTenant.lastName[0]}
                  </span>
                </div>
                <div>
                  <Link
                    href={`/dashboard/tenants/${lease.primaryTenant.id}`}
                    className="font-medium text-gray-900 hover:text-primary-600"
                  >
                    {lease.primaryTenant.firstName} {lease.primaryTenant.lastName}
                  </Link>
                  <p className="text-sm text-gray-500">{lease.primaryTenant.status}</p>
                </div>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Mail className="h-4 w-4 mr-2 text-gray-400" />
                <a href={`mailto:${lease.primaryTenant.email}`} className="hover:text-primary-600">
                  {lease.primaryTenant.email}
                </a>
              </div>
              <div className="flex items-center text-sm text-gray-600">
                <Phone className="h-4 w-4 mr-2 text-gray-400" />
                <a href={`tel:${lease.primaryTenant.phone}`} className="hover:text-primary-600">
                  {lease.primaryTenant.phone}
                </a>
              </div>
              {lease.tenants.length > 1 && (
                <div className="pt-4 border-t">
                  <p className="text-sm font-medium text-gray-700 mb-2">Additional Tenants</p>
                  {lease.tenants.filter((t: any) => t.tenant.id !== lease.primaryTenant.id).map((t: any) => (
                    <Link
                      key={t.tenant.id}
                      href={`/dashboard/tenants/${t.tenant.id}`}
                      className="text-sm text-gray-600 hover:text-primary-600 block"
                    >
                      {t.tenant.firstName} {t.tenant.lastName}
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lease Terms */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Lease Terms</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Lease Type</span>
                <span className="text-gray-900 font-medium">{getTypeLabel(lease.type)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Start Date</span>
                <span className="text-gray-900">{format(new Date(lease.startDate), 'MMMM d, yyyy')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">End Date</span>
                <span className="text-gray-900">{format(new Date(lease.endDate), 'MMMM d, yyyy')}</span>
              </div>
              {lease.moveInDate && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Move-in Date</span>
                  <span className="text-gray-900">{format(new Date(lease.moveInDate), 'MMMM d, yyyy')}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Rent Due Day</span>
                <span className="text-gray-900">{lease.rentDueDay} of each month</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Grace Period</span>
                <span className="text-gray-900">{lease.gracePeriodDays} days</span>
              </div>
            </div>
          </div>

          {/* Financial */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Financial</h2>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Monthly Rent</span>
                <span className="text-gray-900 font-medium">{formatCurrency(lease.monthlyRent)}</span>
              </div>
              {totalMonthlyCharges > 0 && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Monthly Charges</span>
                  <span className="text-gray-900">+{formatCurrency(totalMonthlyCharges)}</span>
                </div>
              )}
              {lease.petRent && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pet Rent</span>
                  <span className="text-gray-900">+{formatCurrency(lease.petRent)}</span>
                </div>
              )}
              <div className="flex justify-between pt-2 border-t font-medium">
                <span className="text-gray-900">Total Monthly</span>
                <span className="text-gray-900">{formatCurrency(totalMonthly)}</span>
              </div>
              <div className="flex justify-between pt-3 border-t">
                <span className="text-gray-600">Security Deposit</span>
                <span className="text-gray-900">{formatCurrency(lease.securityDeposit)}</span>
              </div>
              {lease.petDeposit && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Pet Deposit</span>
                  <span className="text-gray-900">{formatCurrency(lease.petDeposit)}</span>
                </div>
              )}
              {lease.lateFeeAmount && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Late Fee</span>
                  <span className="text-gray-900">
                    {lease.lateFeeType === 'FLAT' ? formatCurrency(lease.lateFeeAmount) : `${lease.lateFeePercent}%`}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Rules & Terms */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Rules & Terms</h2>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <PawPrint className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Pets</span>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  lease.petsAllowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {lease.petsAllowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Cigarette className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Smoking</span>
                </div>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  lease.smokingAllowed ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>
                  {lease.smokingAllowed ? 'Allowed' : 'Not Allowed'}
                </span>
              </div>
              {lease.maxOccupants && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Max Occupants</span>
                  <span className="text-gray-900">{lease.maxOccupants}</span>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Shield className="h-4 w-4 mr-2 text-gray-400" />
                  <span className="text-gray-600">Signed</span>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    lease.signedByTenant ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    Tenant {lease.signedByTenant ? '✓' : '-'}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    lease.signedByLandlord ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                  }`}>
                    Landlord {lease.signedByLandlord ? '✓' : '-'}
                  </span>
                </div>
              </div>
            </div>
            {lease.notes && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-sm text-gray-500 mb-1">Notes</p>
                <p className="text-sm text-gray-700">{lease.notes}</p>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'charges' && (
        <div className="bg-white rounded-lg shadow border">
          <div className="px-6 py-4 border-b">
            <h3 className="text-lg font-semibold text-gray-900">Recurring Charges</h3>
          </div>
          {lease.charges.length === 0 ? (
            <div className="p-6 text-center text-gray-500">
              No additional charges configured
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {lease.charges.map((charge: any) => (
                <div key={charge.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{charge.name}</p>
                      <p className="text-sm text-gray-500">
                        {charge.frequency}
                        {charge.startDate && ` • Starts ${format(new Date(charge.startDate), 'MMM d, yyyy')}`}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">{formatCurrency(charge.amount)}</p>
                      <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                        charge.isActive ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                      }`}>
                        {charge.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="text-center text-gray-500 py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium">Document Management</p>
            <p className="text-sm">Lease documents and attachments coming soon</p>
          </div>
        </div>
      )}

      {/* Status Change Modal */}
      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Change Lease Status</h2>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-sm text-gray-600">
                Select the new status for this lease. Status changes may affect the unit&apos;s availability.
              </p>
              <div className="space-y-2">
                {lease.status === 'DRAFT' && (
                  <button
                    onClick={() => updateMutation.mutate({ status: 'ACTIVE' })}
                    disabled={updateMutation.isPending}
                    className="w-full p-3 text-left border rounded-md hover:bg-green-50 hover:border-green-300"
                  >
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="h-5 w-5 text-green-600" />
                      <div>
                        <p className="font-medium text-gray-900">Activate Lease</p>
                        <p className="text-sm text-gray-500">Mark as active and occupy the unit</p>
                      </div>
                    </div>
                  </button>
                )}
                {lease.status === 'ACTIVE' && (
                  <>
                    <button
                      onClick={() => updateMutation.mutate({ status: 'EXPIRED' })}
                      disabled={updateMutation.isPending}
                      className="w-full p-3 text-left border rounded-md hover:bg-orange-50 hover:border-orange-300"
                    >
                      <div className="flex items-center space-x-3">
                        <Clock className="h-5 w-5 text-orange-600" />
                        <div>
                          <p className="font-medium text-gray-900">Mark as Expired</p>
                          <p className="text-sm text-gray-500">Lease term has ended</p>
                        </div>
                      </div>
                    </button>
                    <button
                      onClick={() => updateMutation.mutate({ status: 'TERMINATED' })}
                      disabled={updateMutation.isPending}
                      className="w-full p-3 text-left border rounded-md hover:bg-red-50 hover:border-red-300"
                    >
                      <div className="flex items-center space-x-3">
                        <X className="h-5 w-5 text-red-600" />
                        <div>
                          <p className="font-medium text-gray-900">Terminate Lease</p>
                          <p className="text-sm text-gray-500">Early termination of lease</p>
                        </div>
                      </div>
                    </button>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
