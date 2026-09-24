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
import { AssetPersonAssignmentsTab } from '@/components/assets/asset-person-assignments-tab'
import { AssetMaintenanceTab } from '@/components/assets/asset-maintenance-tab'
import { AssetAttachmentsTab } from '@/components/assets/asset-attachments-tab'
import { AssetIssuesTab } from '@/components/assets/asset-issues-tab'
import { AssetHistoryTab } from '@/components/assets/asset-history-tab'
import { AssetFieldLayoutControl, useAssetFieldLayout } from '@/components/assets/asset-field-layout'
import { AssetProfileFields, AssetProfileOverview } from '@/components/assets/asset-profile-fields'
import { emptyAssetProfile } from '@/lib/assets/field-layout'
import { AssetQrShareModal } from '@/components/assets/asset-qr-share-modal'
import { AssetOverviewTiles } from '@/components/assets/asset-overview-tiles'
import { locationValue, locationFields } from '@/components/assets/asset-context-fields'

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
  equipmentId?: string | null
  category?: string | null
  name: string
  description?: string
  type: 'VEHICLE' | 'EQUIPMENT' | 'TOOL'
  serialNumber?: string
  status: 'AVAILABLE' | 'IN_USE' | 'UNDER_MAINTENANCE' | 'RETIRED' | 'LOST_DAMAGED'
  statusDefinitionId?: string | null
  statusDefinition?: AssetStatusDefinition | null
  customStatusNote?: string | null
  currentLocation?: string
  currentProjectId?: string | null
  currentYardId?: string | null
  currentProject?: { id: string; title: string } | null
  currentYard?: { id: string; name: string } | null
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

const emptyEditForm = emptyAssetProfile()

