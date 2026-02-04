'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Package,
  Truck,
  Wrench,
  Settings,
  MapPin,
  Calendar,
  DollarSign,
  User,
  AlertCircle,
  Plus,
  Clock,
  CheckCircle,
  XCircle,
  RotateCcw,
  Camera,
  Image
} from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'

interface MaintenanceSchedule {
  id: string
  title: string
  description?: string
  type: 'ONE_TIME' | 'RECURRING'
  intervalDays?: number
  nextDueDate: string
  lastCompletedDate?: string
  isActive: boolean
}

interface MaintenanceRecord {
  id: string
  performedDate: string
  cost?: number
  description?: string
  notes?: string
  performedBy: {
    id: string
    firstName: string
    lastName: string
  }
  schedule?: {
    id: string
    title: string
  }
}

interface AssetRequest {
  id: string
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED'
  startDate?: string
  endDate?: string
  notes?: string
  createdAt: string
  requester: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  approvedBy?: {
    id: string
    firstName: string
    lastName: string
  }
  project?: {
    id: string
    title: string
  }
}

interface Asset {
  id: string
  name: string
  description?: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber?: string
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  currentLocation?: string
  purchaseCost?: number
  purchaseDate?: string
  warrantyExpiry?: string
  photos: string[]
  notes?: string
  createdAt: string
  currentAssignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  requests: AssetRequest[]
  maintenanceSchedules: MaintenanceSchedule[]
  maintenanceRecords: MaintenanceRecord[]
}

async function fetchAsset(id: string): Promise<Asset> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/assets/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch asset')
  return response.json()
}

const getAssetTypeIcon = (type: string) => {
  switch (type) {
    case 'VEHICLE': return <Truck className="h-6 w-6" />
    case 'EQUIPMENT': return <Settings className="h-6 w-6" />
    case 'TOOL': return <Wrench className="h-6 w-6" />
    default: return <Package className="h-6 w-6" />
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

const getStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string, text: string, label: string }> = {
    'AVAILABLE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
    'IN_USE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Use' },
    'UNDER_MAINTENANCE': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
    'RETIRED': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Retired' },
    'LOST_DAMAGED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost/Damaged' }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }

  return (
    <span className={`inline-flex px-3 py-1 text-sm font-semibold rounded-full ${config.bg} ${config.text}`}>
      {config.label}
    </span>
  )
}

