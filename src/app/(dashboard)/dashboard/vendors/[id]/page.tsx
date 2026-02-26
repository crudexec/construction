'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import {
  ArrowLeft,
  Edit,
  Trash2,
  Star,
  Phone,
  Mail,
  Globe,
  MapPin,
  Calendar,
  FileText,
  Users,
  Activity,
  AlertCircle,
  Plus,
  Key,
  Lock,
  Eye,
  EyeOff,
  Check,
  X,
  DollarSign,
  Clock,
  Briefcase,
  Upload,
  Paperclip,
  Download,
  CheckSquare,
  Target,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle
} from 'lucide-react'
import Link from 'next/link'
import AddReviewModal from '@/components/vendors/add-review-modal'
import { VendorScoreDisplay } from '@/components/vendors/vendor-score-display'
import AddContactModal from '@/components/vendors/add-contact-modal'
import EditContactModal from '@/components/vendors/edit-contact-modal'
import VendorProcurementTab from '@/components/vendors/vendor-procurement-tab'
import { VendorTagSelector } from '@/components/vendors/vendor-tag-selector'
import { VendorPurchaseOrdersTab } from '@/components/vendors/vendor-purchase-orders-tab'
import { VendorCommentsTab } from '@/components/vendors/vendor-comments-tab'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { ContractLineItems } from '@/components/contracts/contract-line-items'
import { ContractChangeOrders } from '@/components/contracts/contract-change-orders'
import { ContractSummaryCard } from '@/components/contracts/contract-summary-card'

interface VendorContact {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
  isPrimary: boolean
  isBilling: boolean
}

interface VendorReview {
  id: string
  overallRating: number
  qualityRating?: number
  timelinessRating?: number
  communicationRating?: number
  professionalismRating?: number
  pricingAccuracyRating?: number
  safetyComplianceRating?: number
  problemResolutionRating?: number
  documentationRating?: number
  comments?: string
  reviewerName: string
  createdAt: string
  projectName?: string
}

interface ProjectVendor {
  id: string
  project: {
    id: string
    title: string
    status: string
  }
  assignedAt: string
  status: string
}

interface VendorMilestone {
  id: string
  title: string
  description?: string
  targetDate?: string
  status: string
  completedDate?: string
  projectVendor?: {
    project: {
      id: string
      title: string
    }
  }
}

interface ContractDocument {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  createdAt: string
}

interface ContractPayment {
  id: string
  amount: number
  paymentDate: string
  reference?: string
  notes?: string
  createdAt: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
}

interface VendorContract {
  id: string
  contractNumber: string
  type: 'LUMP_SUM' | 'REMEASURABLE' | 'ADDENDUM'
  totalSum: number
  retentionPercent?: number
  retentionAmount?: number
  warrantyYears: number
  startDate: string
  endDate?: string | null
  status: 'DRAFT' | 'ACTIVE' | 'COMPLETED' | 'TERMINATED' | 'EXPIRED'
  terms?: string
  notes?: string
  createdAt: string
  documents?: ContractDocument[]
  payments?: ContractPayment[]
  projects: {
    id: string
    project: {
      id: string
      title: string
      status: string
    }
  }[]
}

interface VendorCategoryRef {
  id: string
  name: string
  color: string
  csiDivision?: string
}

interface VendorCategoryOption {
  id: string
  name: string
  color: string
  csiDivision?: string
  vendorCount: number
}

interface Vendor {
  id: string
  name: string
  companyName: string
  email?: string
  phone?: string
  address?: string
  city?: string
  state?: string
  zipCode?: string
  website?: string
  licenseNumber?: string
  insuranceInfo?: string
  type: 'SUPPLY_AND_INSTALLATION' | 'SUPPLY' | 'INSTALLATION'
  categoryId?: string
  category?: VendorCategoryRef
  scopeOfWork?: string
  paymentTerms?: string
  contractStartDate?: string
  contractEndDate?: string
  notes?: string
  isActive: boolean
  createdAt: string
  contacts: VendorContact[]
  reviews: VendorReview[]
  projectVendors: ProjectVendor[]
  milestones: VendorMilestone[]
  _count: {
    projectVendors: number
    reviews: number
    milestones: number
  }
}

async function fetchVendor(id: string): Promise<Vendor> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  
  if (!response.ok) throw new Error('Failed to fetch vendor')
  return response.json()
}

async function fetchCategories(): Promise<VendorCategoryOption[]> {
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
    case 'active': 
    case 'completed': 
    case 'in_progress':
      return 'bg-green-100 text-green-800'
    case 'pending': 
    case 'planning':
      return 'bg-yellow-100 text-yellow-800'
    case 'inactive': 
    case 'cancelled': 
    case 'on_hold':
      return 'bg-red-100 text-red-800'
    default:
      return 'bg-gray-100 text-gray-800'
  }
}

const renderStars = (rating: number) => {
  return Array.from({ length: 5 }, (_, i) => (
    <Star
      key={i}
      className={`h-4 w-4 ${
        i < Math.floor(rating) 
          ? 'text-yellow-400 fill-current' 
          : 'text-gray-300'
      }`}
    />
  ))
}

interface PortalAccess {
  hasPortalAccess: boolean
  portalEmail: string | null
  lastLogin: string | null
}

async function fetchPortalAccess(vendorId: string): Promise<PortalAccess> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/portal-access`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch portal access')
  return response.json()
}

interface ProjectMilestone {
  id: string
  title: string
  description?: string
  amount?: number
  targetDate?: string
  completedDate?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  project: {
    id: string
    title: string
    status: string
  }
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
  tasks?: Array<{
    id: string
    title: string
    description?: string
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    dueDate?: string
    assignee?: {
      id: string
      firstName: string
      lastName: string
    }
  }>
  completedTasksCount?: number
  totalTasksCount?: number
  progress?: number
}

async function fetchVendorProjectMilestones(vendorId: string, projectId?: string, status?: string): Promise<ProjectMilestone[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const params = new URLSearchParams()
  if (projectId) params.set('projectId', projectId)
  if (status) params.set('status', status)

  const url = params.toString()
    ? `/api/vendors/${vendorId}/milestones?${params}`
    : `/api/vendors/${vendorId}/milestones`

  const response = await fetch(url, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch milestones')
  return response.json()
}

interface VendorTask {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  completionPendingApproval: boolean
  completionRequestedAt?: string
  completionApprovedAt?: string
  card: {
    id: string
    title: string
    status: string
  }
  category?: {
    id: string
    name: string
    color: string
  }
  completionApprover?: {
    id: string
    firstName: string
    lastName: string
  }
}

async function fetchVendorTasks(vendorId: string): Promise<VendorTask[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/tasks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

async function fetchVendorContracts(vendorId: string): Promise<VendorContract[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/contracts`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}))
    throw new Error(errorData.details || errorData.error || `Failed to fetch contracts (${response.status})`)
  }
  return response.json()
}

