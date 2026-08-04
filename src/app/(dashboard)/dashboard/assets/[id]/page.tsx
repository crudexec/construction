'use client'

import { useEffect, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Save,
  X,
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
  QrCode
} from 'lucide-react'
import Link from 'next/link'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { useAuthStore } from '@/store/auth'
import { useModal } from '@/components/ui/modal-provider'
import toast from 'react-hot-toast'
import { AssetRentalPricingTab } from '@/components/assets/asset-rental-pricing-tab'
import { AssetMeterReadingsTab } from '@/components/assets/asset-meter-readings-tab'
import { AssetAssignmentsTab } from '@/components/assets/asset-assignments-tab'
import { AssetMaintenanceTab } from '@/components/assets/asset-maintenance-tab'
import { AssetAttachmentsTab } from '@/components/assets/asset-attachments-tab'
import { AssetIssuesTab } from '@/components/assets/asset-issues-tab'
import { AssetQrShareModal } from '@/components/assets/asset-qr-share-modal'

interface AssetRequest {
  id: string
  purpose: string
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'RETURNED'
  startDate?: string
  endDate?: string
  notes?: string
  createdAt: string
  requester: { id: string; firstName: string; lastName: string; email: string }
  approvedBy?: { id: string; firstName: string; lastName: string }
  rejectedBy?: { id: string; firstName: string; lastName: string }
  project?: { id: string; title: string }
}

interface CustomFieldValue {
  id: string
  value: string | null
  definition: {
    id: string
    name: string
    fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
    selectOptions: string[]
  }
}

interface Attachment {
  id: string
  category: 'PHOTO' | 'DOCUMENT'
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  createdAt: string
}

interface Asset {
  id: string
  name: string
  description?: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber?: string
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  statusDefinitionId?: string | null
  statusDefinition?: AssetStatusDefinition | null
  customStatusNote?: string | null
  currentLocation?: string
  make?: string | null
  model?: string | null
  year?: number | null
  vin?: string | null
  licensePlate?: string | null
  purchaseCost?: number
  purchaseDate?: string
  warrantyExpiry?: string
  purchasedFromVendorId?: string | null
  poNumber?: string | null
  invoiceNumber?: string | null
  financingType?: 'CASH' | 'FINANCED' | 'LEASED' | null
  financedAmount?: number | null
  lender?: string | null
  loanTermMonths?: number | null
  depreciationMethod?: string | null
  usefulLifeYears?: number | null
  salvageValue?: number | null
  notes?: string
  createdAt: string
  shareToken?: string | null
  isShareable?: boolean
  currentAssignee?: { id: string; firstName: string; lastName: string; email: string }
  purchasedFromVendor?: { id: string; name: string; companyName: string } | null
  attachments: Attachment[]
  customFieldValues: CustomFieldValue[]
  requests: AssetRequest[]
  maintenanceSchedules: any[]
  maintenanceRecords: any[]
  _count?: { issues: number }
}

interface Project {
  id: string
  title: string
}

