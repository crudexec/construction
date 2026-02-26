'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  Calendar,
  Briefcase,
  DollarSign,
  FileText,
  Home,
  Edit,
  Trash2,
  AlertCircle,
  Check,
  X,
  Shield
} from 'lucide-react'
import { format } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'

interface TenantDetail {
  id: string
  firstName: string
  lastName: string
  email: string
  phone: string
  alternatePhone?: string
  dateOfBirth?: string
  idType?: string
  idNumber?: string
  employer?: string
  jobTitle?: string
  monthlyIncome?: number
  employerPhone?: string
  emergencyName?: string
  emergencyPhone?: string
  emergencyRelation?: string
  portalEnabled: boolean
  lastLogin?: string
  status: string
  notes?: string
  createdAt: string
  updatedAt: string
  leases: Array<{
    id: string
    leaseNumber?: string
    type: string
    status: string
    startDate: string
    endDate: string
    monthlyRent: number
    property: { id: string; name: string; address: string }
    unit: { id: string; unitNumber: string; type: string }
    charges: Array<{
      id: string
      name: string
      amount: number
      frequency: string
    }>
  }>
  references: Array<{
    id: string
    name: string
    relationship: string
    phone?: string
    email?: string
    notes?: string
    createdAt: string
  }>
  applications: Array<{
    id: string
    status: string
    createdAt: string
    property: { id: string; name: string }
    unit?: { id: string; unitNumber: string }
  }>
  _count: { leases: number }
}