const getContractStatusBadge = (status: string) => {
  const config: Record<string, { bg: string; text: string }> = {
    'DRAFT': { bg: 'bg-gray-100', text: 'text-gray-800' },
    'ACTIVE': { bg: 'bg-green-100', text: 'text-green-800' },
    'COMPLETED': { bg: 'bg-blue-100', text: 'text-blue-800' },
    'TERMINATED': { bg: 'bg-red-100', text: 'text-red-800' },
    'EXPIRED': { bg: 'bg-yellow-100', text: 'text-yellow-800' }
  }
  const c = config[status] || config['DRAFT']
  return (
    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${c.bg} ${c.text}`}>
      {status}
    </span>
  )
}

const getContractTypeLabel = (type: string) => {
  switch (type) {
    case 'LUMP_SUM': return 'Lump Sum'
    case 'REMEASURABLE': return 'Remeasurable'
    case 'ADDENDUM': return 'Addendum'
    default: return type
  }
}

export default function VendorDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const queryClient = useQueryClient()
  const vendorId = params.id as string
  const { symbol: currencySymbol, format: formatCurrency } = useCurrency()
  const initialTab = searchParams.get('tab') || 'overview'
  const [activeTab, setActiveTab] = useState(initialTab)
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false)
  const [isContactModalOpen, setIsContactModalOpen] = useState(false)
  const [isEditContactModalOpen, setIsEditContactModalOpen] = useState(false)
  const [selectedContact, setSelectedContact] = useState<VendorContact | null>(null)
  const [isPortalModalOpen, setIsPortalModalOpen] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [portalForm, setPortalForm] = useState({
    email: '',
    password: '',
    confirmPassword: ''
  })
  const [isContractModalOpen, setIsContractModalOpen] = useState(false)
  const [selectedContract, setSelectedContract] = useState<VendorContract | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [editForm, setEditForm] = useState({
    name: '',
    companyName: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    state: '',
    zipCode: '',
    website: '',
    licenseNumber: '',
    insuranceInfo: '',
    type: 'SUPPLY_AND_INSTALLATION' as 'SUPPLY_AND_INSTALLATION' | 'SUPPLY' | 'INSTALLATION',
    categoryId: '' as string,
    tagIds: [] as string[],
    scopeOfWork: '',
    paymentTerms: '',
    notes: '',
    isActive: true
  })
  const [contractForm, setContractForm] = useState({
    contractNumber: '',
    type: 'LUMP_SUM' as 'LUMP_SUM' | 'REMEASURABLE' | 'ADDENDUM',
    totalSum: '',
    retentionPercent: '0',
    warrantyYears: '1',
    startDate: '',
    endDate: '',
    terms: '',
    notes: ''
  })
  const [isUploadingDocument, setIsUploadingDocument] = useState(false)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [milestoneProjectFilter, setMilestoneProjectFilter] = useState<string>('')
  const [milestoneStatusFilter, setMilestoneStatusFilter] = useState<string>('')
  const [isVendorInfoCollapsed, setIsVendorInfoCollapsed] = useState(false)
  const [isAddPaymentModalOpen, setIsAddPaymentModalOpen] = useState(false)
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    paymentDate: new Date().toISOString().split('T')[0],
    reference: '',
    notes: ''
  })
  const fileInputRef = useRef<HTMLInputElement>(null)

  // Milestone and Task creation from vendor page
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false)
  const [isAddTaskModalOpen, setIsAddTaskModalOpen] = useState(false)
  const [selectedMilestoneForTask, setSelectedMilestoneForTask] = useState<ProjectMilestone | null>(null)
  const [milestoneForm, setMilestoneForm] = useState({
    projectId: '',
    title: '',
    description: '',
    amount: '',
    targetDate: ''
  })
  const [taskForm, setTaskForm] = useState({
    projectId: '',
    milestoneId: '',
    title: '',
    description: '',
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT',
    dueDate: '',
    categoryId: '',
    assigneeId: ''
  })

  const toggleMilestone = (milestoneId: string) => {
    setExpandedMilestones(prev => {
      const newSet = new Set(prev)
      if (newSet.has(milestoneId)) {
        newSet.delete(milestoneId)
      } else {
        newSet.add(milestoneId)
      }
      return newSet
    })
  }

  const { data: vendor, isLoading, error } = useQuery({
    queryKey: ['vendor', vendorId],
    queryFn: () => fetchVendor(vendorId),
    enabled: !!vendorId
  })

  const { data: portalAccess, refetch: refetchPortalAccess } = useQuery({
    queryKey: ['vendor-portal-access', vendorId],
    queryFn: () => fetchPortalAccess(vendorId),
    enabled: !!vendorId && activeTab === 'portal'
  })

  const { data: contracts = [], refetch: refetchContracts, isLoading: isLoadingContracts, error: contractsError } = useQuery({
    queryKey: ['vendor-contracts', vendorId],
    queryFn: () => fetchVendorContracts(vendorId),
    enabled: !!vendorId && (activeTab === 'contracts' || activeTab === 'overview'),
    staleTime: 0,
    refetchOnMount: 'always'
  })

  const { data: projectMilestones = [], isLoading: isLoadingMilestones } = useQuery({
    queryKey: ['vendor-project-milestones', vendorId, milestoneProjectFilter, milestoneStatusFilter],
    queryFn: () => fetchVendorProjectMilestones(
      vendorId,
      milestoneProjectFilter || undefined,
      milestoneStatusFilter || undefined
    ),
    enabled: !!vendorId && (activeTab === 'milestones' || activeTab === 'overview'),
    staleTime: 0,
    refetchOnMount: 'always'
  })

  // Get unique projects from all vendor milestones for the filter dropdown
  const { data: allVendorMilestones = [] } = useQuery({
    queryKey: ['vendor-all-milestones', vendorId],
    queryFn: () => fetchVendorProjectMilestones(vendorId),
    enabled: !!vendorId && activeTab === 'milestones',
    staleTime: 60000 // Cache for 1 minute since this is just for filter options
  })

  const uniqueProjects = Array.from(
    new Map(allVendorMilestones.map((m: ProjectMilestone) => [m.project.id, m.project])).values()
  )

  const { data: vendorTasks = [], isLoading: isLoadingTasks, refetch: refetchTasks } = useQuery({
    queryKey: ['vendor-tasks', vendorId],
    queryFn: () => fetchVendorTasks(vendorId),
    enabled: !!vendorId && activeTab === 'overview',
    staleTime: 0,
    refetchOnMount: 'always'
  })

  // Fetch all projects for milestone creation
  const { data: allProjects = [] } = useQuery({
    queryKey: ['all-projects'],
    queryFn: async () => {
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
      if (!response.ok) throw new Error('Failed to fetch projects')
      return response.json()
    },
    enabled: isAddMilestoneModalOpen || isAddTaskModalOpen
  })

  // Fetch categories for the selected project (when adding a task)
  const { data: projectCategories = [] } = useQuery({
    queryKey: ['project-categories', taskForm.projectId],
    queryFn: async () => {
      if (!taskForm.projectId) return []
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${taskForm.projectId}/categories`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: isAddTaskModalOpen && !!taskForm.projectId
  })

  // Fetch team members for assignment
  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch('/api/users', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })
      if (!response.ok) return []
      return response.json()
    },
    enabled: isAddTaskModalOpen
  })

  // Fetch vendor categories
  const { data: vendorCategories = [] } = useQuery<VendorCategoryOption[]>({
    queryKey: ['vendor-categories'],
    queryFn: fetchCategories
  })

  // Create milestone mutation
  const createMilestoneMutation = useMutation({
    mutationFn: async (data: { projectId: string; title: string; description?: string; amount?: string; targetDate?: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${data.projectId}/milestones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          amount: data.amount ? parseFloat(data.amount) : undefined,
          targetDate: data.targetDate || undefined,
          vendorId: vendorId // Auto-assign to current vendor
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create milestone')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-project-milestones', vendorId] })
      setIsAddMilestoneModalOpen(false)
      setMilestoneForm({
        projectId: '',
        title: '',
        description: '',
        amount: '',
        targetDate: ''
      })
    }
  })

  // Create task mutation
  const createTaskMutation = useMutation({
    mutationFn: async (data: { projectId: string; milestoneId: string; title: string; description?: string; priority: string; dueDate?: string; categoryId?: string; assigneeId?: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${data.projectId}/tasks`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          priority: data.priority,
          dueDate: data.dueDate || undefined,
          milestoneId: data.milestoneId,
          categoryId: data.categoryId || undefined,
          assigneeId: data.assigneeId || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create task')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-project-milestones', vendorId] })
      setIsAddTaskModalOpen(false)
      setSelectedMilestoneForTask(null)
      setTaskForm({
        projectId: '',
        milestoneId: '',
        title: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: '',
        categoryId: '',
        assigneeId: ''
      })
    }
  })

  // Update task status mutation
  const updateTaskStatusMutation = useMutation({
    mutationFn: async ({ taskId, projectId, status }: { taskId: string; projectId: string; status: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${projectId}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update task status')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-project-milestones', vendorId] })
    }
  })

  const createContractMutation = useMutation({
    mutationFn: async (data: typeof contractForm) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/vendors/${vendorId}/contracts`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          contractNumber: data.contractNumber,
          type: data.type,
          totalSum: parseFloat(data.totalSum),
          retentionPercent: parseFloat(data.retentionPercent),
          warrantyYears: parseInt(data.warrantyYears),
          startDate: data.startDate,
          endDate: data.endDate,
          terms: data.terms || undefined,
          notes: data.notes || undefined
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create contract')
      }
      return response.json()
    },
    onSuccess: () => {
      refetchContracts()
      setIsContractModalOpen(false)
      setContractForm({
        contractNumber: '',
        type: 'LUMP_SUM',
        totalSum: '',
        retentionPercent: '0',
        warrantyYears: '1',
        startDate: '',
        endDate: '',
        terms: '',
        notes: ''
      })
    }
  })

  const enablePortalMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/vendors/${vendorId}/portal-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to enable portal access')
      }
      return response.json()
    },
    onSuccess: () => {
      refetchPortalAccess()
      setIsPortalModalOpen(false)
      setPortalForm({ email: '', password: '', confirmPassword: '' })
    }
  })

  const disablePortalMutation = useMutation({
    mutationFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/vendors/${vendorId}/portal-access`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to disable portal access')
      }
      return response.json()
    },
    onSuccess: () => {
      refetchPortalAccess()
    }
  })

  const setPrimaryContactMutation = useMutation({
    mutationFn: async (contactId: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/vendors/contacts/${contactId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ isPrimary: true })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to set primary contact')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      queryClient.invalidateQueries({ queryKey: ['vendors'] })
    }
  })

  const updateVendorMutation = useMutation({
    mutationFn: async (data: typeof editForm) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/vendors/${vendorId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update vendor')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor', vendorId] })
      setIsEditModalOpen(false)
    }
  })

  const uploadDocumentMutation = useMutation({
    mutationFn: async ({ contractId, file }: { contractId: string; file: File }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/contracts/${contractId}/documents`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        body: formData
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to upload document')
      }
      return response.json()
    },
    onSuccess: (newDoc) => {
      // Update the selected contract with the new document
      if (selectedContract) {
        setSelectedContract({
          ...selectedContract,
          documents: [newDoc, ...(selectedContract.documents || [])]
        })
      }
      refetchContracts()
      setIsUploadingDocument(false)
    },
    onError: () => {
      setIsUploadingDocument(false)
    }
  })

  const deleteDocumentMutation = useMutation({
    mutationFn: async ({ contractId, documentId }: { contractId: string; documentId: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/documents?documentId=${documentId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete document')
      }
      return { documentId }
    },
    onSuccess: ({ documentId }) => {
      // Update the selected contract by removing the deleted document
      if (selectedContract) {
        setSelectedContract({
          ...selectedContract,
          documents: (selectedContract.documents || []).filter(d => d.id !== documentId)
        })
      }
      refetchContracts()
    }
  })

  const addPaymentMutation = useMutation({
    mutationFn: async ({ contractId, paymentData }: { contractId: string; paymentData: any }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/contracts/${contractId}/payments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(paymentData)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add payment')
      }
      return response.json()
    },
    onSuccess: (newPayment) => {
      if (selectedContract) {
        setSelectedContract({
          ...selectedContract,
          payments: [newPayment, ...(selectedContract.payments || [])]
        })
      }
      refetchContracts()
      setIsAddPaymentModalOpen(false)
      setPaymentForm({
        amount: '',
        paymentDate: new Date().toISOString().split('T')[0],
        reference: '',
        notes: ''
      })
    }
  })

  const handleAddPayment = () => {
    if (!selectedContract || !paymentForm.amount) return

    addPaymentMutation.mutate({
      contractId: selectedContract.id,
      paymentData: {
        amount: parseFloat(paymentForm.amount),
        paymentDate: paymentForm.paymentDate,
        reference: paymentForm.reference || undefined,
        notes: paymentForm.notes || undefined
      }
    })
  }

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file && selectedContract) {
      setIsUploadingDocument(true)
      uploadDocumentMutation.mutate({ contractId: selectedContract.id, file })
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
  }

  const openEditModal = () => {
    if (vendor) {
      setEditForm({
        name: vendor.name || '',
        companyName: vendor.companyName || '',
        email: vendor.email || '',
        phone: vendor.phone || '',
        address: vendor.address || '',
        city: vendor.city || '',
        state: vendor.state || '',
        zipCode: vendor.zipCode || '',
        website: vendor.website || '',
        licenseNumber: vendor.licenseNumber || '',
        insuranceInfo: vendor.insuranceInfo || '',
        type: vendor.type || 'SUPPLY_AND_INSTALLATION',
        categoryId: vendor.categoryId || '',
        tagIds: (vendor as any).serviceTags?.map((st: any) => st.tag?.id || st.tagId).filter(Boolean) || [],
        scopeOfWork: vendor.scopeOfWork || '',
        paymentTerms: vendor.paymentTerms || '',
        notes: vendor.notes || '',
        isActive: vendor.isActive
      })
      setIsEditModalOpen(true)
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (error || !vendor) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Vendor Not Found</h2>
        <p className="text-gray-600 mb-4">The requested vendor could not be found.</p>
        <Link
          href="/dashboard/vendors"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700"
        >
          Back to Vendors
        </Link>
      </div>
    )
  }

  const averageRating = vendor.reviews.length > 0 
    ? vendor.reviews.reduce((sum, review) => sum + review.overallRating, 0) / vendor.reviews.length
    : 0

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
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{vendor.name}</h1>
            <p className="text-gray-600">{vendor.companyName}</p>
          </div>
          <span className={`px-3 py-1 rounded-full text-sm font-medium ${
            vendor.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {vendor.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>
        <div className="flex space-x-2">
          <button
            onClick={openEditModal}
            className="bg-white text-gray-700 px-4 py-2 rounded-md border hover:bg-gray-50 flex items-center space-x-2"
          >
            <Edit className="h-4 w-4" />
            <span>Edit</span>
          </button>
          <button className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2">
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {averageRating ? averageRating.toFixed(1) : 'N/A'}
              </div>
              <div className="text-sm text-gray-500">Average Rating</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {vendor._count.projectVendors}
              </div>
              <div className="text-sm text-gray-500">Active Projects</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Activity className="h-8 w-8 text-green-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {vendor._count.milestones}
              </div>
              <div className="text-sm text-gray-500">Milestones</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <FileText className="h-8 w-8 text-purple-600" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">
                {vendor._count.reviews}
              </div>
              <div className="text-sm text-gray-500">Reviews</div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {[
            { id: 'overview', label: 'Overview' },
            { id: 'projects', label: 'Projects' },
            { id: 'milestones', label: 'Milestones' },
            { id: 'reviews', label: 'Reviews' },
            { id: 'comments', label: 'Comments' },
            { id: 'contracts', label: 'Contracts' },
            { id: 'catalog', label: 'Catalog & Pricing' },
            { id: 'purchase-orders', label: 'Purchase Orders' },
            { id: 'portal', label: 'Portal Access' }
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
        <div className="space-y-6">
          {/* Vendor Information - Collapsible */}
          <div className="bg-white rounded-lg shadow border">
            <div
              className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50"
              onClick={() => setIsVendorInfoCollapsed(!isVendorInfoCollapsed)}
            >
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                {isVendorInfoCollapsed ? (
                  <ChevronRight className="h-5 w-5 text-gray-400" />
                ) : (
                  <ChevronDown className="h-5 w-5 text-gray-400" />
                )}
                Vendor Information
              </h3>
              {isVendorInfoCollapsed && (
                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                    {getVendorTypeLabel(vendor.type)}
                  </span>
                  {vendor.email && (
                    <span className="flex items-center gap-1">
                      <Mail className="h-4 w-4" />
                      {vendor.email}
                    </span>
                  )}
                  {vendor.phone && (
                    <span className="flex items-center gap-1">
                      <Phone className="h-4 w-4" />
                      {vendor.phone}
                    </span>
                  )}
                </div>
              )}
            </div>

            {!isVendorInfoCollapsed && (
              <div className="px-6 pb-6 pt-2">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="flex items-center space-x-3">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                      {getVendorTypeLabel(vendor.type)}
                    </span>
                  </div>
                  {vendor.email && (
                    <div className="flex items-center space-x-3">
                      <Mail className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 text-sm">{vendor.email}</span>
                    </div>
                  )}
                  {vendor.phone && (
                    <div className="flex items-center space-x-3">
                      <Phone className="h-5 w-5 text-gray-400" />
                      <span className="text-gray-900 text-sm">{vendor.phone}</span>
                    </div>
                  )}
                  {vendor.website && (
                    <div className="flex items-center space-x-3">
                      <Globe className="h-5 w-5 text-gray-400" />
                      <a href={vendor.website} target="_blank" rel="noopener noreferrer" className="text-primary-600 hover:text-primary-800 text-sm">
                        {vendor.website}
                      </a>
                    </div>
                  )}
                  {(vendor.address || vendor.city || vendor.state || vendor.zipCode) && (
                    <div className="flex items-start space-x-3 md:col-span-2">
                      <MapPin className="h-5 w-5 text-gray-400 mt-0.5" />
                      <div className="text-gray-900 text-sm">
                        {vendor.address && <div>{vendor.address}</div>}
                        {(vendor.city || vendor.state || vendor.zipCode) && (
                          <div>
                            {vendor.city}{vendor.city && vendor.state && ', '}{vendor.state} {vendor.zipCode}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  {vendor.licenseNumber && (
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-500">License #:</span>
                      <span className="text-gray-900 text-sm">{vendor.licenseNumber}</span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Milestones & Tasks - Combined View */}
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900 flex items-center gap-2">
                <Target className="h-5 w-5 text-gray-400" />
                Milestones & Tasks
              </h3>
              <button
                onClick={() => setIsAddMilestoneModalOpen(true)}
                className="text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                Add Milestone
              </button>
            </div>

            {isLoadingMilestones ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
              </div>
            ) : projectMilestones.length === 0 ? (
              <div className="text-center py-8">
                <Target className="h-10 w-10 mx-auto text-gray-300 mb-3" />
                <p className="text-sm text-gray-500">No milestones assigned</p>
                <button
                  onClick={() => setIsAddMilestoneModalOpen(true)}
                  className="mt-3 text-sm text-primary-600 hover:text-primary-800 flex items-center gap-1 mx-auto"
                >
                  <Plus className="h-4 w-4" />
                  Add Milestone
                </button>
              </div>
            ) : (
              <div className="divide-y divide-gray-100">
                {projectMilestones.map((milestone) => {
                  const tasks = (milestone as any).tasks || []
                  const taskCount = (milestone as any).totalTasksCount || tasks.length
                  const completedTaskCount = (milestone as any).completedTasksCount || tasks.filter((t: any) => t.status === 'COMPLETED').length

                  return (
                    <div key={milestone.id} className="p-4">
                      {/* Milestone Row */}
                      <div className="flex items-start gap-3">
                        <div className={`mt-0.5 w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                          milestone.status === 'COMPLETED' ? 'bg-green-500' :
                          milestone.status === 'IN_PROGRESS' ? 'bg-blue-500' :
                          milestone.status === 'OVERDUE' ? 'bg-red-500' :
                          'bg-gray-300'
                        }`} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{milestone.title}</p>
                              <p className="text-xs text-gray-500">{milestone.project.title}</p>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {taskCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  {completedTaskCount}/{taskCount} tasks
                                </span>
                              )}
                              {milestone.amount && (
                                <span className="text-xs text-gray-500">{formatCurrency(milestone.amount)}</span>
                              )}
                            </div>
                          </div>

                          {/* Nested Tasks */}
                          {tasks.length > 0 && (
                            <div className="mt-3 ml-2 space-y-2 border-l-2 border-gray-200 pl-4">
                              {tasks.map((task: any) => (
                                <div key={task.id} className="flex items-center justify-between py-1">
                                  <div className="flex items-center gap-2">
                                    {task.status === 'COMPLETED' ? (
                                      <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
                                    ) : (
                                      <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
                                    )}
                                    <span className={`text-sm ${
                                      task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-700'
                                    }`}>
                                      {task.title}
                                    </span>
                                  </div>
                                  <span className={`text-xs px-2 py-0.5 rounded ${
                                    task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                    task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                    'bg-gray-100 text-gray-600'
                                  }`}>
                                    {task.status.replace('_', ' ')}
                                  </span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}

                {projectMilestones.length > 5 && (
                  <div className="px-4 py-3 bg-gray-50">
                    <button
                      onClick={() => setActiveTab('milestones')}
                      className="text-sm text-primary-600 hover:text-primary-800 w-full text-center"
                    >
                      View all {projectMilestones.length} milestones
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Contracts Section */}
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Contracts</h3>
              <button
                onClick={() => setIsContractModalOpen(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Contract</span>
              </button>
            </div>
            {isLoadingContracts ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
                <p className="text-sm text-gray-500 mt-2">Loading contracts...</p>
              </div>
            ) : contractsError ? (
              <div className="p-8 text-center">
                <AlertCircle className="h-10 w-10 mx-auto text-red-400 mb-3" />
                <p className="text-red-500">Failed to load contracts</p>
                <button
                  onClick={() => refetchContracts()}
                  className="mt-3 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                >
                  Retry
                </button>
              </div>
            ) : contracts.length === 0 ? (
              <div className="p-8 text-center">
                <Briefcase className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No contracts yet</p>
                <p className="text-sm text-gray-400 mt-1">Add a contract to track agreements with this vendor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {contracts.map((contract) => (
                  <div
                    key={contract.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer"
                    onClick={() => setSelectedContract(contract)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <FileText className="h-5 w-5 text-gray-400" />
                        <div>
                          <p className="text-sm font-medium text-gray-900">{contract.contractNumber}</p>
                          <p className="text-xs text-gray-500">
                            {getContractTypeLabel(contract.type)} • {formatCurrency(contract.totalSum)}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-3">
                        {getContractStatusBadge(contract.status)}
                        <div className="text-xs text-gray-500">
                          {new Date(contract.startDate).toLocaleDateString()} - {contract.endDate ? new Date(contract.endDate).toLocaleDateString() : 'Ongoing'}
                        </div>
                      </div>
                    </div>
                    {contract.documents && contract.documents.length > 0 && (
                      <div className="mt-2 flex items-center text-xs text-gray-500">
                        <Paperclip className="h-3 w-3 mr-1" />
                        {contract.documents.length} document{contract.documents.length !== 1 ? 's' : ''}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Contacts Section */}
          <div className="bg-white rounded-lg shadow border overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Contacts</h3>
              <button
                onClick={() => setIsContactModalOpen(true)}
                className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Contact</span>
              </button>
            </div>
            {vendor.contacts.length === 0 ? (
              <div className="p-8 text-center">
                <Users className="h-10 w-10 mx-auto text-gray-400 mb-3" />
                <p className="text-gray-500">No contacts added yet</p>
                <p className="text-sm text-gray-400 mt-1">Add key contacts for this vendor</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200">
                {vendor.contacts.map((contact) => (
                  <div
                    key={contact.id}
                    className="p-4 hover:bg-gray-50 cursor-pointer transition-colors"
                    onClick={() => router.push(`/dashboard/vendors/${vendor.id}/contacts/${contact.id}`)}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 flex items-center justify-center">
                          <span className="text-sm font-medium text-gray-600">
                            {contact.firstName[0]}{contact.lastName[0]}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 hover:text-primary-600">
                            {contact.firstName} {contact.lastName}
                          </p>
                          <p className="text-xs text-gray-500">{contact.position || 'No position'}</p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right text-sm">
                          {contact.email && (
                            <div className="flex items-center text-gray-500">
                              <Mail className="h-3 w-3 mr-1" />
                              {contact.email}
                            </div>
                          )}
                          {contact.phone && (
                            <div className="flex items-center text-gray-500">
                              <Phone className="h-3 w-3 mr-1" />
                              {contact.phone}
                            </div>
                          )}
                        </div>
                        <div className="flex space-x-1">
                          {contact.isPrimary && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                          {contact.isBilling && (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Billing
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2 ml-2">
                          {!contact.isPrimary && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setPrimaryContactMutation.mutate(contact.id)
                              }}
                              disabled={setPrimaryContactMutation.isPending}
                              className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                              title="Set as Primary Contact"
                            >
                              <Star className="h-4 w-4" />
                            </button>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              setSelectedContact(contact)
                              setIsEditContactModalOpen(true)
                            }}
                            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded transition-colors"
                            title="Edit Contact"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'projects' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-medium text-gray-900">Associated Projects</h3>
          </div>
          {vendor.projectVendors.length === 0 ? (
            <div className="p-12 text-center">
              <Users className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No projects assigned yet</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Project
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
                  {vendor.projectVendors.map((pv) => (
                    <tr key={pv.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{pv.project.title}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(pv.project.status)}`}>
                          {pv.project.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {new Date(pv.assignedAt).toLocaleDateString()}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <Link
                          href={`/dashboard/projects/${pv.project.id}`}
                          className="text-primary-600 hover:text-primary-900"
                        >
                          View Project
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'milestones' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Assigned Milestones</h3>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => {
                    // Open task modal with ability to select milestone
                    setSelectedMilestoneForTask(null)
                    setTaskForm({
                      projectId: '',
                      milestoneId: '',
                      title: '',
                      description: '',
                      priority: 'MEDIUM',
                      dueDate: '',
                      categoryId: '',
                      assigneeId: ''
                    })
                    setIsAddTaskModalOpen(true)
                  }}
                  className="bg-white text-gray-700 border border-gray-300 px-4 py-2 rounded-md hover:bg-gray-50 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Task</span>
                </button>
                <button
                  onClick={() => setIsAddMilestoneModalOpen(true)}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Plus className="h-4 w-4" />
                  <span>Add Milestone</span>
                </button>
              </div>
            </div>
            {/* Filter Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Filter by Project:</label>
                <select
                  value={milestoneProjectFilter}
                  onChange={(e) => setMilestoneProjectFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Projects</option>
                  {uniqueProjects.map((project: { id: string; title: string }) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600">Status:</label>
                <select
                  value={milestoneStatusFilter}
                  onChange={(e) => setMilestoneStatusFilter(e.target.value)}
                  className="border border-gray-300 rounded-md px-3 py-1.5 text-sm focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                  <option value="">All Statuses</option>
                  <option value="PENDING">Pending</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                  <option value="OVERDUE">Overdue</option>
                </select>
              </div>
              {(milestoneProjectFilter || milestoneStatusFilter) && (
                <button
                  onClick={() => {
                    setMilestoneProjectFilter('')
                    setMilestoneStatusFilter('')
                  }}
                  className="text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
                >
                  <X className="h-3 w-3" />
                  Clear filters
                </button>
              )}
            </div>
          </div>
          {isLoadingMilestones ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading milestones...</p>
            </div>
          ) : projectMilestones.length === 0 ? (
            <div className="p-12 text-center">
              <Activity className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No milestones assigned yet</p>
              <p className="text-sm text-gray-400 mt-1">Click the Add Milestone button to create one</p>
              <button
                onClick={() => setIsAddMilestoneModalOpen(true)}
                className="mt-4 bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 inline-flex items-center space-x-2"
              >
                <Plus className="h-4 w-4" />
                <span>Add Milestone</span>
              </button>
            </div>
          ) : (
            <div className="divide-y divide-gray-200">
              {projectMilestones.map((milestone) => {
                const isExpanded = expandedMilestones.has(milestone.id)
                const tasks = (milestone as any).tasks || []
                const taskCount = (milestone as any).totalTasksCount || tasks.length
                const completedCount = (milestone as any).completedTasksCount || tasks.filter((t: any) => t.status === 'COMPLETED').length
                const progress = (milestone as any).progress || (taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0)

                return (
                  <div key={milestone.id} className="border-b border-gray-200 last:border-b-0">
                    {/* Milestone Header */}
                    <div className="p-4 bg-gray-50">
                      <div className="flex items-start gap-3">
                        {/* Milestone Icon */}
                        <div className="flex-shrink-0 mt-0.5">
                          <Target className="h-5 w-5 text-indigo-500" />
                        </div>

                        {/* Milestone Content */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-3 flex-wrap">
                                <h3 className="text-base font-semibold text-gray-900">{milestone.title}</h3>
                                <span className={`inline-flex px-2 py-0.5 text-xs font-semibold rounded-full ${
                                  milestone.status === 'COMPLETED' ? 'bg-green-100 text-green-800' :
                                  milestone.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-800' :
                                  milestone.status === 'OVERDUE' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {milestone.status.replace('_', ' ')}
                                </span>
                              </div>
                              <p className="text-sm text-gray-600 mt-1">
                                Project: <Link href={`/dashboard/projects/${milestone.project.id}`} className="text-primary-600 hover:text-primary-800">{milestone.project.title}</Link>
                              </p>
                              {milestone.description && (
                                <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                              )}

                              <div className="flex flex-wrap items-center gap-4 mt-2">
                                {milestone.amount && (
                                  <span className="inline-flex items-center text-sm text-gray-600">
                                    <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
                                    {formatCurrency(milestone.amount)}
                                  </span>
                                )}
                                {milestone.targetDate && (
                                  <span className="inline-flex items-center text-sm text-gray-600">
                                    <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                    {new Date(milestone.targetDate).toLocaleDateString()}
                                  </span>
                                )}
                                {taskCount > 0 && (
                                  <span className="text-sm text-gray-600">
                                    {completedCount}/{taskCount} tasks completed
                                  </span>
                                )}
                              </div>

                              {/* Progress Bar */}
                              {taskCount > 0 && (
                                <div className="mt-3 max-w-md">
                                  <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                                    <div
                                      className="h-full bg-green-500 rounded-full transition-all duration-500"
                                      style={{ width: `${progress}%` }}
                                    />
                                  </div>
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Tasks Section - Always Visible */}
                    <div className="p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-700 flex items-center gap-2">
                          <CheckSquare className="h-4 w-4 text-gray-400" />
                          Tasks
                        </h4>
                        <button
                          onClick={() => {
                            setSelectedMilestoneForTask(milestone)
                            setTaskForm({
                              projectId: milestone.project.id,
                              milestoneId: milestone.id,
                              title: '',
                              description: '',
                              priority: 'MEDIUM',
                              dueDate: '',
                              categoryId: '',
                              assigneeId: ''
                            })
                            setIsAddTaskModalOpen(true)
                          }}
                          className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-md hover:bg-primary-700 flex items-center gap-1 font-medium"
                        >
                          <Plus className="h-3.5 w-3.5" />
                          Add Task
                        </button>
                      </div>

                      {tasks.length === 0 ? (
                        <div className="text-center py-6 bg-gray-50 rounded-lg border border-dashed border-gray-300">
                          <CheckSquare className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                          <p className="text-sm text-gray-500 mb-3">No tasks yet</p>
                          <button
                            onClick={() => {
                              setSelectedMilestoneForTask(milestone)
                              setTaskForm({
                                projectId: milestone.project.id,
                                milestoneId: milestone.id,
                                title: '',
                                description: '',
                                priority: 'MEDIUM',
                                dueDate: '',
                                categoryId: '',
                                assigneeId: ''
                              })
                              setIsAddTaskModalOpen(true)
                            }}
                            className="bg-primary-600 text-white text-sm px-4 py-2 rounded-md hover:bg-primary-700 inline-flex items-center gap-2 font-medium"
                          >
                            <Plus className="h-4 w-4" />
                            Add First Task
                          </button>
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {tasks.map((task: any) => (
                            <div
                              key={task.id}
                              className="flex items-start gap-3 p-3 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
                            >
                              {/* Task Status Icon - Clickable to cycle status */}
                              <button
                                onClick={() => {
                                  const nextStatus = task.status === 'TODO' ? 'IN_PROGRESS' :
                                    task.status === 'IN_PROGRESS' ? 'COMPLETED' : 'TODO'
                                  updateTaskStatusMutation.mutate({
                                    taskId: task.id,
                                    projectId: milestone.project.id,
                                    status: nextStatus
                                  })
                                }}
                                className="flex-shrink-0 mt-0.5 hover:scale-110 transition-transform"
                                title={`Click to change status (${task.status === 'TODO' ? 'Mark In Progress' : task.status === 'IN_PROGRESS' ? 'Mark Complete' : 'Mark Todo'})`}
                              >
                                {task.status === 'COMPLETED' ? (
                                  <CheckCircle2 className="h-5 w-5 text-green-500" />
                                ) : task.status === 'IN_PROGRESS' ? (
                                  <Clock className="h-5 w-5 text-blue-500" />
                                ) : (
                                  <Circle className="h-5 w-5 text-gray-300 hover:text-gray-400" />
                                )}
                              </button>

                              {/* Task Content */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-start justify-between gap-2">
                                  <div className="flex-1">
                                    <p className={`text-sm font-medium ${
                                      task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'
                                    }`}>
                                      {task.title}
                                    </p>
                                    {task.description && (
                                      <p className="text-xs text-gray-500 mt-1 line-clamp-2">{task.description}</p>
                                    )}
                                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                                      {task.assignee && (
                                        <span className="text-xs text-gray-600 flex items-center gap-1">
                                          <Users className="h-3 w-3" />
                                          {task.assignee.firstName} {task.assignee.lastName}
                                        </span>
                                      )}
                                      {task.dueDate && (
                                        <span className="text-xs text-gray-500 flex items-center gap-1">
                                          <Calendar className="h-3 w-3" />
                                          {new Date(task.dueDate).toLocaleDateString()}
                                        </span>
                                      )}
                                    </div>
                                  </div>

                                  {/* Status Dropdown and Priority */}
                                  <div className="flex items-center gap-2 flex-shrink-0">
                                    <select
                                      value={task.status}
                                      onChange={(e) => {
                                        updateTaskStatusMutation.mutate({
                                          taskId: task.id,
                                          projectId: milestone.project.id,
                                          status: e.target.value
                                        })
                                      }}
                                      className={`text-xs px-2 py-1 rounded border-0 cursor-pointer font-medium ${
                                        task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                        task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                        'bg-gray-100 text-gray-700'
                                      }`}
                                    >
                                      <option value="TODO">TODO</option>
                                      <option value="IN_PROGRESS">IN PROGRESS</option>
                                      <option value="COMPLETED">COMPLETED</option>
                                    </select>
                                    <span className={`text-xs px-2 py-0.5 rounded ${
                                      task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                      task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                      task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                      'bg-gray-100 text-gray-700'
                                    }`}>
                                      {task.priority}
                                    </span>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {activeTab === 'reviews' && (
        <div className="space-y-6">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Performance Reviews</h3>
            <button
              onClick={() => setIsReviewModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Review</span>
            </button>
          </div>

          {/* Aggregate Score Summary */}
          <div className="bg-white rounded-lg shadow border p-6">
            <h4 className="text-sm font-medium text-gray-500 uppercase tracking-wide mb-4">Overall Performance Score</h4>
            <VendorScoreDisplay vendorId={vendorId} size="lg" showBreakdown={true} />
          </div>

          {vendor.reviews.length === 0 ? (
            <div className="bg-white rounded-lg shadow border p-12 text-center">
              <Star className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No reviews yet</p>
            </div>
          ) : (
            <div className="grid gap-6">
              {vendor.reviews.map((review) => (
                <div key={review.id} className="bg-white rounded-lg shadow border p-6">
                  <div className="flex justify-between items-start mb-4">
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <div className="flex">
                          {renderStars(review.overallRating)}
                        </div>
                        <span className="text-sm font-medium text-gray-900">
                          {review.overallRating.toFixed(1)}/5.0
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">
                        by {review.reviewerName} • {new Date(review.createdAt).toLocaleDateString()}
                      </p>
                      {review.projectName && (
                        <p className="text-sm text-gray-500">Project: {review.projectName}</p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                    {review.qualityRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.qualityRating}</div>
                        <div className="text-xs text-gray-500">Quality</div>
                      </div>
                    )}
                    {review.timelinessRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.timelinessRating}</div>
                        <div className="text-xs text-gray-500">Timeliness</div>
                      </div>
                    )}
                    {review.communicationRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.communicationRating}</div>
                        <div className="text-xs text-gray-500">Communication</div>
                      </div>
                    )}
                    {review.professionalismRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.professionalismRating}</div>
                        <div className="text-xs text-gray-500">Professionalism</div>
                      </div>
                    )}
                    {review.pricingAccuracyRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.pricingAccuracyRating}</div>
                        <div className="text-xs text-gray-500">Pricing</div>
                      </div>
                    )}
                    {review.safetyComplianceRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.safetyComplianceRating}</div>
                        <div className="text-xs text-gray-500">Safety</div>
                      </div>
                    )}
                    {review.problemResolutionRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.problemResolutionRating}</div>
                        <div className="text-xs text-gray-500">Problem Resolution</div>
                      </div>
                    )}
                    {review.documentationRating && (
                      <div className="text-center">
                        <div className="text-lg font-semibold text-gray-900">{review.documentationRating}</div>
                        <div className="text-xs text-gray-500">Documentation</div>
                      </div>
                    )}
                  </div>
                  {review.comments && (
                    <div className="bg-gray-50 rounded-md p-3">
                      <p className="text-sm text-gray-900">{review.comments}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {activeTab === 'comments' && (
        <div className="bg-white rounded-lg shadow border p-6">
          <VendorCommentsTab vendorId={vendorId} />
        </div>
      )}

      {activeTab === 'contracts' && (
        <div className="bg-white rounded-lg shadow border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
            <h3 className="text-lg font-medium text-gray-900">Contracts</h3>
            <button
              onClick={() => setIsContractModalOpen(true)}
              className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Add Contract</span>
            </button>
          </div>
          {isLoadingContracts ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
              <p className="text-sm text-gray-500 mt-2">Loading contracts...</p>
            </div>
          ) : contractsError ? (
            <div className="p-12 text-center">
              <AlertCircle className="h-12 w-12 mx-auto text-red-400 mb-4" />
              <p className="text-red-500">Failed to load contracts</p>
              <p className="text-sm text-gray-400 mt-1">{(contractsError as Error).message}</p>
              <button
                onClick={() => refetchContracts()}
                className="mt-4 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                Retry
              </button>
            </div>
          ) : contracts.length === 0 ? (
            <div className="p-12 text-center">
              <Briefcase className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <p className="text-gray-500">No contracts yet</p>
              <p className="text-sm text-gray-400 mt-1">Add a contract to track agreements with this vendor</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contract #
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Type
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Amount
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Duration
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {contracts.map((contract) => (
                    <tr
                      key={contract.id}
                      className="hover:bg-gray-50 cursor-pointer"
                      onClick={() => setSelectedContract(contract)}
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{contract.contractNumber}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                          {getContractTypeLabel(contract.type)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">
                          {formatCurrency(contract.totalSum)}
                        </div>
                        {contract.retentionPercent && contract.retentionPercent > 0 && (
                          <div className="text-xs text-gray-500">
                            {contract.retentionPercent}% retention
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>{new Date(contract.startDate).toLocaleDateString()}</div>
                        {contract.endDate ? (
                          <div>to {new Date(contract.endDate).toLocaleDateString()}</div>
                        ) : (
                          <div className="text-gray-400 italic">Ongoing</div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getContractStatusBadge(contract.status)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'catalog' && (
        <VendorProcurementTab vendorId={vendorId} vendorType={vendor.type} />
      )}

      {activeTab === 'purchase-orders' && (
        <VendorPurchaseOrdersTab vendorId={vendorId} />
      )}

      {activeTab === 'portal' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow border p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
                  portalAccess?.hasPortalAccess ? 'bg-green-100' : 'bg-gray-100'
                }`}>
                  <Key className={`h-6 w-6 ${
                    portalAccess?.hasPortalAccess ? 'text-green-600' : 'text-gray-400'
                  }`} />
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Vendor Portal Access</h3>
                  <p className="text-sm text-gray-500">
                    {portalAccess?.hasPortalAccess
                      ? 'Vendor can access the portal'
                      : 'Portal access not configured'}
                  </p>
                </div>
              </div>
              {portalAccess?.hasPortalAccess ? (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-800">
                  <Check className="h-4 w-4" />
                  Enabled
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium bg-gray-100 text-gray-800">
                  <X className="h-4 w-4" />
                  Disabled
                </span>
              )}
            </div>

            {portalAccess?.hasPortalAccess ? (
              <div className="space-y-4">
                <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                  <div>
                    <span className="text-sm font-medium text-gray-500">Portal Email:</span>
                    <p className="text-gray-900">{portalAccess.portalEmail}</p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Last Login:</span>
                    <p className="text-gray-900">
                      {portalAccess.lastLogin
                        ? new Date(portalAccess.lastLogin).toLocaleString()
                        : 'Never'}
                    </p>
                  </div>
                  <div>
                    <span className="text-sm font-medium text-gray-500">Portal URL:</span>
                    <p className="text-primary-600">
                      {typeof window !== 'undefined' ? `${window.location.origin}/vendor/login` : '/vendor/login'}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setPortalForm({
                        email: portalAccess.portalEmail || '',
                        password: '',
                        confirmPassword: ''
                      })
                      setIsPortalModalOpen(true)
                    }}
                    className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                  >
                    <Edit className="h-4 w-4" />
                    <span>Update Credentials</span>
                  </button>
                  <button
                    onClick={() => {
                      if (confirm('Are you sure you want to disable portal access for this vendor?')) {
                        disablePortalMutation.mutate()
                      }
                    }}
                    disabled={disablePortalMutation.isPending}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 flex items-center space-x-2 disabled:opacity-50"
                  >
                    <Lock className="h-4 w-4" />
                    <span>{disablePortalMutation.isPending ? 'Disabling...' : 'Disable Access'}</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-600">
                  Enable portal access to allow this vendor to log in and view their assigned tasks,
                  contracts, payments, and ratings.
                </p>
                <button
                  onClick={() => {
                    setPortalForm({
                      email: vendor?.email || '',
                      password: '',
                      confirmPassword: ''
                    })
                    setIsPortalModalOpen(true)
                  }}
                  className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center space-x-2"
                >
                  <Key className="h-4 w-4" />
                  <span>Enable Portal Access</span>
                </button>
              </div>
            )}
          </div>

          {/* Portal Info Card */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-900 mb-2">What vendors can access:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• View their assigned tasks and update progress</li>
              <li>• Access contract details and documents</li>
              <li>• View payment history</li>
              <li>• See their performance ratings and reviews</li>
            </ul>
          </div>
        </div>
      )}

      {/* Portal Access Modal */}
      {isPortalModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">
                {portalAccess?.hasPortalAccess ? 'Update Portal Credentials' : 'Enable Portal Access'}
              </h3>
              <button
                onClick={() => setIsPortalModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (portalForm.password !== portalForm.confirmPassword) {
                  alert('Passwords do not match')
                  return
                }
                enablePortalMutation.mutate({
                  email: portalForm.email,
                  password: portalForm.password
                })
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Portal Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={portalForm.email}
                  onChange={(e) => setPortalForm({ ...portalForm, email: e.target.value })}
                  placeholder="vendor@example.com"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">
                  The email address the vendor will use to log in
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Password <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={portalForm.password}
                    onChange={(e) => setPortalForm({ ...portalForm, password: e.target.value })}
                    placeholder="Minimum 8 characters"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 pr-10 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                    minLength={8}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={portalForm.confirmPassword}
                  onChange={(e) => setPortalForm({ ...portalForm, confirmPassword: e.target.value })}
                  placeholder="Confirm password"
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                  minLength={8}
                />
                {portalForm.password && portalForm.confirmPassword && portalForm.password !== portalForm.confirmPassword && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>

              {enablePortalMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  {enablePortalMutation.error.message}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsPortalModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={enablePortalMutation.isPending || !portalForm.email || !portalForm.password || portalForm.password !== portalForm.confirmPassword}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {enablePortalMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>{portalAccess?.hasPortalAccess ? 'Update' : 'Enable Access'}</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Contract Modal */}
      {isContractModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Add Contract</h3>
              <button
                onClick={() => setIsContractModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                createContractMutation.mutate(contractForm)
              }}
              className="p-6 space-y-4"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    value={contractForm.contractNumber}
                    onChange={(e) => setContractForm({ ...contractForm, contractNumber: e.target.value })}
                    placeholder="e.g., CNT-2024-001"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Contract Type <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={contractForm.type}
                    onChange={(e) => setContractForm({ ...contractForm, type: e.target.value as typeof contractForm.type })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="LUMP_SUM">Lump Sum</option>
                    <option value="REMEASURABLE">Remeasurable</option>
                    <option value="ADDENDUM">Addendum</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Total Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      value={contractForm.totalSum}
                      onChange={(e) => setContractForm({ ...contractForm, totalSum: e.target.value })}
                      placeholder="0.00"
                      min="0"
                      step="0.01"
                      className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      required
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Retention %
                  </label>
                  <input
                    type="number"
                    value={contractForm.retentionPercent}
                    onChange={(e) => setContractForm({ ...contractForm, retentionPercent: e.target.value })}
                    placeholder="0"
                    min="0"
                    max="100"
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={contractForm.startDate}
                    onChange={(date) => setContractForm({ ...contractForm, startDate: date })}
                    placeholder="Select start date"
                    maxDate={contractForm.endDate ? new Date(contractForm.endDate) : undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={contractForm.endDate}
                    onChange={(date) => setContractForm({ ...contractForm, endDate: date })}
                    placeholder="Select end date"
                    minDate={contractForm.startDate ? new Date(contractForm.startDate) : undefined}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Warranty (Years)
                  </label>
                  <select
                    value={contractForm.warrantyYears}
                    onChange={(e) => setContractForm({ ...contractForm, warrantyYears: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((year) => (
                      <option key={year} value={year}>{year} year{year > 1 ? 's' : ''}</option>
                    ))}
                  </select>
                </div>
              </div>


              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Terms & Conditions
                </label>
                <textarea
                  value={contractForm.terms}
                  onChange={(e) => setContractForm({ ...contractForm, terms: e.target.value })}
                  rows={3}
                  placeholder="Contract terms and conditions..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes
                </label>
                <textarea
                  value={contractForm.notes}
                  onChange={(e) => setContractForm({ ...contractForm, notes: e.target.value })}
                  rows={2}
                  placeholder="Additional notes..."
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              {createContractMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  {createContractMutation.error.message}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setIsContractModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createContractMutation.isPending || !contractForm.contractNumber || !contractForm.totalSum || !contractForm.startDate || !contractForm.endDate}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {createContractMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Contract</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Review Modal */}
      <AddReviewModal
        vendorId={vendorId}
        isOpen={isReviewModalOpen}
        onClose={() => setIsReviewModalOpen(false)}
      />

      {/* Add Contact Modal */}
      <AddContactModal
        vendorId={vendorId}
        isOpen={isContactModalOpen}
        onClose={() => setIsContactModalOpen(false)}
      />

      {/* Edit Contact Modal */}
      <EditContactModal
        vendorId={vendorId}
        contact={selectedContact}
        isOpen={isEditContactModalOpen}
        onClose={() => {
          setIsEditContactModalOpen(false)
          setSelectedContact(null)
        }}
      />

      {/* Contract Detail Modal */}
      {selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Contract Details</h3>
                <p className="text-sm text-gray-500">{selectedContract.contractNumber}</p>
              </div>
              <button
                onClick={() => setSelectedContract(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Status and Type */}
                <div className="flex items-center gap-3">
                  {getContractStatusBadge(selectedContract.status)}
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                    {getContractTypeLabel(selectedContract.type)}
                  </span>
                </div>

                {/* Contract Value Summary */}
                <ContractSummaryCard contractId={selectedContract.id} />

                {/* Retention Info */}
                {selectedContract.retentionPercent && selectedContract.retentionPercent > 0 && (
                  <div className="bg-gray-50 rounded-lg p-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Retention Holdback</span>
                      <span className="font-medium text-gray-900">
                        {selectedContract.retentionPercent}%
                        {selectedContract.retentionAmount && (
                          <span className="text-gray-500 ml-1">
                            ({formatCurrency(selectedContract.retentionAmount)})
                          </span>
                        )}
                      </span>
                    </div>
                  </div>
                )}

                {/* Contract Line Items */}
                <ContractLineItems contractId={selectedContract.id} />

                {/* Change Orders */}
                <ContractChangeOrders contractId={selectedContract.id} />

                {/* Duration */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Start Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {new Date(selectedContract.startDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">End Date</p>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedContract.endDate ? new Date(selectedContract.endDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      }) : <span className="text-gray-400 italic">Not specified</span>}
                    </p>
                  </div>
                </div>

                {/* Warranty */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Warranty Period</p>
                  <p className="text-sm font-medium text-gray-900">
                    {selectedContract.warrantyYears} year{selectedContract.warrantyYears > 1 ? 's' : ''}
                  </p>
                </div>

                {/* Terms */}
                {selectedContract.terms && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Terms & Conditions</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContract.terms}</p>
                    </div>
                  </div>
                )}

                {/* Notes */}
                {selectedContract.notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <div className="bg-gray-50 rounded-lg p-3">
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedContract.notes}</p>
                    </div>
                  </div>
                )}

                {/* Documents Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center">
                      <Paperclip className="h-4 w-4 mr-1" />
                      Documents
                    </p>
                    <div>
                      <input
                        type="file"
                        ref={fileInputRef}
                        onChange={handleFileUpload}
                        className="hidden"
                        accept=".pdf,.doc,.docx,.xls,.xlsx,.jpg,.jpeg,.png,.gif"
                      />
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isUploadingDocument}
                        className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100 disabled:opacity-50"
                      >
                        {isUploadingDocument ? (
                          <>
                            <div className="animate-spin h-3 w-3 border-2 border-primary-600 border-t-transparent rounded-full mr-1" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Upload className="h-3 w-3 mr-1" />
                            Upload
                          </>
                        )}
                      </button>
                    </div>
                  </div>

                  {(!selectedContract.documents || selectedContract.documents.length === 0) ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <Paperclip className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No documents uploaded</p>
                      <p className="text-xs text-gray-400">Upload contracts, agreements, or other files</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedContract.documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100"
                        >
                          <div className="flex items-center space-x-3 flex-1 min-w-0">
                            <FileText className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-900 truncate">{doc.fileName}</p>
                              <p className="text-xs text-gray-500">
                                {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 ml-2">
                            <a
                              href={doc.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-gray-400 hover:text-primary-600 rounded"
                              title="Download"
                            >
                              <Download className="h-4 w-4" />
                            </a>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this document?')) {
                                  deleteDocumentMutation.mutate({
                                    contractId: selectedContract.id,
                                    documentId: doc.id
                                  })
                                }
                              }}
                              className="p-1.5 text-gray-400 hover:text-red-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Payments Section */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-sm font-medium text-gray-700 flex items-center">
                      <DollarSign className="h-4 w-4 mr-1" />
                      Payments
                    </p>
                    <button
                      type="button"
                      onClick={() => setIsAddPaymentModalOpen(true)}
                      className="inline-flex items-center px-3 py-1.5 text-xs font-medium text-primary-600 bg-primary-50 rounded-md hover:bg-primary-100"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Payment
                    </button>
                  </div>

                  {/* Payment Progress */}
                  {selectedContract.payments && selectedContract.payments.length > 0 && (
                    <div className="bg-blue-50 rounded-lg p-4 mb-4">
                      <div className="grid grid-cols-3 gap-4 mb-3">
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Contract Total</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {formatCurrency(selectedContract.totalSum)}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Total Paid</p>
                          <p className="text-lg font-semibold text-green-600">
                            {formatCurrency(
                              selectedContract.payments.reduce((sum, p) => sum + p.amount, 0)
                            )}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-600 mb-1">Remaining</p>
                          <p className="text-lg font-semibold text-blue-600">
                            {formatCurrency(
                              selectedContract.totalSum -
                              selectedContract.payments.reduce((sum, p) => sum + p.amount, 0)
                            )}
                          </p>
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              (selectedContract.payments.reduce((sum, p) => sum + p.amount, 0) / selectedContract.totalSum) * 100,
                              100
                            )}%`
                          }}
                        />
                      </div>
                      <p className="text-xs text-gray-600 mt-1 text-right">
                        {Math.round(
                          (selectedContract.payments.reduce((sum, p) => sum + p.amount, 0) / selectedContract.totalSum) * 100
                        )}% paid
                      </p>
                    </div>
                  )}

                  {(!selectedContract.payments || selectedContract.payments.length === 0) ? (
                    <div className="bg-gray-50 rounded-lg p-4 text-center">
                      <DollarSign className="h-8 w-8 mx-auto text-gray-300 mb-2" />
                      <p className="text-sm text-gray-500">No payments recorded</p>
                      <p className="text-xs text-gray-400">Track payments made for this contract</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {selectedContract.payments.map((payment) => (
                        <div
                          key={payment.id}
                          className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
                        >
                          <div className="flex-1">
                            <div className="flex items-center space-x-3">
                              <p className="text-sm font-semibold text-gray-900">
                                {formatCurrency(payment.amount)}
                              </p>
                              {payment.reference && (
                                <span className="text-xs text-gray-500">Ref: {payment.reference}</span>
                              )}
                            </div>
                            <div className="flex items-center space-x-4 mt-1">
                              <p className="text-xs text-gray-500">
                                {new Date(payment.paymentDate).toLocaleDateString()}
                              </p>
                              <p className="text-xs text-gray-400">
                                by {payment.createdBy.firstName} {payment.createdBy.lastName}
                              </p>
                            </div>
                            {payment.notes && (
                              <p className="text-xs text-gray-600 mt-1">{payment.notes}</p>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Created Date */}
                <div className="pt-4 border-t border-gray-200">
                  <p className="text-xs text-gray-400">
                    Created on {new Date(selectedContract.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end">
              <button
                onClick={() => setSelectedContract(null)}
                className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Payment Modal */}
      {isAddPaymentModalOpen && selectedContract && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60]">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Add Payment</h3>
              <button
                onClick={() => {
                  setIsAddPaymentModalOpen(false)
                  setPaymentForm({
                    amount: '',
                    paymentDate: new Date().toISOString().split('T')[0],
                    reference: '',
                    notes: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                handleAddPayment()
              }}
              className="p-6"
            >
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-2 text-gray-500">{currencySymbol}</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      required
                      value={paymentForm.amount}
                      onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Remaining: {formatCurrency(
                      selectedContract.totalSum -
                      (selectedContract.payments?.reduce((sum, p) => sum + p.amount, 0) || 0)
                    )}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Payment Date <span className="text-red-500">*</span>
                  </label>
                  <DatePicker
                    value={paymentForm.paymentDate}
                    onChange={(date) => setPaymentForm({ ...paymentForm, paymentDate: date })}
                    placeholder="Select payment date"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Reference Number
                  </label>
                  <input
                    type="text"
                    value={paymentForm.reference}
                    onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Invoice/Check number"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notes
                  </label>
                  <textarea
                    rows={3}
                    value={paymentForm.notes}
                    onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="Additional notes about this payment"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddPaymentModalOpen(false)
                    setPaymentForm({
                      amount: '',
                      paymentDate: new Date().toISOString().split('T')[0],
                      reference: '',
                      notes: ''
                    })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addPaymentMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 flex items-center"
                >
                  {addPaymentMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                      Adding...
                    </>
                  ) : (
                    'Add Payment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Vendor Modal */}
      {isEditModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-3xl w-full mx-4 max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center sticky top-0 bg-white">
              <h3 className="text-lg font-medium text-gray-900">Edit Vendor</h3>
              <button
                onClick={() => setIsEditModalOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault()
                updateVendorMutation.mutate(editForm)
              }}
              className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]"
            >
              <div className="space-y-6">
                {/* Basic Info */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Basic Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Contact Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.name}
                        onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Company Name <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={editForm.companyName}
                        onChange={(e) => setEditForm({ ...editForm, companyName: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                      <input
                        type="email"
                        value={editForm.email}
                        onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                      <input
                        type="tel"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Website</label>
                      <input
                        type="url"
                        value={editForm.website}
                        onChange={(e) => setEditForm({ ...editForm, website: e.target.value })}
                        placeholder="https://"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={editForm.categoryId}
                        onChange={(e) => setEditForm({ ...editForm, categoryId: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="">Select a category...</option>
                        {vendorCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.csiDivision ? `(CSI ${cat.csiDivision})` : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Delivery Type</label>
                      <select
                        value={editForm.type}
                        onChange={(e) => setEditForm({ ...editForm, type: e.target.value as typeof editForm.type })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      >
                        <option value="SUPPLY_AND_INSTALLATION">Supply & Installation</option>
                        <option value="SUPPLY">Supply Only</option>
                        <option value="INSTALLATION">Installation Only</option>
                      </select>
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Service Tags</label>
                      <VendorTagSelector
                        selectedTagIds={editForm.tagIds}
                        onChange={(tagIds) => setEditForm({ ...editForm, tagIds })}
                      />
                      <p className="mt-1 text-xs text-gray-500">Classify vendor capabilities</p>
                    </div>
                  </div>
                </div>

                {/* Address */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Address</h4>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Street Address</label>
                      <input
                        type="text"
                        value={editForm.address}
                        onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">City</label>
                        <input
                          type="text"
                          value={editForm.city}
                          onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">State</label>
                        <input
                          type="text"
                          value={editForm.state}
                          onChange={(e) => setEditForm({ ...editForm, state: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Zip Code</label>
                        <input
                          type="text"
                          value={editForm.zipCode}
                          onChange={(e) => setEditForm({ ...editForm, zipCode: e.target.value })}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Business Details */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Business Details</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">License Number</label>
                      <input
                        type="text"
                        value={editForm.licenseNumber}
                        onChange={(e) => setEditForm({ ...editForm, licenseNumber: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Insurance Info</label>
                      <input
                        type="text"
                        value={editForm.insuranceInfo}
                        onChange={(e) => setEditForm({ ...editForm, insuranceInfo: e.target.value })}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Scope of Work</label>
                      <textarea
                        value={editForm.scopeOfWork}
                        onChange={(e) => setEditForm({ ...editForm, scopeOfWork: e.target.value })}
                        rows={2}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">Payment Terms</label>
                      <input
                        type="text"
                        value={editForm.paymentTerms}
                        onChange={(e) => setEditForm({ ...editForm, paymentTerms: e.target.value })}
                        placeholder="e.g., Net 30"
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes & Status */}
                <div>
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Notes & Status</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        value={editForm.notes}
                        onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                        rows={3}
                        className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                    <div className="flex items-center">
                      <input
                        type="checkbox"
                        id="isActive"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                      <label htmlFor="isActive" className="ml-2 block text-sm text-gray-900">
                        Vendor is active
                      </label>
                    </div>
                  </div>
                </div>

                {updateVendorMutation.error && (
                  <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                    {updateVendorMutation.error.message}
                  </div>
                )}
              </div>

              <div className="flex justify-end space-x-3 pt-6 mt-6 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={updateVendorMutation.isPending || !editForm.name || !editForm.companyName}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {updateVendorMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Saving...</span>
                    </>
                  ) : (
                    <span>Save Changes</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {isAddMilestoneModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Add Milestone for {vendor.name}</h3>
              <button
                onClick={() => {
                  setIsAddMilestoneModalOpen(false)
                  setMilestoneForm({
                    projectId: '',
                    title: '',
                    description: '',
                    amount: '',
                    targetDate: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (milestoneForm.projectId && milestoneForm.title) {
                  createMilestoneMutation.mutate({
                    projectId: milestoneForm.projectId,
                    title: milestoneForm.title,
                    description: milestoneForm.description,
                    amount: milestoneForm.amount,
                    targetDate: milestoneForm.targetDate
                  })
                }
              }}
              className="p-6 space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Project <span className="text-red-500">*</span>
                </label>
                <select
                  value={milestoneForm.projectId}
                  onChange={(e) => setMilestoneForm(prev => ({ ...prev, projectId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  required
                >
                  <option value="">Select a project</option>
                  {allProjects.map((project: any) => (
                    <option key={project.id} value={project.id}>
                      {project.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={milestoneForm.title}
                  onChange={(e) => setMilestoneForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Milestone title"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={milestoneForm.description}
                  onChange={(e) => setMilestoneForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Optional description"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Amount</label>
                  <input
                    type="number"
                    value={milestoneForm.amount}
                    onChange={(e) => setMilestoneForm(prev => ({ ...prev, amount: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    placeholder="0.00"
                    min="0"
                    step="0.01"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Target Date</label>
                  <DatePicker
                    value={milestoneForm.targetDate}
                    onChange={(date) => setMilestoneForm(prev => ({ ...prev, targetDate: date }))}
                    placeholder="Select target date"
                  />
                </div>
              </div>

              <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                This milestone will be automatically assigned to <strong>{vendor.name}</strong>
              </p>

              {createMilestoneMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  {createMilestoneMutation.error.message}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddMilestoneModalOpen(false)
                    setMilestoneForm({
                      projectId: '',
                      title: '',
                      description: '',
                      amount: '',
                      targetDate: ''
                    })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMilestoneMutation.isPending || !milestoneForm.projectId || !milestoneForm.title}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {createMilestoneMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Milestone</span>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Task Modal */}
      {isAddTaskModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 overflow-y-auto py-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Create New Task</h3>
              </div>
              <button
                onClick={() => {
                  setIsAddTaskModalOpen(false)
                  setSelectedMilestoneForTask(null)
                  setTaskForm({
                    projectId: '',
                    milestoneId: '',
                    title: '',
                    description: '',
                    priority: 'MEDIUM',
                    dueDate: '',
                    categoryId: '',
                    assigneeId: ''
                  })
                }}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault()
                if (taskForm.title && taskForm.projectId) {
                  createTaskMutation.mutate({
                    projectId: taskForm.projectId,
                    milestoneId: taskForm.milestoneId,
                    title: taskForm.title,
                    description: taskForm.description,
                    priority: taskForm.priority,
                    categoryId: taskForm.categoryId,
                    assigneeId: taskForm.assigneeId,
                    dueDate: taskForm.dueDate
                  })
                }
              }}
              className="p-6 space-y-4"
            >
              {/* Project Selection - Only show if no milestone pre-selected */}
              {!selectedMilestoneForTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Project <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.projectId}
                    onChange={(e) => {
                      setTaskForm(prev => ({ ...prev, projectId: e.target.value, milestoneId: '', categoryId: '' }))
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                    required
                  >
                    <option value="">Select a project...</option>
                    {/* Get unique projects from milestones */}
                    {Array.from(new Map(projectMilestones.map((m: any) => [m.project.id, m.project])).values()).map((project: any) => (
                      <option key={project.id} value={project.id}>
                        {project.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Milestone Selection - Only show if no milestone pre-selected but project is selected */}
              {!selectedMilestoneForTask && taskForm.projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    Milestone
                  </label>
                  <select
                    value={taskForm.milestoneId}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, milestoneId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">No milestone (standalone task)</option>
                    {projectMilestones
                      .filter((m: any) => m.project.id === taskForm.projectId)
                      .map((milestone: any) => (
                        <option key={milestone.id} value={milestone.id}>
                          {milestone.title}
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {/* Task Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={taskForm.title}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Install electrical wiring"
                  required
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={taskForm.description}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="Task details and requirements..."
                  rows={3}
                />
              </div>

              {/* Priority and Due Date */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Priority <span className="text-red-500">*</span>
                  </label>
                  <select
                    value={taskForm.priority}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as typeof taskForm.priority }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="LOW">Low</option>
                    <option value="MEDIUM">Medium</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Due Date</label>
                  <DatePicker
                    value={taskForm.dueDate}
                    onChange={(date) => setTaskForm(prev => ({ ...prev, dueDate: date }))}
                    placeholder="Select due date"
                  />
                </div>
              </div>

              {/* Category - Only show if project is selected */}
              {taskForm.projectId && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                  <select
                    value={taskForm.categoryId}
                    onChange={(e) => setTaskForm(prev => ({ ...prev, categoryId: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="">Uncategorized</option>
                    {projectCategories.map((category: any) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Milestone Info - Only show if milestone was pre-selected */}
              {selectedMilestoneForTask && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    <Target className="h-4 w-4 text-gray-400" />
                    Milestone
                  </label>
                  <div className="px-3 py-2 bg-gray-50 border border-gray-200 rounded-md text-sm text-gray-700">
                    {selectedMilestoneForTask.title}
                  </div>
                </div>
              )}

              {/* Assign To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Assign To</label>
                <select
                  value={taskForm.assigneeId}
                  onChange={(e) => setTaskForm(prev => ({ ...prev, assigneeId: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">Unassigned</option>
                  {teamMembers.map((member: any) => (
                    <option key={member.id} value={member.id}>
                      {member.firstName} {member.lastName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Project Info - Only show if milestone was pre-selected */}
              {selectedMilestoneForTask && (
                <p className="text-sm text-gray-500 bg-gray-50 p-3 rounded-md">
                  Project: <strong>{selectedMilestoneForTask.project.title}</strong>
                </p>
              )}

              {createTaskMutation.error && (
                <div className="bg-red-50 border border-red-200 rounded-md p-3 text-red-800 text-sm">
                  {createTaskMutation.error.message}
                </div>
              )}

              <div className="flex justify-end space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddTaskModalOpen(false)
                    setSelectedMilestoneForTask(null)
                    setTaskForm({
                      projectId: '',
                      milestoneId: '',
                      title: '',
                      description: '',
                      priority: 'MEDIUM',
                      dueDate: '',
                      categoryId: '',
                      assigneeId: ''
                    })
                  }}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || !taskForm.title || !taskForm.projectId}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
                >
                  {createTaskMutation.isPending ? (
                    <>
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <span>Create Task</span>
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