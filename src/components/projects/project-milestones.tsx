'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  Plus,
  Target,
  Calendar,
  DollarSign,
  Building2,
  Check,
  Clock,
  AlertCircle,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  ChevronUp,
  CheckCircle2,
  Circle,
  ListChecks,
  User,
  Users
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

interface ProjectMilestonesProps {
  projectId: string
}

interface Task {
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
}

interface ChecklistItem {
  id: string
  title: string
  description?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'SKIPPED'
  order: number
  dueDate?: string
  completedAt?: string
  completedBy?: {
    id: string
    firstName: string
    lastName: string
  }
}

interface UserRef {
  id: string
  firstName: string
  lastName: string
}

interface ContactRef {
  id: string
  firstName: string
  lastName: string
  email?: string
  phone?: string
  position?: string
}

interface Milestone {
  id: string
  title: string
  description?: string
  amount?: number
  targetDate?: string
  completedDate?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  order: number
  vendor?: {
    id: string
    name: string
    companyName: string
  }
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  responsibleUser?: UserRef
  documenterUser?: UserRef
  assignedContact?: ContactRef
  createdAt: string
  tasks?: Task[]
  checklistItems?: ChecklistItem[]
  completedTasksCount?: number
  totalTasksCount?: number
  progress?: number
  checklistProgress?: number
  completedChecklistItems?: number
  totalChecklistItems?: number
}

interface Vendor {
  id: string
  name: string
  companyName: string
}

type SortColumn = 'title' | 'status' | 'targetDate' | 'amount' | 'vendor' | 'progress' | 'checklist' | null
type SortDirection = 'asc' | 'desc'

