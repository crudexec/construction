'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVendorAuthStore } from '@/store/vendor-auth'
import toast from 'react-hot-toast'
import {
  CheckSquare,
  Calendar,
  Target,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Filter,
  Eye
} from 'lucide-react'
import { VendorTaskDetailModal } from '@/components/vendors/vendor-task-detail-modal'

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  card?: {
    id: string
    title: string
  }
}

interface Milestone {
  id: string
  title: string
  description?: string
  amount?: number
  targetDate?: string
  status: 'PENDING' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  project: {
    id: string
    title: string
  }
  tasks?: Task[]
  completedTasksCount?: number
  totalTasksCount?: number
  progress?: number
}

async function fetchVendorMilestones(token: string) {
  const response = await fetch('/api/vendor-portal/milestones', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch milestones')
  return response.json()
}

async function fetchVendorTasks(token: string) {
  const response = await fetch('/api/vendor-portal/tasks', {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

async function updateTaskStatus(token: string, taskId: string, status: string) {
  const response = await fetch('/api/vendor-portal/tasks', {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ taskId, status })
  })
  if (!response.ok) throw new Error('Failed to update task status')
  return response.json()
}

export default function VendorDashboardPage() {
  const { token, vendor } = useVendorAuthStore()
  const queryClient = useQueryClient()
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())
  const [milestoneFilter, setMilestoneFilter] = useState<string>('')
  const [taskFilter, setTaskFilter] = useState<string>('')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const handleOpenTask = (taskId: string) => {
    setSelectedTaskId(taskId)
    setIsTaskModalOpen(true)
  }

  const handleCloseTaskModal = () => {
    setIsTaskModalOpen(false)
    setSelectedTaskId(null)
  }

  const { data: milestones = [], isLoading: milestonesLoading } = useQuery({
    queryKey: ['vendor-milestones'],
    queryFn: () => fetchVendorMilestones(token!),
    enabled: !!token,
  })

  const { data: allTasks = [], isLoading: tasksLoading } = useQuery({
    queryKey: ['vendor-tasks'],
    queryFn: () => fetchVendorTasks(token!),
    enabled: !!token,
  })

  const updateStatusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updateTaskStatus(token!, taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-milestones'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-tasks'] })
      toast.success('Task status updated successfully')
    },
    onError: () => {
      toast.error('Failed to update task status')
    }
  })

  const handleStatusChange = (taskId: string, newStatus: string) => {
    updateStatusMutation.mutate({ taskId, status: newStatus })
  }

  // Expand all milestones by default when they load
  useEffect(() => {
    if (milestones.length > 0) {
      setExpandedMilestones(new Set(milestones.map((m: Milestone) => m.id)))
    }
  }, [milestones])

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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
      case 'OVERDUE': return 'bg-red-100 text-red-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'bg-red-100 text-red-700'
      case 'HIGH': return 'bg-orange-100 text-orange-700'
      case 'MEDIUM': return 'bg-blue-100 text-blue-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  // Get all milestone IDs with tasks
  const milestoneTaskIds = new Set(
    milestones.flatMap((m: Milestone) => (m.tasks || []).map((t: Task) => t.id))
  )

  // Filter standalone tasks (not under any milestone)
  const standaloneTasks = allTasks.filter((task: Task) => !milestoneTaskIds.has(task.id))

  // Apply filters
  const filteredMilestones = milestones.filter((m: Milestone) =>
    !milestoneFilter || m.status === milestoneFilter
  )
  const filteredStandaloneTasks = standaloneTasks.filter((t: Task) =>
    !taskFilter || t.status === taskFilter
  )

  return (
    <div className="space-y-6">
      {/* Welcome Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 rounded-xl p-6 text-white">
        <h1 className="text-2xl font-bold">Welcome back, {vendor?.name || 'Vendor'}</h1>
        <div className="mt-2 space-y-1">
          <p className="text-indigo-100 font-medium">{vendor?.companyName}</p>
          {vendor?.company && (
            <p className="text-indigo-200 text-sm">Working with {vendor.company.name}</p>
          )}
        </div>
      </div>

      {/* Milestones Section */}
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <Target className="w-5 h-5 text-indigo-600" />
            <h2 className="text-lg font-semibold text-gray-900">My Milestones</h2>
          </div>
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={milestoneFilter}
              onChange={(e) => setMilestoneFilter(e.target.value)}
              className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">All Milestones</option>
              <option value="PENDING">Pending</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="COMPLETED">Completed</option>
              <option value="OVERDUE">Overdue</option>
            </select>
          </div>
        </div>

        {milestonesLoading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
          </div>
        ) : filteredMilestones.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
            <p>No milestones assigned to you</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredMilestones.map((milestone: Milestone) => {
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

                      {/* Milestone Icon */}
                      <div className="flex-shrink-0 mt-1">
                        <Target className="h-5 w-5 text-indigo-500" />
                      </div>

                      {/* Content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1">
                            <div className="flex items-center gap-3">
                              <h3 className="text-base font-medium text-gray-900">{milestone.title}</h3>
                              {taskCount > 0 && (
                                <span className="text-xs text-gray-500">
                                  ({completedCount}/{taskCount} tasks)
                                </span>
                              )}
                            </div>
                            <p className="text-sm text-gray-500 mt-1">{milestone.project.title}</p>
                            {milestone.description && (
                              <p className="text-sm text-gray-600 mt-1">{milestone.description}</p>
                            )}

                            {/* Progress Bar */}
                            {taskCount > 0 && (
                              <div className="mt-3">
                                <div className="flex items-center justify-between text-xs text-gray-600 mb-1">
                                  <span>Task Progress</span>
                                  <span className="font-medium">{progress}%</span>
                                </div>
                                <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                                  <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${progress}%` }}
                                  />
                                </div>
                              </div>
                            )}

                            <div className="flex flex-wrap items-center gap-4 mt-3">
                              {milestone.amount && (
                                <span className="inline-flex items-center text-sm text-gray-600">
                                  ${milestone.amount.toLocaleString()}
                                </span>
                              )}
                              {milestone.targetDate && (
                                <span className="inline-flex items-center text-sm text-gray-600">
                                  <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                                  {new Date(milestone.targetDate).toLocaleDateString()}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <span className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap ${getStatusColor(milestone.status)}`}>
                            {milestone.status.replace('_', ' ')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Tasks List (Collapsible) */}
                  {isExpanded && milestone.tasks && milestone.tasks.length > 0 && (
                    <div className="px-4 pb-4 ml-12">
                      <div className="bg-gray-50 rounded-lg border border-gray-200 divide-y divide-gray-200">
                        {milestone.tasks.map((task) => (
                          <div
                            key={task.id}
                            className="p-3 flex items-start gap-3 hover:bg-gray-100 cursor-pointer"
                            onClick={() => handleOpenTask(task.id)}
                          >
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
                                  {task.dueDate && (
                                    <span className="text-xs text-gray-500 mt-1 block">
                                      Due: {new Date(task.dueDate).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>

                                <div className="flex flex-col items-end gap-2">
                                  {/* View Details Button */}
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      handleOpenTask(task.id)
                                    }}
                                    className="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded flex items-center gap-1"
                                  >
                                    <Eye className="h-3 w-3" />
                                    View
                                  </button>

                                  {/* Status Dropdown */}
                                  <select
                                    value={task.status}
                                    onChange={(e) => {
                                      e.stopPropagation()
                                      handleStatusChange(task.id, e.target.value)
                                    }}
                                    disabled={updateStatusMutation.isPending}
                                    className={`text-xs px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusColor(task.status)}`}
                                    onClick={(e) => e.stopPropagation()}
                                  >
                                    <option value="TODO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="COMPLETED">Completed</option>
                                  </select>

                                  {/* Task Priority Badge */}
                                  <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
                                    {task.priority}
                                  </span>
                                </div>
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
        )}
      </div>

      {/* Standalone Tasks Section */}
      {standaloneTasks.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm border">
          <div className="flex items-center justify-between p-4 border-b">
            <div className="flex items-center gap-3">
              <CheckSquare className="w-5 h-5 text-indigo-600" />
              <h2 className="text-lg font-semibold text-gray-900">Other Tasks</h2>
            </div>
            <div className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-gray-400" />
              <select
                value={taskFilter}
                onChange={(e) => setTaskFilter(e.target.value)}
                className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Tasks</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="COMPLETED">Completed</option>
              </select>
            </div>
          </div>

          <div className="divide-y">
            {filteredStandaloneTasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500">
                <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p>No tasks match the selected filter</p>
              </div>
            ) : (
              filteredStandaloneTasks.map((task: Task) => (
                <div
                  key={task.id}
                  className="p-4 hover:bg-gray-50 cursor-pointer"
                  onClick={() => handleOpenTask(task.id)}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 truncate">{task.title}</p>
                      {task.card && <p className="text-sm text-gray-500">{task.card.title}</p>}
                      {task.description && (
                        <p className="text-sm text-gray-600 mt-1 line-clamp-2">{task.description}</p>
                      )}
                      {task.dueDate && (
                        <div className="flex items-center gap-1 mt-2 text-sm text-gray-500">
                          <Calendar className="w-4 h-4" />
                          Due: {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      {/* View Details Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation()
                          handleOpenTask(task.id)
                        }}
                        className="text-xs px-2 py-1 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded flex items-center gap-1"
                      >
                        <Eye className="h-3 w-3" />
                        View Details
                      </button>
                      {/* Status Dropdown */}
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleStatusChange(task.id, e.target.value)
                        }}
                        disabled={updateStatusMutation.isPending}
                        className={`text-xs px-2 py-1 rounded border focus:outline-none focus:ring-2 focus:ring-indigo-500 ${getStatusColor(task.status)}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="TODO">To Do</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="COMPLETED">Completed</option>
                      </select>
                      <span className={`px-2 py-1 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      <VendorTaskDetailModal
        taskId={selectedTaskId}
        isOpen={isTaskModalOpen}
        onClose={handleCloseTaskModal}
        onStatusUpdate={() => {
          queryClient.invalidateQueries({ queryKey: ['vendor-milestones'] })
          queryClient.invalidateQueries({ queryKey: ['vendor-tasks'] })
        }}
      />
    </div>
  )
}