const getRequestStatusBadge = (status: string) => {
  const statusConfig: Record<string, { bg: string, text: string, icon: any }> = {
    'PENDING': { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: Clock },
    'APPROVED': { bg: 'bg-green-100', text: 'text-green-800', icon: CheckCircle },
    'REJECTED': { bg: 'bg-red-100', text: 'text-red-800', icon: XCircle },
    'RETURNED': { bg: 'bg-gray-100', text: 'text-gray-800', icon: RotateCcw }
  }

  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', icon: Clock }
  const Icon = config.icon

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-semibold rounded-full ${config.bg} ${config.text}`}>
      <Icon className="h-3 w-3" />
      {status}
    </span>
  )
}

interface Project {
  id: string
  title: string
}

async function fetchProjects(): Promise<Project[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/project', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) return []
  const data = await response.json()
  return data.projects || []
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const assetId = params.id as string
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState('overview')
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [isMaintenanceModalOpen, setIsMaintenanceModalOpen] = useState(false)

  // Request form state
  const [requestForm, setRequestForm] = useState({
    purpose: '',
    projectId: '',
    startDate: new Date().toISOString().split('T')[0],
    endDate: '',
    notes: ''
  })

  const { data: asset, isLoading, error } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!assetId
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isRequestModalOpen
  })

  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof requestForm) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/assets/${assetId}/requests`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          purpose: data.purpose,
          projectId: data.projectId || undefined,
          startDate: data.startDate || undefined,
          endDate: data.endDate || undefined,
          notes: data.notes || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create request')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
      setIsRequestModalOpen(false)
      setRequestForm({
        purpose: '',
        projectId: '',
        startDate: new Date().toISOString().split('T')[0],
        endDate: '',
        notes: ''
      })
    }
  })

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/approve`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to approve request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    }
  })

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/reject`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
      })

      if (!response.ok) throw new Error('Failed to reject request')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    }
  })

  const returnMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/asset-requests/${requestId}/return`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ condition: 'GOOD' })
      })

      if (!response.ok) throw new Error('Failed to return asset')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    }
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !asset) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Asset Not Found</h2>
        <p className="text-gray-600 mb-4">The requested asset could not be found.</p>
        <Link
          href="/dashboard/assets"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Back to Assets
        </Link>
      </div>
    )
  }

  const pendingRequests = asset.requests.filter(r => r.status === 'PENDING')
  const upcomingMaintenance = asset.maintenanceSchedules.filter(s =>
    s.isActive && new Date(s.nextDueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={() => router.back()}
            className="text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="h-6 w-6" />
          </button>
          <div className="h-12 w-12 rounded-full bg-gray-100 flex items-center justify-center text-gray-600">
            {getAssetTypeIcon(asset.type)}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{asset.name}</h1>
            {asset.serialNumber && (
              <p className="text-gray-600">SN: {asset.serialNumber}</p>
            )}
          </div>
          {getStatusBadge(asset.status)}
        </div>
        <div className="flex space-x-2">
          <Link
            href={`/dashboard/assets/${assetId}/edit`}
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </Link>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2">
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Alerts */}
      {(pendingRequests.length > 0 || upcomingMaintenance.length > 0) && (
        <div className="space-y-3">
          {pendingRequests.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">
                {pendingRequests.length} pending request(s) waiting for approval
              </span>
            </div>
          )}
          {upcomingMaintenance.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
              <Settings className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800">
                {upcomingMaintenance.length} maintenance item(s) due within 7 days
              </span>
            </div>
          )}
        </div>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <DollarSign className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {asset.purchaseCost ? formatCurrency(asset.purchaseCost) : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Purchase Cost</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Calendar className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {asset.purchaseDate
                  ? new Date(asset.purchaseDate).toLocaleDateString()
                  : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Purchase Date</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Clock className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {asset.requests.length}
              </div>
              <div className="text-sm text-gray-500">Total Requests</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Settings className="h-8 w-8 text-orange-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {asset.maintenanceRecords.length}
              </div>
              <div className="text-sm text-gray-500">Maintenance Records</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'requests', label: `Requests (${asset.requests.length})` },
            { id: 'maintenance', label: 'Maintenance' },
            { id: 'photos', label: `Photos (${asset.photos?.length || 0})` }
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === tab.id
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Asset Information */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Information</h3>
            <div className="space-y-4">
              <div className="flex items-center space-x-3">
                <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                  {getAssetTypeLabel(asset.type)}
                </span>
              </div>
              {asset.description && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Description:</span>
                  <p className="text-gray-900 mt-1">{asset.description}</p>
                </div>
              )}
              {asset.currentLocation && (
                <div className="flex items-center space-x-3">
                  <MapPin className="h-5 w-5 text-gray-400" />
                  <span className="text-gray-900">{asset.currentLocation}</span>
                </div>
              )}
              {asset.currentAssignee && (
                <div className="flex items-center space-x-3">
                  <User className="h-5 w-5 text-gray-400" />
                  <div>
                    <span className="text-gray-900">
                      {asset.currentAssignee.firstName} {asset.currentAssignee.lastName}
                    </span>
                    <span className="text-sm text-gray-500 ml-2">
                      ({asset.currentAssignee.email})
                    </span>
                  </div>
                </div>
              )}
              {asset.warrantyExpiry && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Warranty Expires:</span>
                  <p className={`text-gray-900 mt-1 ${
                    new Date(asset.warrantyExpiry) < new Date() ? 'text-red-600' : ''
                  }`}>
                    {new Date(asset.warrantyExpiry).toLocaleDateString()}
                    {new Date(asset.warrantyExpiry) < new Date() && ' (Expired)'}
                  </p>
                </div>
              )}
              {asset.notes && (
                <div>
                  <span className="text-sm font-medium text-gray-500">Notes:</span>
                  <p className="text-gray-900 mt-1 whitespace-pre-wrap">{asset.notes}</p>
                </div>
              )}
            </div>
          </div>

          {/* Upcoming Maintenance */}
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Maintenance Schedule</h3>
              <button
                onClick={() => setIsMaintenanceModalOpen(true)}
                className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Schedule
              </button>
            </div>
            {asset.maintenanceSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No maintenance schedules set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {asset.maintenanceSchedules.map((schedule) => (
                  <div key={schedule.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{schedule.title}</p>
                        {schedule.description && (
                          <p className="text-sm text-gray-500">{schedule.description}</p>
                        )}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        schedule.type === 'RECURRING'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {schedule.type === 'RECURRING'
                          ? `Every ${schedule.intervalDays} days`
                          : 'One-time'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={`${
                        new Date(schedule.nextDueDate) <= new Date()
                          ? 'text-red-600 font-medium'
                          : 'text-gray-600'
                      }`}>
                        Due: {new Date(schedule.nextDueDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Asset Requests</h3>
            {asset.status === 'AVAILABLE' && (
              <button
                onClick={() => setIsRequestModalOpen(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>New Request</span>
              </button>
            )}
          </div>
          {asset.requests.length === 0 ? (
            <div className="p-12 text-center">
              <Clock className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No requests yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Requester
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Purpose
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asset.requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {request.requester.firstName} {request.requester.lastName}
                        </div>
                        <div className="text-sm text-gray-500">{request.requester.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-sm text-gray-900">{request.purpose}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {request.project?.title || '-'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getRequestStatusBadge(request.status)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(request.createdAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <button
                              onClick={() => approveMutation.mutate(request.id)}
                              disabled={approveMutation.isPending}
                              className="text-green-600 hover:text-green-900"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => rejectMutation.mutate(request.id)}
                              disabled={rejectMutation.isPending}
                              className="text-red-600 hover:text-red-900"
                            >
                              Reject
                            </button>
                          </div>
                        )}
                        {request.status === 'APPROVED' && (
                          <button
                            onClick={() => returnMutation.mutate(request.id)}
                            disabled={returnMutation.isPending}
                            className="text-primary-600 hover:text-primary-900"
                          >
                            Mark Returned
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'maintenance' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Maintenance History</h3>
            </div>
            {asset.maintenanceRecords.length === 0 ? (
              <div className="p-12 text-center">
                <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
                <p className="text-gray-500">No maintenance records yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Schedule
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cost
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Performed By
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {asset.maintenanceRecords.map((record) => (
                      <tr key={record.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(record.performedDate).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm text-gray-900">{record.description}</div>
                          {record.notes && (
                            <div className="text-sm text-gray-500">{record.notes}</div>
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.schedule?.title || 'Ad-hoc'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {record.cost ? formatCurrency(record.cost) : '-'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {record.performedBy.firstName} {record.performedBy.lastName}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'photos' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-lg font-medium text-gray-900">Asset Photos</h3>
            <button
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Camera className="h-4 w-4" />
              <span>Upload Photo</span>
            </button>
          </div>
          {(!asset.photos || asset.photos.length === 0) ? (
            <div className="text-center py-12">
              <Image className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No photos uploaded yet</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {asset.photos.map((photo, index) => (
                <div key={index} className="relative group aspect-square">
                  <img
                    src={photo}
                    alt={`${asset.name} photo ${index + 1}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                  <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all rounded-lg flex items-center justify-center">
                    <button className="opacity-0 group-hover:opacity-100 bg-red-600 text-white p-2 rounded-full">
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* New Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Request Asset</h3>
              <button
                onClick={() => setIsRequestModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createRequestMutation.mutate(requestForm)
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Purpose <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={requestForm.purpose}
                  onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })}
                  placeholder="Describe how you'll use this asset..."
                  rows={3}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project (Optional)
                </label>
                <select
                  value={requestForm.projectId}
                  onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No project</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <input
                    type="date"
                    value={requestForm.startDate}
                    onChange={(e) => setRequestForm({ ...requestForm, startDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <input
                    type="date"
                    value={requestForm.endDate}
                    onChange={(e) => setRequestForm({ ...requestForm, endDate: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={requestForm.notes}
                  onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })}
                  placeholder="Any additional notes..."
                  rows={2}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {createRequestMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  {createRequestMutation.error.message}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsRequestModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createRequestMutation.isPending || !requestForm.purpose}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {createRequestMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Submitting...</span>
                    </>
                  ) : (
                    <span>Submit Request</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