export default function AssetDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { user: currentUser } = useAuthStore()
  const { showConfirm } = useModal()
  const assetId = params.id as string
  const { format: formatCurrency } = useCurrency()
  const [activeTab, setActiveTab] = useState('overview')
  const [openMeterForm, setOpenMeterForm] = useState(false)

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
  const [showCustomFieldModal, setShowCustomFieldModal] = useState(false)
  const [showStatusModal, setShowStatusModal] = useState(false)
  const [customFieldForm, setCustomFieldForm] = useState({
    name: '',
    fieldType: 'TEXT' as CustomFieldDefinition['fieldType'],
    selectOptions: ''
  })
  const [statusForm, setStatusForm] = useState({
    name: '',
    baseStatus: 'AVAILABLE' as Asset['status'],
    color: '#2563eb'
  })

  const [requestForm, setRequestForm] = useState({
    purpose: '', projectId: '', startDate: new Date().toISOString().split('T')[0], endDate: '', notes: ''
  })

  const isAdmin = currentUser?.role === 'ADMIN'
  const fieldLayout = useAssetFieldLayout()

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

  const { data: assetStatuses = [] } = useQuery({
    queryKey: ['asset-statuses'],
    queryFn: fetchAssetStatuses,
    enabled: isEditing
  })

  const createCustomFieldMutation = useMutation({
    mutationFn: async (data: typeof customFieldForm) => {
      const selectOptions = data.selectOptions
        .split(/[\n,]/)
        .map((option) => option.trim())
        .filter(Boolean)

      const response = await fetch('/api/asset-custom-fields', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: data.name,
          fieldType: data.fieldType,
          selectOptions: data.fieldType === 'SELECT' ? selectOptions : undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create custom field')
      return result as CustomFieldDefinition
    },
    onSuccess: (definition) => {
      toast.success('Custom field created')
      queryClient.invalidateQueries({ queryKey: ['asset-custom-fields'] })
      queryClient.invalidateQueries({ queryKey: ['asset-field-layout'] })
      setCustomFieldEdits((prev) => ({ ...prev, [definition.id]: '' }))
      setShowCustomFieldModal(false)
      setCustomFieldForm({ name: '', fieldType: 'TEXT', selectOptions: '' })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  const createStatusMutation = useMutation({
    mutationFn: async (data: typeof statusForm) => {
      const response = await fetch('/api/asset-statuses', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}`, 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create custom status')
      return result as AssetStatusDefinition
    },
    onSuccess: (status) => {
      toast.success('Custom status created')
      queryClient.invalidateQueries({ queryKey: ['asset-statuses'] })
      setEditForm((prev) => ({ ...prev, statusDefinitionId: status.id, status: status.baseStatus }))
      setShowStatusModal(false)
      setStatusForm({ name: '', baseStatus: 'AVAILABLE', color: '#2563eb' })
    },
    onError: (err: Error) => toast.error(err.message)
  })

  useEffect(() => {
    if (!asset) return
    setEditForm({
      locationSelection: locationValue(asset),
      equipmentId: asset.equipmentId || '',
      category: asset.category || '',
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
      if (!editForm.name.trim()) throw new Error('Asset name is required')
      if (!fieldLayout.data || fieldLayout.isError) throw new Error('Reload the field layout before saving')
      const patchBody: Record<string, unknown> = {
        equipmentId: editForm.equipmentId.trim() || null,
        category: editForm.category.trim() || null,
        name: editForm.name,
        description: editForm.description,
        type: editForm.type,
        serialNumber: editForm.serialNumber,
        status: editForm.status,
        statusDefinitionId: editForm.statusDefinitionId || null,
        customStatusNote: editForm.customStatusNote,
        ...locationFields(editForm.locationSelection),
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
      queryClient.invalidateQueries({ queryKey: ['assets'] })
      queryClient.invalidateQueries({ queryKey: ['asset-categories'] })
      queryClient.invalidateQueries({ queryKey: ['asset-job-assignments', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset-person-assignments', assetId] })
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
        locationSelection: locationValue(asset),
        equipmentId: asset.equipmentId || '', category: asset.category || '',
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
    { id: 'history', label: 'History' },
    { id: 'purchase', label: 'Purchase' },
    { id: 'rental', label: 'Rental Pricing' },
    { id: 'meter', label: 'Meter Reads' },
    { id: 'assignments', label: 'Locations' },
    { id: 'people', label: 'Assignments' },
    { id: 'requests', label: `Requests (${asset.requests.length})` },
    { id: 'maintenance', label: 'Maintenance & Service' },
    { id: 'issues', label: asset._count?.issues ? `Issues (${asset._count.issues})` : 'Issues' },
    { id: 'attachments', label: 'Photos & Documents' }
  ]
  const profileFormProps = {
    values: editForm,
    onChange: (patch: Partial<typeof editForm>) => setEditForm(prev => ({ ...prev, ...patch })),
    customValues: customFieldEdits,
    onCustomChange: (id: string, value: string) => setCustomFieldEdits(prev => ({ ...prev, [id]: value })),
    layout: fieldLayout.data || { order: [], version: 0, customFields: [] },
    statuses: assetStatuses,
    currentStatus: asset.statusDefinition,
    currentLocation: asset.currentLocation,
    currentPerson: asset.currentAssignee ? asset.currentAssignee.firstName + ' ' + asset.currentAssignee.lastName : null,
    onNewStatus: isAdmin ? () => setShowStatusModal(true) : undefined,
  }
  const profileSummary = {
    equipmentId: asset.equipmentId || 'Not assigned', name: asset.name, type: asset.type, category: asset.category,
    status: getStatusBadge(asset.status, asset.statusDefinition), customStatusNote: asset.customStatusNote,
    serialNumber: asset.serialNumber, make: asset.make, model: asset.model, year: asset.year, vin: asset.vin,
    licensePlate: asset.licensePlate, description: asset.description,
    locationSelection: asset.currentProject?.title || asset.currentYard?.name || asset.currentLocation,
    currentAssigneeId: asset.currentAssignee ? <><span>{asset.currentAssignee.firstName} {asset.currentAssignee.lastName}</span><span className="text-sm text-gray-500 ml-2">({asset.currentAssignee.email})</span></> : null,
    purchaseCost: asset.purchaseCost != null ? formatCurrency(asset.purchaseCost) : null,
    purchaseDate: asset.purchaseDate?.split('T')[0],
    warrantyExpiry: asset.warrantyExpiry ? <span className={new Date(asset.warrantyExpiry) < new Date() ? 'text-red-600' : ''}>{asset.warrantyExpiry.split('T')[0]}{new Date(asset.warrantyExpiry) < new Date() && ' (Expired)'}</span> : null,
    purchasedFromVendorId: asset.purchasedFromVendor?.companyName || asset.purchasedFromVendor?.name,
    poNumber: asset.poNumber, invoiceNumber: asset.invoiceNumber, financingType: asset.financingType,
    financedAmount: asset.financedAmount != null ? formatCurrency(asset.financedAmount) : null,
    lender: asset.lender, loanTermMonths: asset.loanTermMonths != null ? asset.loanTermMonths + ' months' : null, depreciationMethod: asset.depreciationMethod,
    usefulLifeYears: asset.usefulLifeYears != null ? asset.usefulLifeYears + ' years' : null, salvageValue: asset.salvageValue != null ? formatCurrency(asset.salvageValue) : null,
    notes: asset.notes,
  }

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
                <h1 className="text-lg font-semibold text-gray-900">{asset.equipmentId ? `${asset.equipmentId} · ${asset.name}` : asset.name}</h1>
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
                disabled={updateMutation.isPending || !fieldLayout.data || fieldLayout.isError}
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
              onClick={() => { setOpenMeterForm(false); setActiveTab(tab.id) }}
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
          <AssetOverviewTiles
            assetId={assetId}
            openIssueCount={asset._count?.issues || 0}
            onViewIssues={() => setActiveTab('issues')}
            onViewReadings={() => { setOpenMeterForm(false); setActiveTab('meter') }}
            onAddReading={() => { setOpenMeterForm(true); setActiveTab('meter') }}
          />
          <section className="bg-white rounded-lg shadow border p-6" aria-label="Asset information">
            <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
              <h3 className="text-lg font-medium text-gray-900">Asset Information</h3>
              <AssetFieldLayoutControl />
            </div>
            {fieldLayout.isError && <p role="alert" className="text-sm text-red-700 mb-3">Unable to refresh field layout. Showing the last available order; saving is unavailable until retry succeeds. <button type="button" className="underline" onClick={() => fieldLayout.refetch()}>Retry layout</button></p>}
            {isEditing ? <>
              {fieldLayout.data && <AssetProfileFields {...profileFormProps} />}
              {fieldLayout.isPending && <p role="status">Loading field layout…</p>}
              {isAdmin && <button type="button" onClick={() => setShowCustomFieldModal(true)} className="mt-4 text-sm font-medium text-primary-600">Add Custom Field</button>}
            </> : <AssetProfileOverview layout={fieldLayout.data || { order: [], version: 0, customFields: [] }} values={profileSummary} customValues={asset.customFieldValues} />}
          </section>

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
        <section className="bg-white rounded-lg shadow border p-6">
          <div className="flex justify-between gap-3 mb-4"><h3 className="text-lg font-medium text-gray-900">Purchase Information</h3><AssetFieldLayoutControl /></div>
          {fieldLayout.isError && <p role="alert" className="text-red-700 mb-3">Unable to load field layout. <button type="button" onClick={() => fieldLayout.refetch()} className="underline">Retry layout</button></p>}
          {isEditing ? fieldLayout.data && <AssetProfileFields {...profileFormProps} purchaseOnly /> : <AssetProfileOverview layout={fieldLayout.data || { order: [], version: 0, customFields: [] }} values={profileSummary} customValues={[]} purchaseOnly />}
        </section>
      )}

      {activeTab === 'rental' && <AssetRentalPricingTab assetId={assetId} />}
      {activeTab === 'history' && <AssetHistoryTab assetId={assetId} />}
      {activeTab === 'meter' && <AssetMeterReadingsTab assetId={assetId} initialShowForm={openMeterForm} currentContext={asset} />}
      {activeTab === 'assignments' && <AssetAssignmentsTab assetId={assetId} />}
      {activeTab === 'people' && <AssetPersonAssignmentsTab assetId={assetId} />}
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
      {showCustomFieldModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Custom Field</h3>
              <button onClick={() => setShowCustomFieldModal(false)} className="text-gray-400 hover:text-gray-500">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createCustomFieldMutation.mutate(customFieldForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Name *</label>
                <input type="text" required value={customFieldForm.name} onChange={(e) => setCustomFieldForm({ ...customFieldForm, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Field Type *</label>
                <select value={customFieldForm.fieldType} onChange={(e) => setCustomFieldForm({ ...customFieldForm, fieldType: e.target.value as CustomFieldDefinition['fieldType'] })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="TEXT">Text</option>
                  <option value="NUMBER">Number</option>
                  <option value="DATE">Date</option>
                  <option value="BOOLEAN">Yes/No</option>
                  <option value="SELECT">Dropdown</option>
                </select>
              </div>
              {customFieldForm.fieldType === 'SELECT' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Dropdown Options *</label>
                  <textarea required value={customFieldForm.selectOptions} onChange={(e) => setCustomFieldForm({ ...customFieldForm, selectOptions: e.target.value })} rows={3} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="One option per line or comma-separated" />
                </div>
              )}
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowCustomFieldModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createCustomFieldMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createCustomFieldMutation.isPending ? 'Creating...' : 'Create Field'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showStatusModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">New Custom Status</h3>
              <button onClick={() => setShowStatusModal(false)} className="text-gray-400 hover:text-gray-500">
                <XCircle className="h-6 w-6" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createStatusMutation.mutate(statusForm) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Status Name *</label>
                <input type="text" required value={statusForm.name} onChange={(e) => setStatusForm({ ...statusForm, name: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" placeholder="e.g., Awaiting Parts" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Status *</label>
                <select value={statusForm.baseStatus} onChange={(e) => setStatusForm({ ...statusForm, baseStatus: e.target.value as Asset['status'] })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                  <option value="AVAILABLE">Available</option>
                  <option value="IN_USE">In Use</option>
                  <option value="UNDER_MAINTENANCE">Under Maintenance</option>
                  <option value="RETIRED">Retired</option>
                  <option value="LOST_DAMAGED">Lost/Damaged</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Color</label>
                <input type="color" value={statusForm.color} onChange={(e) => setStatusForm({ ...statusForm, color: e.target.value })} className="h-10 w-20 border border-gray-300 rounded-md px-1 py-1" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowStatusModal(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createStatusMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createStatusMutation.isPending ? 'Creating...' : 'Create Status'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

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