interface VendorOption {
  id: string
  name: string
  companyName: string
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

interface CustomFieldDefinition {
  id: string
  name: string
  fieldType: 'TEXT' | 'NUMBER' | 'DATE' | 'BOOLEAN' | 'SELECT'
  selectOptions: string[]
  isActive: boolean
}

interface AssetStatusDefinition {
  id: string
  name: string
  baseStatus: Asset['status']
  color?: string | null
  isActive: boolean
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchAsset(id: string): Promise<Asset> {
  const response = await fetch(`/api/assets/${id}`, {
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Cookie': document.cookie }
  })
  if (!response.ok) throw new Error('Failed to fetch asset')
  return response.json()
}

async function fetchProjects(): Promise<Project[]> {
  const response = await fetch('/api/project', {
    headers: { 'Authorization': `Bearer ${getToken()}`, 'Cookie': document.cookie }
  })
  if (!response.ok) return []
  const data = await response.json()
  return Array.isArray(data) ? data : data.projects || []
}

async function fetchVendors(): Promise<VendorOption[]> {
  const response = await fetch('/api/vendors', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchUsers(): Promise<UserOption[]> {
  const response = await fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchCustomFieldDefinitions(): Promise<CustomFieldDefinition[]> {
  const response = await fetch('/api/asset-custom-fields', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

async function fetchAssetStatuses(): Promise<AssetStatusDefinition[]> {
  const response = await fetch('/api/asset-statuses', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

const getAssetTypeIcon = (type: string) => {
  switch (type) {
    case 'VEHICLE': return <Truck className="h-4 w-4" />
    case 'EQUIPMENT': return <Settings className="h-4 w-4" />
    case 'TOOL': return <Wrench className="h-4 w-4" />
    default: return <Package className="h-4 w-4" />
  }
}

const getStatusBadge = (status: string, customStatus?: AssetStatusDefinition | null) => {
  const statusConfig: Record<string, { bg: string, text: string, label: string }> = {
    'AVAILABLE': { bg: 'bg-green-100', text: 'text-green-800', label: 'Available' },
    'IN_USE': { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Use' },
    'UNDER_MAINTENANCE': { bg: 'bg-yellow-100', text: 'text-yellow-800', label: 'Maintenance' },
    'RETIRED': { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Retired' },
    'LOST_DAMAGED': { bg: 'bg-red-100', text: 'text-red-800', label: 'Lost/Damaged' }
  }
  const config = statusConfig[status] || { bg: 'bg-gray-100', text: 'text-gray-800', label: status }
  return (
    <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${config.bg} ${config.text}`}>
      {customStatus?.name || config.label}
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

const emptyEditForm = {
  name: '', description: '', type: 'EQUIPMENT' as Asset['type'], serialNumber: '',
  status: 'AVAILABLE' as Asset['status'], statusDefinitionId: '', customStatusNote: '', currentLocation: '',
  currentAssigneeId: '', make: '', model: '', year: '', vin: '', licensePlate: '',
  purchaseCost: '', purchaseDate: '', warrantyExpiry: '', purchasedFromVendorId: '',
  poNumber: '', invoiceNumber: '', financingType: '' as '' | Asset['financingType'],
  financedAmount: '', lender: '', loanTermMonths: '', depreciationMethod: '',
  usefulLifeYears: '', salvageValue: '', notes: ''
}

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const { showConfirm } = useModal()
  const assetId = params.id as string
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState('overview')

  useEffect(() => {
    if (typeof window === 'undefined') return
    const tab = new URLSearchParams(window.location.search).get('tab')
    if (tab) setActiveTab(tab)
  }, [])
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState(emptyEditForm)
  const [customFieldEdits, setCustomFieldEdits] = useState<Record<string, string>>({})
  const [isRequestModalOpen, setIsRequestModalOpen] = useState(false)
  const [showQrModal, setShowQrModal] = useState(false)

  const [requestForm, setRequestForm] = useState({
    purpose: '', projectId: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: ''
  })

  const isAdmin = currentUser?.role === 'ADMIN'

  const { data: asset, isLoading, error, refetch } = useQuery({
    queryKey: ['asset', assetId],
    queryFn: () => fetchAsset(assetId),
    enabled: !!assetId
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
    enabled: isRequestModalOpen
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors,
    enabled: isEditing
  })

  const { data: users = [] } = useQuery({
    queryKey: ['company-users'],
    queryFn: fetchUsers,
    enabled: isEditing
  })

  const { data: customFieldDefinitions = [] } = useQuery({
    queryKey: ['asset-custom-fields'],
    queryFn: fetchCustomFieldDefinitions
  })

  const { data: assetStatuses = [] } = useQuery({
    queryKey: ['asset-statuses'],
    queryFn: fetchAssetStatuses,
    enabled: isEditing
  })

  useEffect(() => {
    if (!asset) return
    setEditForm({
      name: asset.name || '',
      description: asset.description || '',
      type: asset.type,
      serialNumber: asset.serialNumber || '',
      status: asset.status,
      statusDefinitionId: asset.statusDefinitionId || '',
      customStatusNote: asset.customStatusNote || '',
      currentLocation: asset.currentLocation || '',
      currentAssigneeId: asset.currentAssignee?.id || '',
      make: asset.make || '',
      model: asset.model || '',
      year: asset.year ? String(asset.year) : '',
      vin: asset.vin || '',
      licensePlate: asset.licensePlate || '',
      purchaseCost: asset.purchaseCost != null ? String(asset.purchaseCost) : '',
      purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
      warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
      purchasedFromVendorId: asset.purchasedFromVendorId || '',
      poNumber: asset.poNumber || '',
      invoiceNumber: asset.invoiceNumber || '',
      financingType: asset.financingType || '',
      financedAmount: asset.financedAmount != null ? String(asset.financedAmount) : '',
      lender: asset.lender || '',
      loanTermMonths: asset.loanTermMonths != null ? String(asset.loanTermMonths) : '',
      depreciationMethod: asset.depreciationMethod || '',
      usefulLifeYears: asset.usefulLifeYears != null ? String(asset.usefulLifeYears) : '',
      salvageValue: asset.salvageValue != null ? String(asset.salvageValue) : '',
      notes: asset.notes || ''
    })

    const values: Record<string, string> = {}
    for (const cfv of asset.customFieldValues) {
      values[cfv.definition.id] = cfv.value || ''
    }
    setCustomFieldEdits(values)
  }, [asset])

  const updateMutation = useMutation({
    mutationFn: async () => {
      const patchBody: Record<string, unknown> = {
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        serialNumber: editForm.serialNumber,
        status: editForm.status,
        statusDefinitionId: editForm.statusDefinitionId || null,
        customStatusNote: editForm.customStatusNote,
        currentLocation: editForm.currentLocation,
        currentAssigneeId: editForm.currentAssigneeId || null,
        make: editForm.make,
        model: editForm.model,
        year: editForm.year || null,
        vin: editForm.vin,
        licensePlate: editForm.licensePlate,
        purchaseCost: editForm.purchaseCost ? parseFloat(editForm.purchaseCost) : null,
        purchaseDate: editForm.purchaseDate || null,
        warrantyExpiry: editForm.warrantyExpiry || null,
        purchasedFromVendorId: editForm.purchasedFromVendorId || null,
        poNumber: editForm.poNumber,
        invoiceNumber: editForm.invoiceNumber,
        financingType: editForm.financingType || null,
        financedAmount: editForm.financedAmount ? parseFloat(editForm.financedAmount) : null,
        lender: editForm.lender,
        loanTermMonths: editForm.loanTermMonths || null,
        depreciationMethod: editForm.depreciationMethod,
        usefulLifeYears: editForm.usefulLifeYears || null,
        salvageValue: editForm.salvageValue ? parseFloat(editForm.salvageValue) : null,
        notes: editForm.notes
      }

      const assetResponse = await fetch(`/api/assets/${assetId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(patchBody)
      })
      if (!assetResponse.ok) {
        const err = await assetResponse.json()
        throw new Error(err.error || 'Failed to update asset')
      }

      if (Object.keys(customFieldEdits).length > 0) {
        const cfResponse = await fetch(`/api/assets/${assetId}/custom-field-values`, {
          method: 'PUT',
          headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ values: customFieldEdits })
        })
        if (!cfResponse.ok) {
          const err = await cfResponse.json()
          throw new Error(err.error || 'Failed to update custom fields')
        }
      }

      return assetResponse.json()
    },
    onSuccess: () => {
      toast.success('Asset updated')
      refetch()
      setIsEditing(false)
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch(`/api/assets/${assetId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!response.ok) {
        const err = await response.json()
        throw new Error(err.error || 'Failed to delete asset')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('Asset deleted')
      router.push('/dashboard/assets')
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const createRequestMutation = useMutation({
    mutationFn: async (data: typeof requestForm) => {
      const response = await fetch(`/api/assets/${assetId}/requests`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
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
      setRequestForm({ purpose: '', projectId: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: '' })
    }
  })

  const approveMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/asset-requests/${requestId}/approve`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' }
      })
      if (!response.ok) throw new Error('Failed to approve request')
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
  })

  const rejectMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/asset-requests/${requestId}/reject`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({})
      })
      if (!response.ok) throw new Error('Failed to reject request')
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
  })

  const returnMutation = useMutation({
    mutationFn: async (requestId: string) => {
      const response = await fetch(`/api/asset-requests/${requestId}/return`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ condition: 'GOOD' })
      })
      if (!response.ok) throw new Error('Failed to return asset')
      return response.json()
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
  })

  const handleCancelEdit = () => {
    setIsEditing(false)
    if (asset) {
      // Re-trigger the effect by forcing a state reset via refetch data already held
      setEditForm({
        name: asset.name || '', description: asset.description || '', type: asset.type,
        serialNumber: asset.serialNumber || '', status: asset.status, statusDefinitionId: asset.statusDefinitionId || '', customStatusNote: asset.customStatusNote || '',
        currentLocation: asset.currentLocation || '', currentAssigneeId: asset.currentAssignee?.id || '',
        make: asset.make || '', model: asset.model || '', year: asset.year ? String(asset.year) : '',
        vin: asset.vin || '', licensePlate: asset.licensePlate || '',
        purchaseCost: asset.purchaseCost != null ? String(asset.purchaseCost) : '',
        purchaseDate: asset.purchaseDate ? asset.purchaseDate.split('T')[0] : '',
        warrantyExpiry: asset.warrantyExpiry ? asset.warrantyExpiry.split('T')[0] : '',
        purchasedFromVendorId: asset.purchasedFromVendorId || '', poNumber: asset.poNumber || '',
        invoiceNumber: asset.invoiceNumber || '', financingType: asset.financingType || '',
        financedAmount: asset.financedAmount != null ? String(asset.financedAmount) : '',
        lender: asset.lender || '', loanTermMonths: asset.loanTermMonths != null ? String(asset.loanTermMonths) : '',
        depreciationMethod: asset.depreciationMethod || '',
        usefulLifeYears: asset.usefulLifeYears != null ? String(asset.usefulLifeYears) : '',
        salvageValue: asset.salvageValue != null ? String(asset.salvageValue) : '', notes: asset.notes || ''
      })
    }
  }

  const handleDelete = async () => {
    const confirmed = await showConfirm(
      'Are you sure you want to delete this asset? This action cannot be undone.',
      'Delete Asset'
    )
    if (confirmed) {
      deleteMutation.mutate()
    }
  }

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
        <Link href="/dashboard/assets" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">
          Back to Assets
        </Link>
      </div>
    )
  }

  const pendingRequests = asset.requests.filter(r => r.status === 'PENDING')
  const upcomingMaintenance = asset.maintenanceSchedules.filter((s: any) =>
    s.isActive && new Date(s.nextDueDate) <= new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
  )

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'rental', label: 'Rental Pricing' },
    { id: 'meter', label: 'Meter Reads' },
    { id: 'assignments', label: 'Assignments' },
    { id: 'requests', label: `Requests (${asset.requests.length})` },
    { id: 'maintenance', label: 'Maintenance & Service' },
    { id: 'issues', label: asset._count?.issues ? `Issues (${asset._count.issues})` : 'Issues' },
    { id: 'attachments', label: 'Photos & Documents' }
  ]

  return (
    <div className="space-y-3">
      <div className="bg-white border rounded-lg px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => router.back()} className="text-gray-500 hover:text-gray-700 p-1">
              <ArrowLeft className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded bg-gray-100 flex items-center justify-center text-gray-600">
              {getAssetTypeIcon(asset.type)}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-semibold text-gray-900">{asset.name}</h1>
                {getStatusBadge(asset.status, asset.statusDefinition)}
              </div>
              <p className="text-xs text-gray-500">
                {[asset.make, asset.model, asset.year].filter(Boolean).join(' ') || asset.type}
                {asset.serialNumber ? ` | SN: ${asset.serialNumber}` : ''}
              </p>
            </div>
            <div className="hidden md:flex items-center gap-4 ml-6 pl-6 border-l border-gray-200">
              <div className="flex items-center gap-1.5 text-sm">
                <DollarSign className="h-4 w-4 text-green-500" />
                <span className="font-medium">{asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '-'}</span>
                <span className="text-gray-400 text-xs">cost</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Clock className="h-4 w-4 text-purple-500" />
                <span className="font-medium">{asset.requests.length}</span>
                <span className="text-gray-400 text-xs">requests</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <Settings className="h-4 w-4 text-orange-500" />
                <span className="font-medium">{asset.maintenanceRecords.length}</span>
                <span className="text-gray-400 text-xs">service</span>
              </div>
              <div className="flex items-center gap-1.5 text-sm">
                <AlertCircle className="h-4 w-4 text-red-500" />
                <span className="font-medium">{asset._count?.issues || 0}</span>
                <span className="text-gray-400 text-xs">issues</span>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
          {isEditing ? (
            <>
              <button onClick={handleCancelEdit} className="text-gray-600 hover:text-gray-900 px-2 py-1 text-sm flex items-center gap-1 hover:bg-gray-100 rounded">
                <X className="h-3.5 w-3.5" />
                <span>Cancel</span>
              </button>
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="text-primary-700 hover:text-primary-900 px-2 py-1 text-sm flex items-center gap-1 hover:bg-primary-50 rounded disabled:opacity-50"
              >
                <Save className="h-3.5 w-3.5" />
                <span>{updateMutation.isPending ? 'Saving...' : 'Save Changes'}</span>
              </button>
            </>
          ) : (
            <>
              <button onClick={() => setShowQrModal(true)} className="text-gray-600 hover:text-gray-900 px-2 py-1 text-sm flex items-center gap-1 hover:bg-gray-100 rounded">
                <QrCode className="h-3.5 w-3.5" />
                <span>QR Code</span>
              </button>
              <button onClick={() => setIsEditing(true)} className="text-gray-600 hover:text-gray-900 px-2 py-1 text-sm flex items-center gap-1 hover:bg-gray-100 rounded">
                <Edit className="h-3.5 w-3.5" />
                <span>Edit</span>
              </button>
              {isAdmin && (
                <button
                  onClick={handleDelete}
                  disabled={deleteMutation.isPending}
                  className="text-red-600 hover:text-red-700 px-2 py-1 text-sm flex items-center gap-1 hover:bg-red-50 rounded disabled:opacity-50"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  <span>Delete</span>
                </button>
              )}
            </>
          )}
          </div>
        </div>
      </div>

      {/* Alerts */}
      {(pendingRequests.length > 0 || upcomingMaintenance.length > 0) && (
        <div className="space-y-3">
          {pendingRequests.length > 0 && (
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 flex items-center gap-3">
              <AlertCircle className="h-5 w-5 text-yellow-600" />
              <span className="text-yellow-800">{pendingRequests.length} pending request(s) waiting for approval</span>
            </div>
          )}
          {upcomingMaintenance.length > 0 && (
            <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 flex items-center gap-3">
              <Settings className="h-5 w-5 text-orange-600" />
              <span className="text-orange-800">{upcomingMaintenance.length} maintenance item(s) due within 7 days</span>
            </div>
          )}
        </div>
      )}

      <div className="border-b border-gray-200 bg-white rounded-t-lg px-2">
        <nav className="-mb-px flex space-x-1 overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`py-1.5 px-3 text-xs font-medium whitespace-nowrap ${
                activeTab === tab.id
                  ? 'border-b-2 border-primary-500 text-primary-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {/* Overview */}
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">Asset Information</h3>
            {isEditing ? (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                    <input type="text" value={editForm.name} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Type *</label>
                    <select value={editForm.type} onChange={(e) => setEditForm({ ...editForm, type: e.target.value as Asset['type'] })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                      <option value="VEHICLE">Vehicle</option>
                      <option value="EQUIPMENT">Equipment</option>
                      <option value="TOOL">Tool</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Make</label>
                    <input type="text" value={editForm.make} onChange={(e) => setEditForm({ ...editForm, make: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Model</label>
                    <input type="text" value={editForm.model} onChange={(e) => setEditForm({ ...editForm, model: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Year</label>
                    <input type="number" value={editForm.year} onChange={(e) => setEditForm({ ...editForm, year: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">VIN</label>
                    <input type="text" value={editForm.vin} onChange={(e) => setEditForm({ ...editForm, vin: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">License Plate</label>
                    <input type="text" value={editForm.licensePlate} onChange={(e) => setEditForm({ ...editForm, licensePlate: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Serial Number</label>
                  <input type="text" value={editForm.serialNumber} onChange={(e) => setEditForm({ ...editForm, serialNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Base Status *</label>
                    <select
                      value={editForm.status}
                      onChange={(e) => setEditForm({ ...editForm, status: e.target.value as Asset['status'], statusDefinitionId: '' })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2"
                    >
                      <option value="AVAILABLE">Available</option>
                      <option value="IN_USE">In Use</option>
                      <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                      <option value="RETIRED">Retired</option>
                      <option value="LOST_DAMAGED">Lost/Damaged</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                    <input type="text" value={editForm.currentLocation} onChange={(e) => setEditForm({ ...editForm, currentLocation: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Custom Status</label>
                  <select
                    value={editForm.statusDefinitionId}
                    onChange={(e) => {
                      const selected = assetStatuses.find((status) => status.id === e.target.value)
                      setEditForm({
                        ...editForm,
                        statusDefinitionId: e.target.value,
                        ...(selected && { status: selected.baseStatus })
                      })
                    }}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  >
                    <option value="">No custom status</option>
                    {assetStatuses.map((status) => (
                      <option key={status.id} value={status.id}>
                        {status.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Status Note <span className="text-gray-400 font-normal">(optional)</span></label>
                  <input type="text" value={editForm.customStatusNote} onChange={(e) => setEditForm({ ...editForm, customStatusNote: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="Extra detail alongside the status above" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <select value={editForm.currentAssigneeId} onChange={(e) => setEditForm({ ...editForm, currentAssigneeId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">Unassigned</option>
                    {users.map((u: UserOption) => (
                      <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                  <textarea value={editForm.notes} onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>

                {customFieldDefinitions.filter(f => f.isActive).length > 0 && (
                  <div className="border-t pt-4 space-y-4">
                    <h4 className="text-sm font-semibold text-gray-700">Custom Fields</h4>
                    {customFieldDefinitions.filter(f => f.isActive).map((field) => (
                      <div key={field.id}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{field.name}</label>
                        {field.fieldType === 'SELECT' ? (
                          <select value={customFieldEdits[field.id] || ''} onChange={(e) => setCustomFieldEdits({ ...customFieldEdits, [field.id]: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="">—</option>
                            {field.selectOptions.map((opt) => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : field.fieldType === 'BOOLEAN' ? (
                          <select value={customFieldEdits[field.id] || ''} onChange={(e) => setCustomFieldEdits({ ...customFieldEdits, [field.id]: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                            <option value="">—</option>
                            <option value="true">Yes</option>
                            <option value="false">No</option>
                          </select>
                        ) : (
                          <input
                            type={field.fieldType === 'NUMBER' ? 'number' : field.fieldType === 'DATE' ? 'date' : 'text'}
                            value={customFieldEdits[field.id] || ''}
                            onChange={(e) => setCustomFieldEdits({ ...customFieldEdits, [field.id]: e.target.value })}
                            className="w-full border border-gray-300 rounded-md px-3 py-2"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center space-x-3">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">{asset.type}</span>
                  {asset.customStatusNote && <span className="text-xs text-gray-500">{asset.customStatusNote}</span>}
                </div>
                {(asset.make || asset.model || asset.year) && (
                  <p className="text-gray-900">{[asset.make, asset.model, asset.year].filter(Boolean).join(' ')}</p>
                )}
                {(asset.vin || asset.licensePlate) && (
                  <p className="text-sm text-gray-500">{asset.vin ? `VIN: ${asset.vin}` : ''}{asset.vin && asset.licensePlate ? ' · ' : ''}{asset.licensePlate ? `Plate: ${asset.licensePlate}` : ''}</p>
                )}
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
                      <span className="text-gray-900">{asset.currentAssignee.firstName} {asset.currentAssignee.lastName}</span>
                      <span className="text-sm text-gray-500 ml-2">({asset.currentAssignee.email})</span>
                    </div>
                  </div>
                )}
                {asset.warrantyExpiry && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Warranty Expires:</span>
                    <p className={`text-gray-900 mt-1 ${new Date(asset.warrantyExpiry) < new Date() ? 'text-red-600' : ''}`}>
                      {new Date(asset.warrantyExpiry).toLocaleDateString()}{new Date(asset.warrantyExpiry) < new Date() && ' (Expired)'}
                    </p>
                  </div>
                )}
                {asset.notes && (
                  <div>
                    <span className="text-sm font-medium text-gray-500">Notes:</span>
                    <p className="text-gray-900 mt-1 whitespace-pre-wrap">{asset.notes}</p>
                  </div>
                )}
                {asset.customFieldValues.length > 0 && (
                  <div className="border-t pt-4 space-y-2">
                    <h4 className="text-sm font-semibold text-gray-700">Custom Fields</h4>
                    {asset.customFieldValues.filter(v => v.value).map((cfv) => (
                      <div key={cfv.id} className="flex justify-between text-sm">
                        <span className="text-gray-500">{cfv.definition.name}</span>
                        <span className="text-gray-900">{cfv.definition.fieldType === 'BOOLEAN' ? (cfv.value === 'true' ? 'Yes' : 'No') : cfv.value}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-medium text-gray-900">Maintenance Schedule</h3>
              <button onClick={() => setActiveTab('maintenance')} className="text-primary-600 hover:text-primary-800 text-sm font-medium flex items-center gap-1">
                <Plus className="h-4 w-4" />
                Manage
              </button>
            </div>
            {asset.maintenanceSchedules.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Settings className="h-12 w-12 mx-auto text-gray-300 mb-2" />
                <p>No maintenance schedules set</p>
              </div>
            ) : (
              <div className="space-y-3">
                {asset.maintenanceSchedules.map((schedule: any) => (
                  <div key={schedule.id} className="border rounded-lg p-3">
                    <div className="flex justify-between items-start">
                      <div>
                        <p className="font-medium text-gray-900">{schedule.title}</p>
                        {schedule.description && <p className="text-sm text-gray-500">{schedule.description}</p>}
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${schedule.type === 'RECURRING' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {schedule.type === 'RECURRING' ? `Every ${schedule.intervalDays} days` : 'One-time'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm">
                      <span className={`${new Date(schedule.nextDueDate) <= new Date() ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
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

      {/* Purchase */}
      {activeTab === 'purchase' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <h3 className="text-lg font-medium text-gray-900 mb-4">Purchase Information</h3>
          {isEditing ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Cost</label>
                <input type="number" step="0.01" value={editForm.purchaseCost} onChange={(e) => setEditForm({ ...editForm, purchaseCost: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchase Date</label>
                <DatePicker value={editForm.purchaseDate} onChange={(date) => setEditForm({ ...editForm, purchaseDate: date })} placeholder="Select date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Warranty Expiry</label>
                <DatePicker value={editForm.warrantyExpiry} onChange={(date) => setEditForm({ ...editForm, warrantyExpiry: date })} placeholder="Select date" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purchased From (Vendor)</label>
                <select value={editForm.purchasedFromVendorId} onChange={(e) => setEditForm({ ...editForm, purchasedFromVendorId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">—</option>
                  {vendors.map((v: VendorOption) => <option key={v.id} value={v.id}>{v.companyName}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">PO Number</label>
                <input type="text" value={editForm.poNumber} onChange={(e) => setEditForm({ ...editForm, poNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Invoice Number</label>
                <input type="text" value={editForm.invoiceNumber} onChange={(e) => setEditForm({ ...editForm, invoiceNumber: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financing Type</label>
                <select value={editForm.financingType || ''} onChange={(e) => setEditForm({ ...editForm, financingType: e.target.value as Asset['financingType'] })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">—</option>
                  <option value="CASH">Cash</option>
                  <option value="FINANCED">Financed</option>
                  <option value="LEASED">Leased</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Financed Amount</label>
                <input type="number" step="0.01" value={editForm.financedAmount} onChange={(e) => setEditForm({ ...editForm, financedAmount: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Lender</label>
                <input type="text" value={editForm.lender} onChange={(e) => setEditForm({ ...editForm, lender: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loan Term (months)</label>
                <input type="number" value={editForm.loanTermMonths} onChange={(e) => setEditForm({ ...editForm, loanTermMonths: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Depreciation Method</label>
                <input type="text" value={editForm.depreciationMethod} onChange={(e) => setEditForm({ ...editForm, depreciationMethod: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="e.g., Straight-line" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Useful Life (years)</label>
                <input type="number" value={editForm.usefulLifeYears} onChange={(e) => setEditForm({ ...editForm, usefulLifeYears: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Salvage Value</label>
                <input type="number" step="0.01" value={editForm.salvageValue} onChange={(e) => setEditForm({ ...editForm, salvageValue: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-3 text-sm">
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Purchase Cost</span><span className="text-gray-900">{asset.purchaseCost ? formatCurrency(asset.purchaseCost) : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Purchase Date</span><span className="text-gray-900">{asset.purchaseDate ? new Date(asset.purchaseDate).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Warranty Expiry</span><span className="text-gray-900">{asset.warrantyExpiry ? new Date(asset.warrantyExpiry).toLocaleDateString() : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Purchased From</span><span className="text-gray-900">{asset.purchasedFromVendor?.companyName || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">PO Number</span><span className="text-gray-900">{asset.poNumber || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Invoice Number</span><span className="text-gray-900">{asset.invoiceNumber || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Financing</span><span className="text-gray-900">{asset.financingType || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Financed Amount</span><span className="text-gray-900">{asset.financedAmount != null ? formatCurrency(asset.financedAmount) : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Lender</span><span className="text-gray-900">{asset.lender || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Loan Term</span><span className="text-gray-900">{asset.loanTermMonths ? `${asset.loanTermMonths} months` : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Depreciation Method</span><span className="text-gray-900">{asset.depreciationMethod || '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Useful Life</span><span className="text-gray-900">{asset.usefulLifeYears ? `${asset.usefulLifeYears} years` : '—'}</span></div>
              <div className="flex justify-between border-b border-gray-100 py-2"><span className="text-gray-500">Salvage Value</span><span className="text-gray-900">{asset.salvageValue != null ? formatCurrency(asset.salvageValue) : '—'}</span></div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'rental' && <AssetRentalPricingTab assetId={assetId} />}
      {activeTab === 'meter' && <AssetMeterReadingsTab assetId={assetId} />}
      {activeTab === 'assignments' && <AssetAssignmentsTab assetId={assetId} />}
      {activeTab === 'maintenance' && <AssetMaintenanceTab assetId={assetId} />}
      {activeTab === 'issues' && <AssetIssuesTab assetId={assetId} />}
      {activeTab === 'attachments' && <AssetAttachmentsTab assetId={assetId} attachments={asset.attachments} />}

      {activeTab === 'requests' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Asset Requests</h3>
            {asset.status === 'AVAILABLE' && (
              <button onClick={() => setIsRequestModalOpen(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2">
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
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Requester</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Purpose</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Project</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {asset.requests.map((request) => (
                    <tr key={request.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{request.requester.firstName} {request.requester.lastName}</div>
                        <div className="text-sm text-gray-500">{request.requester.email}</div>
                      </td>
                      <td className="px-6 py-4"><div className="text-sm text-gray-900">{request.purpose}</div></td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{request.project?.title || '-'}</td>
                      <td className="px-6 py-4 whitespace-nowrap">{getRequestStatusBadge(request.status)}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(request.createdAt).toLocaleDateString()}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        {request.status === 'PENDING' && (
                          <div className="flex space-x-2">
                            <button onClick={() => approveMutation.mutate(request.id)} disabled={approveMutation.isPending} className="text-green-600 hover:text-green-900">Approve</button>
                            <button onClick={() => rejectMutation.mutate(request.id)} disabled={rejectMutation.isPending} className="text-red-600 hover:text-red-900">Reject</button>
                          </div>
                        )}
                        {request.status === 'APPROVED' && (
                          <button onClick={() => returnMutation.mutate(request.id)} disabled={returnMutation.isPending} className="text-primary-600 hover:text-primary-900">Mark Returned</button>
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

      {/* New Request Modal */}
      {isRequestModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Request Asset</h3>
              <button onClick={() => setIsRequestModalOpen(false)} className="text-gray-400 hover:text-gray-500">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createRequestMutation.mutate(requestForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Purpose <span className="text-red-500">*</span></label>
                <textarea value={requestForm.purpose} onChange={(e) => setRequestForm({ ...requestForm, purpose: e.target.value })} placeholder="Describe how you'll use this asset..." rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" required />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Project (Optional)</label>
                <select value={requestForm.projectId} onChange={(e) => setRequestForm({ ...requestForm, projectId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="">No project</option>
                  {projects.map((project) => <option key={project.id} value={project.id}>{project.title}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <DatePicker value={requestForm.startDate} onChange={(date) => setRequestForm({ ...requestForm, startDate: date })} placeholder="Select start date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <DatePicker value={requestForm.endDate} onChange={(date) => setRequestForm({ ...requestForm, endDate: date })} placeholder="Select end date" />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={requestForm.notes} onChange={(e) => setRequestForm({ ...requestForm, notes: e.target.value })} placeholder="Any additional notes..." rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              {createRequestMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">{createRequestMutation.error.message}</div>
              )}
              <div className="flex justify-end space-x-3 pt-4">
                <button type="button" onClick={() => setIsRequestModalOpen(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createRequestMutation.isPending || !requestForm.purpose} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2">
                  {createRequestMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Submitting...</span>
                    </>
                  ) : <span>Submit Request</span>}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showQrModal && (
        <AssetQrShareModal
          assetId={assetId}
          assetName={asset.name}
          isShareable={!!asset.isShareable}
          shareToken={asset.shareToken || null}
          onClose={() => setShowQrModal(false)}
        />
      )}
    </div>
  )
}
