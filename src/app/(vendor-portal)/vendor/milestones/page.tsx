'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useVendorAuthStore } from '@/store/vendor-auth'
import {
  Target,
  Calendar,
  DollarSign,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Circle,
  Filter
} from 'lucide-react'

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
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

async function fetchVendorMilestones(token: string, filters?: { status?: string }) {
  const params = new URLSearchParams()
  if (filters?.status) params.append('status', filters.status)

  const response = await fetch(`/api/vendor-portal/milestones?${params}`, {
    headers: { 'Authorization': `Bearer ${token}` },
  })
  if (!response.ok) throw new Error('Failed to fetch milestones')
  return response.json()
}

export default function VendorMilestonesPage() {
  const { token } = useVendorAuthStore()
  const [statusFilter, setStatusFilter] = useState<string>('')
  const [expandedMilestones, setExpandedMilestones] = useState<Set<string>>(new Set())

  const { data: milestones = [], isLoading } = useQuery({
    queryKey: ['vendor-milestones', statusFilter],
    queryFn: () => fetchVendorMilestones(token!, { status: statusFilter || undefined }),
    enabled: !!token,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">My Milestones</h1>
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-gray-400" />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600" />
        </div>
      ) : milestones?.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-8 text-center">
          <Target className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">No milestones assigned to you</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm border divide-y">
          {milestones?.map((milestone: Milestone) => {
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
                                <DollarSign className="h-4 w-4 mr-1 text-gray-400" />
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
                                {task.dueDate && (
                                  <span className="text-xs text-gray-500 mt-1 block">
                                    Due: {new Date(task.dueDate).toLocaleDateString()}
                                  </span>
                                )}
                              </div>

                              {/* Task Priority Badge */}
                              <span className={`text-xs px-2 py-0.5 rounded ${getPriorityColor(task.priority)}`}>
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
      )}
    </div>
  )
}