async function fetchMilestones(projectId: string): Promise<Milestone[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/milestones?includeTasks=true`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch milestones')
  return response.json()
}

async function fetchVendors(): Promise<Vendor[]> {
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

async function fetchTeamMembers(): Promise<UserRef[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/team', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) return []
  const data = await response.json()
  return data.members || data || []
}

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [newChecklistItem, setNewChecklistItem] = useState<{ milestoneId: string; title: string } | null>(null)
  const [sortColumn, setSortColumn] = useState<SortColumn>(null)
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    targetDate: '',
    vendorId: '',
    status: 'PENDING' as Milestone['status'],
    responsibleUserId: '',
    documenterUserId: '',
    assignedContactId: ''
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

  const handleSort = (column: SortColumn) => {
    if (sortColumn === column) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: () => fetchMilestones(projectId),
    enabled: !!projectId
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: () => fetchVendors()
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: () => fetchTeamMembers()
  })

  // Sort milestones
  const sortedMilestones = [...milestones].sort((a, b) => {
    if (!sortColumn) {
      return a.order - b.order
    }

    const multiplier = sortDirection === 'asc' ? 1 : -1

    switch (sortColumn) {
      case 'title':
        return a.title.localeCompare(b.title) * multiplier
      case 'status': {
        const statusOrder = { OVERDUE: 0, IN_PROGRESS: 1, PENDING: 2, COMPLETED: 3 }
        return (statusOrder[a.status] - statusOrder[b.status]) * multiplier
      }
      case 'targetDate': {
        const dateA = a.targetDate ? new Date(a.targetDate).getTime() : Number.MAX_VALUE
        const dateB = b.targetDate ? new Date(b.targetDate).getTime() : Number.MAX_VALUE
        return (dateA - dateB) * multiplier
      }
      case 'amount':
        return ((a.amount || 0) - (b.amount || 0)) * multiplier
      case 'vendor':
        return (a.vendor?.name || '').localeCompare(b.vendor?.name || '') * multiplier
      case 'progress': {
        const progressA = a.progress || 0
        const progressB = b.progress || 0
        return (progressA - progressB) * multiplier
      }
      case 'checklist': {
        const checkA = a.checklistProgress || 0
        const checkB = b.checklistProgress || 0
        return (checkA - checkB) * multiplier
      }
      default:
        return a.order - b.order
    }
  })

  const createMutation = useMutation({
    mutationFn: async (data: typeof formData) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${projectId}/milestones`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create milestone')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      toast.success('Milestone created')
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create milestone')
    }
  })

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Partial<typeof formData> }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/milestones/${id}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update milestone')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      toast.success('Milestone updated')
      closeModal()
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update milestone')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/milestones/${id}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete milestone')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      toast.success('Milestone deleted')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete milestone')
    }
  })

  const addChecklistItemMutation = useMutation({
    mutationFn: async ({ milestoneId, title }: { milestoneId: string; title: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/milestones/${milestoneId}/checklist`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ title })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add checklist item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      setNewChecklistItem(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add checklist item')
    }
  })

  const updateChecklistItemMutation = useMutation({
    mutationFn: async ({ milestoneId, itemId, data }: { milestoneId: string; itemId: string; data: Partial<ChecklistItem> }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/milestones/${milestoneId}/checklist/${itemId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(data)
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update checklist item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update checklist item')
    }
  })

  const deleteChecklistItemMutation = useMutation({
    mutationFn: async ({ milestoneId, itemId }: { milestoneId: string; itemId: string }) => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/milestones/${milestoneId}/checklist/${itemId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete checklist item')
      }
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete checklist item')
    }
  })

  const openModal = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone)
      setFormData({
        title: milestone.title,
        description: milestone.description || '',
        amount: milestone.amount?.toString() || '',
        targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '',
        vendorId: milestone.vendor?.id || '',
        status: milestone.status,
        responsibleUserId: milestone.responsibleUser?.id || '',
        documenterUserId: milestone.documenterUser?.id || '',
        assignedContactId: milestone.assignedContact?.id || ''
      })
    } else {
      setEditingMilestone(null)
      setFormData({
        title: '',
        description: '',
        amount: '',
        targetDate: '',
        vendorId: '',
        status: 'PENDING',
        responsibleUserId: '',
        documenterUserId: '',
        assignedContactId: ''
      })
    }
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingMilestone(null)
    setFormData({
      title: '',
      description: '',
      amount: '',
      targetDate: '',
      vendorId: '',
      status: 'PENDING',
      responsibleUserId: '',
      documenterUserId: '',
      assignedContactId: ''
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingMilestone) {
      updateMutation.mutate({ id: editingMilestone.id, data: formData })
    } else {
      createMutation.mutate(formData)
    }
  }

  const handleStatusChange = (milestoneId: string, newStatus: Milestone['status']) => {
    const completedDate = newStatus === 'COMPLETED' ? new Date().toISOString() : null
    updateMutation.mutate({
      id: milestoneId,
      data: {
        status: newStatus,
        ...(completedDate && { completedDate })
      }
    })
  }

  // Calculate stats
  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length
  const inProgressCount = milestones.filter(m => m.status === 'IN_PROGRESS').length
  const overdueCount = milestones.filter(m => m.status === 'OVERDUE').length
  const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0)
  const completedAmount = milestones.filter(m => m.status === 'COMPLETED').reduce((sum, m) => sum + (m.amount || 0), 0)
  const overallProgress = milestones.length > 0 ? Math.round((completedCount / milestones.length) * 100) : 0

  const SortIcon = ({ column }: { column: SortColumn }) => {
    if (sortColumn !== column) return null
    return sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Header Stats Bar */}
      <div className="bg-slate-800 rounded-lg p-2.5 text-white">
        <div className="grid grid-cols-3 md:grid-cols-6 gap-2 text-center">
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${overallProgress >= 80 ? 'text-emerald-400' : overallProgress >= 50 ? 'text-amber-400' : 'text-slate-300'}`}>
              {overallProgress}%
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Progress</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{milestones.length}</div>
            <div className="text-[10px] text-slate-400 uppercase">Total</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-emerald-400">{completedCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Done</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-blue-400">{inProgressCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Active</div>
          </div>
          <div className="flex flex-col items-center">
            <div className={`text-xl font-bold ${overdueCount > 0 ? 'text-red-400' : 'text-slate-300'}`}>{overdueCount}</div>
            <div className="text-[10px] text-slate-400 uppercase">Overdue</div>
          </div>
          <div className="flex flex-col items-center">
            <div className="text-xl font-bold text-slate-100">{formatCurrency(completedAmount)}</div>
            <div className="text-[10px] text-slate-400 uppercase">Earned</div>
          </div>
        </div>
      </div>

      {/* Compact Toolbar */}
      <div className="flex items-center justify-between gap-2 px-1">
        <div className="text-xs text-gray-500">
          {totalAmount > 0 && <span>{formatCurrency(completedAmount)} of {formatCurrency(totalAmount)} total value</span>}
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-2.5 py-1.5 bg-primary-600 text-white text-xs rounded hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-3 w-3 mr-1" />
          Add Milestone
        </button>
      </div>

      {/* Excel-like Table */}
      {milestones.length === 0 ? (
        <div className="border border-gray-200 rounded-lg p-8 text-center bg-gray-50">
          <Target className="h-8 w-8 mx-auto text-gray-400 mb-2" />
          <p className="text-sm text-gray-500">No milestones yet</p>
          <p className="text-xs text-gray-400 mt-1">Add milestones to track project progress</p>
        </div>
      ) : (
        <div className="border border-gray-300 rounded-lg overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-100 border-b border-gray-300">
                <th className="w-6 px-1 py-1.5 border-r border-gray-200"></th>
                <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[150px]"
                  onClick={() => handleSort('title')}
                >
                  <div className="flex items-center gap-1">
                    Milestone
                    <SortIcon column="title" />
                  </div>
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
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[85px]"
                  onClick={() => handleSort('targetDate')}
                >
                  <div className="flex items-center gap-1">
                    Due Date
                    <SortIcon column="targetDate" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[80px]"
                  onClick={() => handleSort('amount')}
                >
                  <div className="flex items-center justify-end gap-1">
                    Amount
                    <SortIcon column="amount" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[100px]"
                  onClick={() => handleSort('vendor')}
                >
                  <div className="flex items-center gap-1">
                    Vendor
                    <SortIcon column="vendor" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[60px]"
                  onClick={() => handleSort('progress')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Tasks
                    <SortIcon column="progress" />
                  </div>
                </th>
                <th
                  className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[60px]"
                  onClick={() => handleSort('checklist')}
                >
                  <div className="flex items-center justify-center gap-1">
                    Check
                    <SortIcon column="checklist" />
                  </div>
                </th>
                <th className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 w-[80px]">
                  Owner
                </th>
                <th className="px-2 py-1.5 text-center font-semibold text-gray-700 w-[50px]">
                  Act.
                </th>
              </tr>
            </thead>
            <tbody>
              {sortedMilestones.map((milestone, index) => {
                const isExpanded = expandedMilestones.has(milestone.id)
                const taskCount = milestone.totalTasksCount || milestone.tasks?.length || 0
                const completedTaskCount = milestone.completedTasksCount || milestone.tasks?.filter(t => t.status === 'COMPLETED').length || 0
                const checklistCount = milestone.totalChecklistItems || milestone.checklistItems?.length || 0
                const completedChecklistCount = milestone.completedChecklistItems || milestone.checklistItems?.filter(i => i.status === 'COMPLETED').length || 0
                const isOverdue = milestone.status === 'OVERDUE' || (milestone.targetDate && new Date(milestone.targetDate) < new Date() && milestone.status !== 'COMPLETED')

                return (
                  <>
                    <tr
                      key={milestone.id}
                      className={`border-b border-gray-200 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'} ${isOverdue ? 'bg-red-50' : ''}`}
                    >
                      {/* Expand */}
                      <td className="px-1 py-1 border-r border-gray-200 text-center">
                        <button
                          onClick={() => toggleMilestone(milestone.id)}
                          className="p-0.5 hover:bg-gray-200 rounded"
                        >
                          {isExpanded ? (
                            <ChevronDown className="h-3 w-3 text-gray-500" />
                          ) : (
                            <ChevronRight className="h-3 w-3 text-gray-500" />
                          )}
                        </button>
                      </td>

                      {/* Row Number */}
                      <td className="px-1 py-1 border-r border-gray-200 text-center text-gray-400">
                        {index + 1}
                      </td>

                      {/* Title */}
                      <td className="px-2 py-1 border-r border-gray-200">
                        <div className="font-medium text-gray-900 truncate">{milestone.title}</div>
                        {milestone.description && (
                          <div className="text-[10px] text-gray-500 truncate">{milestone.description}</div>
                        )}
                      </td>

                      {/* Status */}
                      <td className="px-2 py-1 border-r border-gray-200">
                        <select
                          value={milestone.status}
                          onChange={(e) => handleStatusChange(milestone.id, e.target.value as Milestone['status'])}
                          className={`text-[10px] border rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full ${
                            milestone.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                            milestone.status === 'IN_PROGRESS' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                            milestone.status === 'OVERDUE' ? 'bg-red-50 text-red-700 border-red-200' :
                            'bg-gray-50 text-gray-700 border-gray-200'
                          }`}
                        >
                          <option value="PENDING">Pending</option>
                          <option value="IN_PROGRESS">Active</option>
                          <option value="COMPLETED">Done</option>
                          <option value="OVERDUE">Overdue</option>
                        </select>
                      </td>

                      {/* Target Date */}
                      <td className={`px-2 py-1 border-r border-gray-200 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {milestone.targetDate ? new Date(milestone.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                      </td>

                      {/* Amount */}
                      <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700">
                        {milestone.amount ? formatCurrency(milestone.amount) : '-'}
                      </td>

                      {/* Vendor */}
                      <td className="px-2 py-1 border-r border-gray-200">
                        <select
                          value={milestone.vendor?.id || ''}
                          onChange={(e) => updateMutation.mutate({ id: milestone.id, data: { vendorId: e.target.value || undefined } })}
                          className="text-[10px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full truncate"
                        >
                          <option value="">-</option>
                          {vendors.map((vendor) => (
                            <option key={vendor.id} value={vendor.id}>{vendor.name}</option>
                          ))}
                        </select>
                      </td>

                      {/* Tasks Progress */}
                      <td className="px-2 py-1 border-r border-gray-200 text-center">
                        {taskCount > 0 ? (
                          <span className={`${completedTaskCount === taskCount ? 'text-green-600' : 'text-gray-600'}`}>
                            {completedTaskCount}/{taskCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Checklist Progress */}
                      <td className="px-2 py-1 border-r border-gray-200 text-center">
                        {checklistCount > 0 ? (
                          <span className={`${completedChecklistCount === checklistCount ? 'text-green-600' : 'text-gray-600'}`}>
                            {completedChecklistCount}/{checklistCount}
                          </span>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>

                      {/* Owner */}
                      <td className="px-2 py-1 border-r border-gray-200">
                        <select
                          value={milestone.responsibleUser?.id || ''}
                          onChange={(e) => updateMutation.mutate({ id: milestone.id, data: { responsibleUserId: e.target.value || undefined } })}
                          className="text-[10px] text-gray-700 border border-gray-200 rounded px-1 py-0.5 focus:outline-none focus:ring-1 focus:ring-primary-500 w-full truncate"
                        >
                          <option value="">-</option>
                          {teamMembers.map((member) => (
                            <option key={member.id} value={member.id}>{member.firstName} {member.lastName[0]}.</option>
                          ))}
                        </select>
                      </td>

                      {/* Actions */}
                      <td className="px-1 py-1 text-center">
                        <div className="flex items-center justify-center gap-0.5">
                          <button
                            onClick={() => openModal(milestone)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 rounded"
                          >
                            <Edit className="h-3 w-3" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm('Delete this milestone?')) {
                                deleteMutation.mutate(milestone.id)
                              }
                            }}
                            className="p-0.5 text-gray-400 hover:text-red-600 rounded"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Expanded Content */}
                    {isExpanded && (
                      <tr key={`${milestone.id}-expanded`} className="bg-slate-50 border-b border-gray-200">
                        <td colSpan={11} className="p-0">
                          <div className="px-4 py-2 space-y-2">
                            {/* Checklist Items Table */}
                            <div className="border border-gray-200 rounded bg-white">
                              <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                  <ListChecks className="h-3 w-3" />
                                  Checklist
                                  {checklistCount > 0 && (
                                    <span className="text-gray-500 font-normal">({completedChecklistCount}/{checklistCount})</span>
                                  )}
                                </div>
                                <button
                                  onClick={() => setNewChecklistItem({ milestoneId: milestone.id, title: '' })}
                                  className="text-[10px] text-primary-600 hover:text-primary-700 flex items-center gap-0.5"
                                >
                                  <Plus className="h-2.5 w-2.5" />
                                  Add
                                </button>
                              </div>
                              <div className="divide-y divide-gray-100">
                                {milestone.checklistItems && milestone.checklistItems.map((item) => (
                                  <div key={item.id} className="px-2 py-1.5 flex items-center gap-2 hover:bg-gray-50 group">
                                    <button
                                      onClick={() => updateChecklistItemMutation.mutate({
                                        milestoneId: milestone.id,
                                        itemId: item.id,
                                        data: { status: item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
                                      })}
                                      className="flex-shrink-0"
                                    >
                                      {item.status === 'COMPLETED' ? (
                                        <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />
                                      ) : (
                                        <Circle className="h-3.5 w-3.5 text-gray-400 hover:text-gray-600" />
                                      )}
                                    </button>
                                    <span className={`flex-1 text-xs ${item.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                      {item.title}
                                    </span>
                                    {item.completedBy && (
                                      <span className="text-[10px] text-gray-400">
                                        {item.completedBy.firstName[0]}{item.completedBy.lastName[0]}
                                      </span>
                                    )}
                                    <button
                                      onClick={() => deleteChecklistItemMutation.mutate({ milestoneId: milestone.id, itemId: item.id })}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 text-gray-400 hover:text-red-600"
                                    >
                                      <Trash2 className="h-2.5 w-2.5" />
                                    </button>
                                  </div>
                                ))}
                                {newChecklistItem?.milestoneId === milestone.id && (
                                  <div className="px-2 py-1.5 flex items-center gap-2">
                                    <Circle className="h-3.5 w-3.5 text-gray-300 flex-shrink-0" />
                                    <input
                                      type="text"
                                      value={newChecklistItem.title}
                                      onChange={(e) => setNewChecklistItem({ ...newChecklistItem, title: e.target.value })}
                                      onKeyDown={(e) => {
                                        if (e.key === 'Enter' && newChecklistItem.title.trim()) {
                                          addChecklistItemMutation.mutate({ milestoneId: milestone.id, title: newChecklistItem.title.trim() })
                                        } else if (e.key === 'Escape') {
                                          setNewChecklistItem(null)
                                        }
                                      }}
                                      placeholder="Add item..."
                                      className="flex-1 text-xs border-none bg-transparent focus:outline-none focus:ring-0 p-0"
                                      autoFocus
                                    />
                                    <button
                                      onClick={() => newChecklistItem.title.trim() && addChecklistItemMutation.mutate({ milestoneId: milestone.id, title: newChecklistItem.title.trim() })}
                                      className="text-[10px] text-primary-600 hover:text-primary-700"
                                    >
                                      Add
                                    </button>
                                    <button onClick={() => setNewChecklistItem(null)} className="text-[10px] text-gray-500">
                                      Cancel
                                    </button>
                                  </div>
                                )}
                                {(!milestone.checklistItems || milestone.checklistItems.length === 0) && newChecklistItem?.milestoneId !== milestone.id && (
                                  <div className="px-2 py-2 text-center text-[10px] text-gray-400">No items</div>
                                )}
                              </div>
                            </div>

                            {/* Tasks Table */}
                            {milestone.tasks && milestone.tasks.length > 0 && (
                              <div className="border border-gray-200 rounded bg-white">
                                <div className="px-2 py-1.5 bg-gray-50 border-b border-gray-200 flex items-center gap-1.5 text-xs font-medium text-gray-700">
                                  <Target className="h-3 w-3" />
                                  Tasks ({completedTaskCount}/{taskCount})
                                </div>
                                <table className="w-full text-xs">
                                  <tbody>
                                    {milestone.tasks.map((task, taskIdx) => (
                                      <tr key={task.id} className={`border-b border-gray-100 last:border-0 ${taskIdx % 2 === 1 ? 'bg-gray-50' : ''}`}>
                                        <td className="px-2 py-1 w-6">
                                          {task.status === 'COMPLETED' ? (
                                            <CheckCircle2 className="h-3 w-3 text-green-500" />
                                          ) : (
                                            <Circle className="h-3 w-3 text-gray-400" />
                                          )}
                                        </td>
                                        <td className={`px-2 py-1 ${task.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                          {task.title}
                                        </td>
                                        <td className="px-2 py-1 w-20 text-gray-500">
                                          {task.assignee ? `${task.assignee.firstName} ${task.assignee.lastName[0]}.` : '-'}
                                        </td>
                                        <td className="px-2 py-1 w-20 text-gray-500">
                                          {task.dueDate ? new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '-'}
                                        </td>
                                        <td className="px-2 py-1 w-14">
                                          <span className={`text-[10px] px-1.5 py-0.5 rounded ${
                                            task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                                            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                                            task.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {task.priority[0]}
                                          </span>
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            )}

                            {/* Assignments Row */}
                            {(milestone.responsibleUser || milestone.documenterUser || milestone.assignedContact) && (
                              <div className="flex items-center gap-4 text-xs text-gray-600 px-1">
                                {milestone.responsibleUser && (
                                  <span className="flex items-center gap-1">
                                    <User className="h-3 w-3 text-blue-500" />
                                    <span className="text-gray-500">Owner:</span>
                                    {milestone.responsibleUser.firstName} {milestone.responsibleUser.lastName}
                                  </span>
                                )}
                                {milestone.documenterUser && (
                                  <span className="flex items-center gap-1">
                                    <Edit className="h-3 w-3 text-green-500" />
                                    <span className="text-gray-500">Doc:</span>
                                    {milestone.documenterUser.firstName} {milestone.documenterUser.lastName}
                                  </span>
                                )}
                                {milestone.assignedContact && (
                                  <span className="flex items-center gap-1">
                                    <Building2 className="h-3 w-3 text-purple-500" />
                                    <span className="text-gray-500">Contact:</span>
                                    {milestone.assignedContact.firstName} {milestone.assignedContact.lastName}
                                  </span>
                                )}
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                )
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-sm font-medium text-gray-900">
                {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-4 w-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  placeholder="e.g., Foundation Complete"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  rows={2}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Amount</label>
                  <div className="relative">
                    <DollarSign className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3 w-3 text-gray-400" />
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full text-sm border border-gray-300 rounded pl-6 pr-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Target Date</label>
                  <DatePicker
                    value={formData.targetDate}
                    onChange={(date) => setFormData({ ...formData, targetDate: date })}
                    placeholder="Select date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Vendor</label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                >
                  <option value="">No vendor assigned</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.companyName && `(${vendor.companyName})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="border-t border-gray-200 pt-3">
                <div className="text-xs font-medium text-gray-700 mb-2 flex items-center gap-1">
                  <Users className="h-3 w-3" />
                  Assignments
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Responsible</label>
                    <select
                      value={formData.responsibleUserId}
                      onChange={(e) => setFormData({ ...formData, responsibleUserId: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Not assigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] text-gray-500 mb-1">Documenter</label>
                    <select
                      value={formData.documenterUserId}
                      onChange={(e) => setFormData({ ...formData, documenterUserId: e.target.value })}
                      className="w-full text-xs border border-gray-300 rounded px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
                    >
                      <option value="">Not assigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {editingMilestone && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Status</label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Milestone['status'] })}
                    className="w-full text-sm border border-gray-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-primary-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-3 py-1.5 text-xs text-gray-700 border border-gray-300 rounded hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-3 py-1.5 text-xs bg-primary-600 text-white rounded hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingMilestone ? 'Save' : 'Add'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
