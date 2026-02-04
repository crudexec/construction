'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useVendorAuthStore } from '@/store/vendor-auth'
import { CheckSquare, Clock, AlertCircle, Calendar, Filter, X, ChevronRight, Tag, Target } from 'lucide-react'
import toast from 'react-hot-toast'

interface TaskDetail {
  id: string
  title: string
  description?: string
  status: string
  priority: string
  dueDate?: string
  completedAt?: string
  createdAt: string
  card?: {
    id: string
    title: string
    status: string
  }
  category?: {
    id: string
    name: string
    color: string
  }
  milestone?: {
    id: string
    title: string
    status: string
    targetDate?: string
  }
  dependsOn?: Array<{
    id: string
    title: string
    status: string
  }>
}

async function fetchTasks(token: string, filters?: { status?: string; projectId?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)
  if (filters?.projectId) params.append('projectId', filters.projectId)

  const response = await fetch(`/api/vendor-portal/tasks?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

export default function VendorTasksPage() {
  const { token } = useVendorAuthStore()
  const queryClient = useQueryClient()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [selectedTask, setSelectedTask] = useState<TaskDetail | null>(null)

  const { data: tasks, isLoading } = useQuery({
    queryKey: ['vendor-tasks', statusFilter],
    queryFn: () => fetchTasks(token!, { status: statusFilter || undefined }),
    enabled: !!token,
  })

  const updateTaskMutation = useMutation({
    mutationFn: async ({ taskId, status }: { taskId: string; status: string }) => {
      const response = await fetch('/api/vendor-portal/tasks', {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ taskId, status }),
      })
      if (!response.ok) throw new Error('Failed to update task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vendor-tasks'] })
      toast.success('Task updated')
    },
    onError: () => {
      toast.error('Failed to update task')
    },
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-700'
      case 'IN_PROGRESS': return 'bg-blue-100 text-blue-700'
      case 'TODO': return 'bg-gray-100 text-gray-700'
      default: return 'bg-gray-100 text-gray-700'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT': return 'text-red-600'
      case 'HIGH': return 'text-orange-600'
      case 'MEDIUM': return 'text-yellow-600'
      default: return 'text-gray-500'
    }
  }

  const isOverdue = (dueDate: string, status: string) => {
    if (status === 'COMPLETED') return false
    return new Date(dueDate) < new Date()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Tasks</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border rounded-lg text-sm focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Tasks</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : tasks?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <CheckSquare className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No tasks assigned to you</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {tasks?.map((task: any) => (
            <div
              key={task.id}
              className="p-4 hover:bg-gray-50 cursor-pointer"
              onClick={() => setSelectedTask(task)}
            >
              <div className="flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-gray-900">{task.title}</h3>
                    {task.category && (
                      <span
                        className="px-2 py-0.5 rounded text-xs"
                        style={{ backgroundColor: task.category.color + '20', color: task.category.color }}
                      >
                        {task.category.name}
                      </span>
                    )}
                    {task.milestone && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700">
                        <Target className="w-3 h-3" />
                        {task.milestone.title}
                      </span>
                    )}
                  </div>
                  {task.description && (
                    <p className="text-sm text-gray-500 mb-2 line-clamp-2">{task.description}</p>
                  )}
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-gray-500">{task.card?.title}</span>
                    {task.dueDate && (
                      <span className={`flex items-center gap-1 ${
                        isOverdue(task.dueDate, task.status) ? 'text-red-600' : 'text-gray-500'
                      }`}>
                        {isOverdue(task.dueDate, task.status) ? (
                          <AlertCircle className="w-4 h-4" />
                        ) : (
                          <Calendar className="w-4 h-4" />
                        )}
                        {new Date(task.dueDate).toLocaleDateString()}
                      </span>
                    )}
                    <span className={getPriorityColor(task.priority)}>
                      {task.priority}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <select
                    value={task.status}
                    onChange={(e) => {
                      e.stopPropagation()
                      updateTaskMutation.mutate({ taskId: task.id, status: e.target.value })
                    }}
                    onClick={(e) => e.stopPropagation()}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border-0 ${getStatusColor(task.status)}`}
                    disabled={updateTaskMutation.isPending}
                  >
                    <option value="TODO">To Do</option>
                    <option value="IN_PROGRESS">In Progress</option>
                    <option value="COMPLETED">Completed</option>
                  </select>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900">Task Details</h3>
              <button
                onClick={() => setSelectedTask(null)}
                className="text-gray-400 hover:text-gray-500"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
              <div className="space-y-6">
                {/* Title and Status */}
                <div>
                  <h2 className="text-xl font-semibold text-gray-900 mb-2">{selectedTask.title}</h2>
                  <div className="flex items-center gap-3">
                    <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedTask.status)}`}>
                      {selectedTask.status.replace('_', ' ')}
                    </span>
                    <span className={`text-sm font-medium ${getPriorityColor(selectedTask.priority)}`}>
                      {selectedTask.priority} Priority
                    </span>
                  </div>
                </div>

                {/* Project */}
                {selectedTask.card && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Project</h4>
                    <p className="text-gray-900">{selectedTask.card.title}</p>
                  </div>
                )}

                {/* Category */}
                {selectedTask.category && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Category</h4>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm"
                      style={{ backgroundColor: selectedTask.category.color + '20', color: selectedTask.category.color }}
                    >
                      <Tag className="w-3 h-3" />
                      {selectedTask.category.name}
                    </span>
                  </div>
                )}

                {/* Milestone */}
                {selectedTask.milestone && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Milestone</h4>
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-1 rounded text-sm bg-blue-50 text-blue-700">
                        <Target className="w-3 h-3" />
                        {selectedTask.milestone.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-xs ${
                        selectedTask.milestone.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                        selectedTask.milestone.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                        selectedTask.milestone.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {selectedTask.milestone.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                )}

                {/* Description */}
                {selectedTask.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-1">Description</h4>
                    <p className="text-gray-700 whitespace-pre-wrap">{selectedTask.description}</p>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedTask.dueDate && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Due Date</h4>
                      <p className={`flex items-center gap-2 ${
                        isOverdue(selectedTask.dueDate, selectedTask.status) ? 'text-red-600' : 'text-gray-900'
                      }`}>
                        <Calendar className="w-4 h-4" />
                        {new Date(selectedTask.dueDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                        {isOverdue(selectedTask.dueDate, selectedTask.status) && (
                          <span className="text-xs bg-red-100 text-red-700 px-2 py-0.5 rounded">Overdue</span>
                        )}
                      </p>
                    </div>
                  )}
                  {selectedTask.completedAt && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-500 mb-1">Completed</h4>
                      <p className="text-gray-900">
                        {new Date(selectedTask.completedAt).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric'
                        })}
                      </p>
                    </div>
                  )}
                </div>

                {/* Dependencies */}
                {selectedTask.dependsOn && selectedTask.dependsOn.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-500 mb-2">Depends On</h4>
                    <div className="space-y-2">
                      {selectedTask.dependsOn.map((dep) => (
                        <div
                          key={dep.id}
                          className="flex items-center justify-between p-2 bg-gray-50 rounded-lg"
                        >
                          <span className="text-sm text-gray-700">{dep.title}</span>
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(dep.status)}`}>
                            {dep.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Created Date */}
                <div>
                  <h4 className="text-sm font-medium text-gray-500 mb-1">Created</h4>
                  <p className="text-gray-700 text-sm">
                    {new Date(selectedTask.createdAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-500">Update Status:</span>
                <select
                  value={selectedTask.status}
                  onChange={(e) => {
                    updateTaskMutation.mutate(
                      { taskId: selectedTask.id, status: e.target.value },
                      {
                        onSuccess: () => {
                          setSelectedTask({ ...selectedTask, status: e.target.value })
                        }
                      }
                    )
                  }}
                  className={`px-4 py-2 rounded-lg text-sm font-medium border ${getStatusColor(selectedTask.status)}`}
                  disabled={updateTaskMutation.isPending}
                >
                  <option value="TODO">To Do</option>
                  <option value="IN_PROGRESS">In Progress</option>
                  <option value="COMPLETED">Completed</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
