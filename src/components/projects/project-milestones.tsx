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

async function fetchVendors(companyId?: string): Promise<Vendor[]> {
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

  // Checklist item mutations
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

  const getStatusBadge = (status: Milestone['status']) => {
    const config = {
      PENDING: { bg: 'bg-gray-100', text: 'text-gray-800', label: 'Pending' },
      IN_PROGRESS: { bg: 'bg-blue-100', text: 'text-blue-800', label: 'In Progress' },
      COMPLETED: { bg: 'bg-green-100', text: 'text-green-800', label: 'Completed' },
      OVERDUE: { bg: 'bg-red-100', text: 'text-red-800', label: 'Overdue' }
    }
    const { bg, text, label } = config[status]
    return (
      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${bg} ${text}`}>
        {label}
      </span>
    )
  }

  const getStatusIcon = (status: Milestone['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <Check className="h-5 w-5 text-green-500" />
      case 'IN_PROGRESS':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'OVERDUE':
        return <AlertCircle className="h-5 w-5 text-red-500" />
      default:
        return <Target className="h-5 w-5 text-gray-400" />
    }
  }

  // Calculate progress
  const completedCount = milestones.filter(m => m.status === 'COMPLETED').length
  const totalAmount = milestones.reduce((sum, m) => sum + (m.amount || 0), 0)
  const completedAmount = milestones.filter(m => m.status === 'COMPLETED').reduce((sum, m) => sum + (m.amount || 0), 0)

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Project Milestones</h2>
          <p className="text-sm text-gray-500">
            {completedCount} of {milestones.length} completed
            {totalAmount > 0 && ` • ${formatCurrency(completedAmount)} of ${formatCurrency(totalAmount)}`}
          </p>
        </div>
        <button
          onClick={() => openModal()}
          className="inline-flex items-center px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
        >
          <Plus className="h-4 w-4 mr-2" />
          Add Milestone
        </button>
      </div>

      {/* Progress Bar */}
      {milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow border p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Overall Progress</span>
            <span className="text-sm font-medium text-gray-900">
              {Math.round((completedCount / milestones.length) * 100)}%
            </span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div
              className="bg-primary-600 h-2 rounded-full transition-all duration-300"
              style={{ width: `${(completedCount / milestones.length) * 100}%` }}
            />
          </div>
        </div>
      )}

      {/* Milestones List */}
      {milestones.length === 0 ? (
        <div className="bg-white rounded-lg shadow border p-12 text-center">
          <Target className="h-12 w-12 mx-auto text-gray-400 mb-4" />
          <p className="text-gray-500">No milestones yet</p>
          <p className="text-sm text-gray-400 mt-1">Add milestones to track project progress</p>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow border">
          <div className="divide-y divide-gray-200">
            {milestones.map((milestone, index) => {
              const isExpanded = expandedMilestones.has(milestone.id)
              const taskCount = milestone.totalTasksCount || milestone.tasks?.length || 0
              const completedCount = milestone.completedTasksCount || milestone.tasks?.filter(t => t.status === 'COMPLETED').length || 0
              const progress = milestone.progress || (taskCount > 0 ? Math.round((completedCount / taskCount) * 100) : 0)

              return (
                <div key={milestone.id} className="hover:bg-gray-50">
                  <div className="p-4">
                    <div className="flex items-start gap-4">
                      {/* Expand/Collapse Button */}
                      <button
                        onClick={() => toggleMilestone(milestone.id)}
                        className="flex-shrink-0 mt-1 p-0.5 hover:bg-gray-200 rounded"
                      >
                        {isExpanded ? (
                          <ChevronDown className="h-4 w-4 text-gray-500" />
                        ) : (
                          <ChevronRight className="h-4 w-4 text-gray-500" />
                        )}
                      </button>

                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(milestone.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 flex-wrap">
                              <h3 className="text-sm font-medium text-gray-900">{milestone.title}</h3>
                              {taskCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({completedCount}/{taskCount} tasks)
                                </span>
                              )}
                              {milestone.checklistItems && milestone.checklistItems.length > 0 && (
                                <span className="inline-flex items-center gap-1 text-xs text-gray-500">
                                  <ListChecks className="h-3 w-3" />
                                  {milestone.completedChecklistItems || milestone.checklistItems.filter(i => i.status === 'COMPLETED').length}/{milestone.totalChecklistItems || milestone.checklistItems.length}
                                </span>
                              )}
                            </div>
                            {milestone.description && (
                              <p className="text-sm text-gray-500 mt-1">{milestone.description}</p>
                            )}

                            {/* Progress Bar */}
                            {taskCount > 0 && (
                              <div className="mt-2">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>Task Progress</span>
                                  <span className="font-medium">{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-blue-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
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
                              {milestone.vendor && (
                                <span className="inline-flex items-center text-sm text-gray-600">
                                  <Building2 className="h-4 w-4 mr-1 text-gray-400" />
                                  {milestone.vendor.name}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            {getStatusBadge(milestone.status)}

                            {/* Status Dropdown */}
                            <div className="relative group">
                              <button className="p-1 text-gray-400 hover:text-gray-600 rounded">
                                <ChevronDown className="h-4 w-4" />
                              </button>
                              <div className="absolute right-0 mt-1 w-40 bg-white rounded-md shadow-lg border opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
                                <div className="py-1">
                                  {(['PENDING', 'IN_PROGRESS', 'COMPLETED', 'OVERDUE'] as const).map((status) => (
                                    <button
                                      key={status}
                                      onClick={() => handleStatusChange(milestone.id, status)}
                                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 ${
                                        milestone.status === status ? 'bg-gray-50 font-medium' : ''
                                      }`}
                                    >
                                      {status.replace('_', ' ')}
                                    </button>
                                  ))}
                                </div>
                              </div>
                            </div>

                            <button
                              onClick={() => openModal(milestone)}
                              className="p-1 text-gray-400 hover:text-gray-600 rounded"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => {
                                if (confirm('Are you sure you want to delete this milestone?')) {
                                  deleteMutation.mutate(milestone.id)
                                }
                              }}
                              className="p-1 text-gray-400 hover:text-red-600 rounded"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Expanded Content (Checklist & Tasks) */}
                  {isExpanded && (
                    <div className="px-4 pb-4 ml-12 space-y-4">
                      {/* Checklist Items */}
                      <div className="bg-gray-50 rounded-lg border border-gray-200">
                        <div className="p-3 border-b border-gray-200 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <ListChecks className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Checklist</span>
                            {milestone.checklistItems && milestone.checklistItems.length > 0 && (
                              <span className="text-xs text-gray-500">
                                ({milestone.completedChecklistItems || milestone.checklistItems.filter(i => i.status === 'COMPLETED').length}/{milestone.totalChecklistItems || milestone.checklistItems.length})
                              </span>
                            )}
                          </div>
                          <button
                            onClick={() => setNewChecklistItem({ milestoneId: milestone.id, title: '' })}
                            className="text-xs text-primary-600 hover:text-primary-700 flex items-center gap-1"
                          >
                            <Plus className="h-3 w-3" />
                            Add Item
                          </button>
                        </div>
                        <div className="divide-y divide-gray-200">
                          {milestone.checklistItems && milestone.checklistItems.map((item) => (
                            <div key={item.id} className="p-3 flex items-start gap-3 hover:bg-gray-100 group">
                              <button
                                onClick={() => updateChecklistItemMutation.mutate({
                                  milestoneId: milestone.id,
                                  itemId: item.id,
                                  data: { status: item.status === 'COMPLETED' ? 'PENDING' : 'COMPLETED' }
                                })}
                                className="flex-shrink-0 mt-0.5"
                              >
                                {item.status === 'COMPLETED' ? (
                                  <CheckCircle2 className="h-4 w-4 text-green-500" />
                                ) : item.status === 'IN_PROGRESS' ? (
                                  <Clock className="h-4 w-4 text-blue-500" />
                                ) : item.status === 'SKIPPED' ? (
                                  <X className="h-4 w-4 text-gray-400" />
                                ) : (
                                  <Circle className="h-4 w-4 text-gray-400 hover:text-gray-600" />
                                )}
                              </button>
                              <div className="flex-1 min-w-0">
                                <p className={`text-sm ${item.status === 'COMPLETED' ? 'text-gray-500 line-through' : 'text-gray-900'}`}>
                                  {item.title}
                                </p>
                                {item.completedBy && item.completedAt && (
                                  <p className="text-xs text-gray-500 mt-1">
                                    Completed by {item.completedBy.firstName} {item.completedBy.lastName} on {new Date(item.completedAt).toLocaleDateString()}
                                  </p>
                                )}
                              </div>
                              <button
                                onClick={() => deleteChecklistItemMutation.mutate({ milestoneId: milestone.id, itemId: item.id })}
                                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-600 rounded"
                              >
                                <Trash2 className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                          {/* Add new checklist item input */}
                          {newChecklistItem?.milestoneId === milestone.id && (
                            <div className="p-3 flex items-center gap-2">
                              <Circle className="h-4 w-4 text-gray-300 flex-shrink-0" />
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
                                placeholder="Add checklist item..."
                                className="flex-1 text-sm border-none bg-transparent focus:outline-none focus:ring-0 p-0"
                                autoFocus
                              />
                              <button
                                onClick={() => {
                                  if (newChecklistItem.title.trim()) {
                                    addChecklistItemMutation.mutate({ milestoneId: milestone.id, title: newChecklistItem.title.trim() })
                                  }
                                }}
                                disabled={!newChecklistItem.title.trim() || addChecklistItemMutation.isPending}
                                className="text-xs text-primary-600 hover:text-primary-700 disabled:opacity-50"
                              >
                                Add
                              </button>
                              <button
                                onClick={() => setNewChecklistItem(null)}
                                className="text-xs text-gray-500 hover:text-gray-700"
                              >
                                Cancel
                              </button>
                            </div>
                          )}
                          {(!milestone.checklistItems || milestone.checklistItems.length === 0) && newChecklistItem?.milestoneId !== milestone.id && (
                            <div className="p-3 text-center text-xs text-gray-500">
                              No checklist items yet
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Tasks List */}
                      {milestone.tasks && milestone.tasks.length > 0 && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200">
                          <div className="p-3 border-b border-gray-200 flex items-center gap-2">
                            <Target className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Tasks</span>
                            <span className="text-xs text-gray-500">
                              ({milestone.tasks.filter(t => t.status === 'COMPLETED').length}/{milestone.tasks.length})
                            </span>
                          </div>
                          <div className="divide-y divide-gray-200">
                            {milestone.tasks.map((task) => (
                              <div key={task.id} className="p-3 flex items-start gap-3 hover:bg-gray-100">
                                <div className="flex-shrink-0 mt-0.5">
                                  {task.status === 'COMPLETED' ? (
                                    <CheckCircle2 className="h-4 w-4 text-green-500" />
                                  ) : (
                                    <Circle className="h-4 w-4 text-gray-400" />
                                  )}
                                </div>
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
                                      <div className="flex items-center gap-3 mt-2">
                                        {task.assignee && (
                                          <span className="text-xs text-gray-600">
                                            {task.assignee.firstName} {task.assignee.lastName}
                                          </span>
                                        )}
                                        {task.dueDate && (
                                          <span className="text-xs text-gray-500">
                                            Due: {new Date(task.dueDate).toLocaleDateString()}
                                          </span>
                                        )}
                                      </div>
                                    </div>
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
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Assigned Contacts Info */}
                      {(milestone.responsibleUser || milestone.documenterUser || milestone.assignedContact) && (
                        <div className="bg-gray-50 rounded-lg border border-gray-200 p-3">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="h-4 w-4 text-gray-500" />
                            <span className="text-sm font-medium text-gray-700">Assignments</span>
                          </div>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {milestone.responsibleUser && (
                              <div className="flex items-center gap-2">
                                <User className="h-3 w-3 text-blue-500" />
                                <div>
                                  <p className="text-xs text-gray-500">Responsible</p>
                                  <p className="text-sm text-gray-900">{milestone.responsibleUser.firstName} {milestone.responsibleUser.lastName}</p>
                                </div>
                              </div>
                            )}
                            {milestone.documenterUser && (
                              <div className="flex items-center gap-2">
                                <Edit className="h-3 w-3 text-green-500" />
                                <div>
                                  <p className="text-xs text-gray-500">Documenter</p>
                                  <p className="text-sm text-gray-900">{milestone.documenterUser.firstName} {milestone.documenterUser.lastName}</p>
                                </div>
                              </div>
                            )}
                            {milestone.assignedContact && (
                              <div className="flex items-center gap-2">
                                <Building2 className="h-3 w-3 text-purple-500" />
                                <div>
                                  <p className="text-xs text-gray-500">Vendor Contact</p>
                                  <p className="text-sm text-gray-900">{milestone.assignedContact.firstName} {milestone.assignedContact.lastName}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900">
                {editingMilestone ? 'Edit Milestone' : 'Add Milestone'}
              </h3>
              <button onClick={closeModal} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Title <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  placeholder="e.g., Foundation Complete"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  rows={3}
                  placeholder="Optional description..."
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Amount
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full border border-gray-300 rounded-md pl-9 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                      placeholder="0.00"
                      step="0.01"
                      min="0"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Target Date
                  </label>
                  <DatePicker
                    value={formData.targetDate}
                    onChange={(date) => setFormData({ ...formData, targetDate: date })}
                    placeholder="Select target date"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Assign to Vendor
                </label>
                <select
                  value={formData.vendorId}
                  onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
                  className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="">No vendor assigned</option>
                  {vendors.map((vendor) => (
                    <option key={vendor.id} value={vendor.id}>
                      {vendor.name} {vendor.companyName && `(${vendor.companyName})`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Contact Linking Section */}
              <div className="border-t border-gray-200 pt-4 mt-4">
                <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Assignment & Responsibility
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Responsible Person
                    </label>
                    <select
                      value={formData.responsibleUserId}
                      onChange={(e) => setFormData({ ...formData, responsibleUserId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="">Not assigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Internal person responsible</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Documenter
                    </label>
                    <select
                      value={formData.documenterUserId}
                      onChange={(e) => setFormData({ ...formData, documenterUserId: e.target.value })}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm"
                    >
                      <option value="">Not assigned</option>
                      {teamMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.firstName} {member.lastName}
                        </option>
                      ))}
                    </select>
                    <p className="text-xs text-gray-500 mt-1">Person who updates progress</p>
                  </div>
                </div>
              </div>

              {editingMilestone && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as Milestone['status'] })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  >
                    <option value="PENDING">Pending</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                    <option value="OVERDUE">Overdue</option>
                  </select>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending || updateMutation.isPending}
                  className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50"
                >
                  {createMutation.isPending || updateMutation.isPending ? 'Saving...' : editingMilestone ? 'Save Changes' : 'Add Milestone'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