async function fetchTenant(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/tenants/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tenant')
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

const getLeaseStatusColor = (status: string) => {
  switch (status) {
    case 'ACTIVE': return 'bg-green-100 text-green-800'
    case 'DRAFT': return 'bg-gray-100 text-gray-800'
    case 'PENDING_SIGNATURE': return 'bg-yellow-100 text-yellow-800'
    case 'EXPIRED': return 'bg-orange-100 text-orange-800'
    case 'RENEWED': return 'bg-blue-100 text-blue-800'
    case 'TERMINATED': return 'bg-red-100 text-red-800'
    default: return 'bg-gray-100 text-gray-800'
  }
}

export default function TenantDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState<'overview' | 'leases' | 'documents'>('overview')
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => fetchTenant(id)
  })

  const deleteMutation = useMutation({
    mutationFn: () => deleteTenant(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tenants'] })
      router.push('/dashboard/tenants')
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !tenant) {
    return (
      <div className="bg-red-50 border border-red-200 text-red-700 px-6 py-4 rounded-md">
        <p className="font-medium">Error loading tenant</p>
        <p className="text-sm">{error?.message || 'Tenant not found'}</p>
        <Link href="/dashboard/tenants" className="text-sm underline mt-2 inline-block">
          Back to tenants
        </Link>
      </div>
    )
  }

  const activeLease = tenant.leases.find((l: any) => l.status === 'ACTIVE')
  const totalMonthlyRent = activeLease
    ? activeLease.monthlyRent + activeLease.charges.reduce((sum: number, c: any) => sum + c.amount, 0)
    : 0

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <Link
            href="/dashboard/tenants"
            className="p-2 hover:bg-gray-100 rounded-md transition-colors"
          >
            <ArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div className="flex items-center space-x-4">
            <div className="h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
              <span className="text-primary-700 font-bold text-2xl">
                {tenant.firstName[0]}{tenant.lastName[0]}
              </span>
            </div>
            <div>
              <div className="flex items-center space-x-3">
                <h1 className="text-2xl font-bold text-gray-900">
                  {tenant.firstName} {tenant.lastName}
                </h1>
                <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${getStatusColor(tenant.status)}`}>
                  {tenant.status}
                </span>
              </div>
              <p className="text-sm text-gray-500">
                Tenant since {format(new Date(tenant.createdAt), 'MMMM yyyy')}
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center space-x-3">
          <Link
            href={`/dashboard/tenants/${id}/edit`}
            className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          {showDeleteConfirm ? (
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
          )}
        </div>
      </div>

      {/* Delete Error */}
      {deleteMutation.error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md flex items-center">
          <AlertCircle className="h-5 w-5 mr-2" />
          {deleteMutation.error.message}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Home className="h-8 w-8 text-primary-600" />
            <div>
              <p className="text-sm text-gray-500">Current Property</p>
              {activeLease ? (
                <Link
                  href={`/dashboard/properties/${activeLease.property.id}`}
                  className="font-semibold text-gray-900 hover:text-primary-600"
                >
                  {activeLease.property.name}
                </Link>
              ) : (
                <p className="font-semibold text-gray-400">No active lease</p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Building2 className="h-8 w-8 text-blue-600" />
            <div>
              <p className="text-sm text-gray-500">Unit</p>
              {activeLease ? (
                <p className="font-semibold text-gray-900">
                  Unit {activeLease.unit.unitNumber}
                </p>
              ) : (
                <p className="font-semibold text-gray-400">-</p>
              )}
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div>
              <p className="text-sm text-gray-500">Monthly Rent</p>
              <p className="font-semibold text-gray-900">
                {activeLease ? formatCurrency(totalMonthlyRent) : '-'}
              </p>
            </div>
          </div>
        </div>
        <div className="bg-white p-4 rounded-lg shadow border">
          <div className="flex items-center space-x-3">
            <Calendar className="h-8 w-8 text-purple-600" />
            <div>
              <p className="text-sm text-gray-500">Lease Ends</p>
              {activeLease ? (
                <p className="font-semibold text-gray-900">
                  {format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                </p>
              ) : (
                <p className="font-semibold text-gray-400">-</p>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['overview', 'leases', 'documents'].map((tab) => (
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
          {/* Contact Information */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Contact Information</h2>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <Mail className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Email</p>
                  <a href={`mailto:${tenant.email}`} className="text-gray-900 hover:text-primary-600">
                    {tenant.email}
                  </a>
                </div>
              </div>
              <div className="flex items-start space-x-3">
                <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                <div>
                  <p className="text-sm text-gray-500">Phone</p>
                  <a href={`tel:${tenant.phone}`} className="text-gray-900 hover:text-primary-600">
                    {tenant.phone}
                  </a>
                  {tenant.alternatePhone && (
                    <p className="text-sm text-gray-500">
                      Alt: {tenant.alternatePhone}
                    </p>
                  )}
                </div>
              </div>
              {tenant.dateOfBirth && (
                <div className="flex items-start space-x-3">
                  <Calendar className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Date of Birth</p>
                    <p className="text-gray-900">
                      {format(new Date(tenant.dateOfBirth), 'MMMM d, yyyy')}
                    </p>
                  </div>
                </div>
              )}
              {tenant.idType && (
                <div className="flex items-start space-x-3">
                  <Shield className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">ID</p>
                    <p className="text-gray-900">
                      {tenant.idType}: {tenant.idNumber}
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Employment Information */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Employment</h2>
            {tenant.employer ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <Briefcase className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Employer</p>
                    <p className="text-gray-900">{tenant.employer}</p>
                    {tenant.jobTitle && (
                      <p className="text-sm text-gray-600">{tenant.jobTitle}</p>
                    )}
                  </div>
                </div>
                {tenant.monthlyIncome && (
                  <div className="flex items-start space-x-3">
                    <DollarSign className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Monthly Income</p>
                      <p className="text-gray-900">{formatCurrency(tenant.monthlyIncome)}</p>
                    </div>
                  </div>
                )}
                {tenant.employerPhone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Employer Phone</p>
                      <p className="text-gray-900">{tenant.employerPhone}</p>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No employment information provided</p>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Emergency Contact</h2>
            {tenant.emergencyName ? (
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <User className="h-5 w-5 text-gray-400 mt-0.5" />
                  <div>
                    <p className="text-sm text-gray-500">Name</p>
                    <p className="text-gray-900">{tenant.emergencyName}</p>
                    {tenant.emergencyRelation && (
                      <p className="text-sm text-gray-600">{tenant.emergencyRelation}</p>
                    )}
                  </div>
                </div>
                {tenant.emergencyPhone && (
                  <div className="flex items-start space-x-3">
                    <Phone className="h-5 w-5 text-gray-400 mt-0.5" />
                    <div>
                      <p className="text-sm text-gray-500">Phone</p>
                      <a href={`tel:${tenant.emergencyPhone}`} className="text-gray-900 hover:text-primary-600">
                        {tenant.emergencyPhone}
                      </a>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <p className="text-gray-400">No emergency contact provided</p>
            )}
          </div>

          {/* Portal Access */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Portal Access</h2>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-600">Portal Enabled</span>
                <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                  tenant.portalEnabled ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                }`}>
                  {tenant.portalEnabled ? 'Yes' : 'No'}
                </span>
              </div>
              {tenant.lastLogin && (
                <div className="flex items-center justify-between">
                  <span className="text-gray-600">Last Login</span>
                  <span className="text-gray-900">
                    {format(new Date(tenant.lastLogin), 'MMM d, yyyy h:mm a')}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'leases' && (
        <div className="space-y-6">
          {/* Active Lease */}
          {activeLease && (
            <div className="bg-white rounded-lg shadow border">
              <div className="px-6 py-4 border-b bg-green-50">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-green-800">Active Lease</h3>
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                    ACTIVE
                  </span>
                </div>
              </div>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <p className="text-sm text-gray-500">Property</p>
                    <Link
                      href={`/dashboard/properties/${activeLease.property.id}`}
                      className="font-medium text-gray-900 hover:text-primary-600"
                    >
                      {activeLease.property.name}
                    </Link>
                    <p className="text-sm text-gray-600">Unit {activeLease.unit.unitNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Lease Term</p>
                    <p className="font-medium text-gray-900">
                      {format(new Date(activeLease.startDate), 'MMM d, yyyy')} - {format(new Date(activeLease.endDate), 'MMM d, yyyy')}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Monthly Rent</p>
                    <p className="font-medium text-gray-900">{formatCurrency(activeLease.monthlyRent)}</p>
                    {activeLease.charges.length > 0 && (
                      <p className="text-sm text-gray-600">
                        + {formatCurrency(activeLease.charges.reduce((sum: number, c: any) => sum + c.amount, 0))} in charges
                      </p>
                    )}
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t">
                  <Link
                    href={`/dashboard/leases/${activeLease.id}`}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    View Lease Details
                  </Link>
                </div>
              </div>
            </div>
          )}

          {/* Lease History */}
          <div className="bg-white rounded-lg shadow border">
            <div className="px-6 py-4 border-b">
              <h3 className="text-lg font-semibold text-gray-900">Lease History</h3>
            </div>
            {tenant.leases.length === 0 ? (
              <div className="p-6 text-center text-gray-500">
                No lease history
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {tenant.leases.map((lease: any) => (
                  <div key={lease.id} className="p-4 hover:bg-gray-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="flex items-center space-x-2">
                          <Link
                            href={`/dashboard/leases/${lease.id}`}
                            className="font-medium text-gray-900 hover:text-primary-600"
                          >
                            {lease.leaseNumber || `Lease at ${lease.property.name}`}
                          </Link>
                          <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${getLeaseStatusColor(lease.status)}`}>
                            {lease.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">
                          {lease.property.name} - Unit {lease.unit.unitNumber}
                        </p>
                        <p className="text-sm text-gray-500">
                          {format(new Date(lease.startDate), 'MMM d, yyyy')} - {format(new Date(lease.endDate), 'MMM d, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-gray-900">{formatCurrency(lease.monthlyRent)}/mo</p>
                        <p className="text-sm text-gray-500">{lease.type.replace('_', ' ')}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'documents' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="text-center text-gray-500 py-12">
            <FileText className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <p className="text-lg font-medium">Document Management</p>
            <p className="text-sm">Document storage coming soon</p>
          </div>
        </div>
      )}
    </div>
  )
}
