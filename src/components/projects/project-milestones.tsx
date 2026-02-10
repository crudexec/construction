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
  Circle
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
  createdAt: string
  tasks?: Task[]
  completedTasksCount?: number
  totalTasksCount?: number
  progress?: number
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

export function ProjectMilestones({ projectId }: ProjectMilestonesProps) {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingMilestone, setEditingMilestone] = useState<Milestone | null>(null)
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    amount: '',
    targetDate: '',
    vendorId: '',
    status: 'PENDING' as Milestone['status']
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

  const openModal = (milestone?: Milestone) => {
    if (milestone) {
      setEditingMilestone(milestone)
      setFormData({
        title: milestone.title,
        description: milestone.description || '',
        amount: milestone.amount?.toString() || '',
        targetDate: milestone.targetDate ? new Date(milestone.targetDate).toISOString().split('T')[0] : '',
        vendorId: milestone.vendor?.id || '',
        status: milestone.status
      })
    } else {
      setEditingMilestone(null)
      setFormData({
        title: '',
        description: '',
        amount: '',
        targetDate: '',
        vendorId: '',
        status: 'PENDING'
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
      status: 'PENDING'
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
                      {taskCount > 0 && (
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
                      )}

                      {/* Status Icon */}
                      <div className="flex-shrink-0 mt-1">
                        {getStatusIcon(milestone.status)}
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-sm font-medium text-gray-900">{milestone.title}</h3>
                              {taskCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({completedCount}/{taskCount} tasks)
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

                  {/* Tasks List (Collapsible) */}
                  {isExpanded && milestone.tasks && milestone.tasks.length > 0 && (
                    <div className="px-4 pb-4 ml-12">
                      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                        {milestone.tasks.map((task) => (
                          <div key={task.id} className="p-3 flex items-start gap-3 hover:bg-gray-100">
                            {/* Task Status Icon */}
                            <div className="flex-shrink-0 mt-0.5">
                              {task.status === 'COMPLETED' ? (
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                              ) : (
                                <Circle className="h-4 w-4 text-gray-400" />
                              )}
                            </div>

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

                                {/* Task Priority Badge */}
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
