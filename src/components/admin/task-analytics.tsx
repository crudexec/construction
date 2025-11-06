'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Eye, 
  Play, 
  CheckCircle, 
  Calendar,
  Clock,
  Users,
  Globe,
  Activity,
  TrendingUp,
  ExternalLink,
  Filter,
  BarChart3
} from 'lucide-react'

interface TaskAnalytics {
  task: {
    id: string
    title: string
    shareToken?: string
    isShareable: boolean
    sharedAt?: string
    status: string
    priority: string
    project: {
      title: string
    }
  }
  stats: {
    totalViews: number
    totalStarts: number
    totalCompletions: number
    lastViewed?: string
    lastStarted?: string
    lastCompleted?: string
    uniqueIps: number
  }
  interactions: Array<{
    id: string
    action: string
    timestamp: string
    ipAddress: string
    userAgent: string
    metadata?: any
  }>
}

async function fetchTaskAnalytics(taskId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/task/${taskId}/interactions`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch analytics')
  return response.json()
}

interface TaskAnalyticsProps {
  taskId: string
  onClose: () => void
}

export function TaskAnalytics({ taskId, onClose }: TaskAnalyticsProps) {
  const [selectedAction, setSelectedAction] = useState<string>('all')

  const { data: analytics, isLoading, error } = useQuery({
    queryKey: ['task-analytics', taskId],
    queryFn: () => fetchTaskAnalytics(taskId),
    enabled: !!taskId
  })

  // Log for debugging
  console.log('TaskAnalytics - taskId:', taskId)
  console.log('TaskAnalytics - isLoading:', isLoading)
  console.log('TaskAnalytics - analytics:', analytics)
  console.log('TaskAnalytics - error:', error)

  const filteredInteractions = analytics?.interactions?.filter((interaction: any) => 
    selectedAction === 'all' || interaction.action === selectedAction
  ) || []

  const getActionIcon = (action: string) => {
    switch (action) {
      case 'OPENED': return Eye
      case 'STARTED': return Play
      case 'COMPLETED': return CheckCircle
      default: return Activity
    }
  }

  const getActionColor = (action: string) => {
    switch (action) {
      case 'OPENED': return 'text-blue-600 bg-blue-100'
      case 'STARTED': return 'text-yellow-600 bg-yellow-100'
      case 'COMPLETED': return 'text-green-600 bg-green-100'
      default: return 'text-gray-600 bg-gray-100'
    }
  }

  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading analytics...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!analytics) {
    return (
      <div className="fixed inset-0 z-50 overflow-y-auto">
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
            <div className="text-center">
              <p className="text-gray-600">No analytics data found</p>
              <button
                onClick={onClose}
                className="mt-4 bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const { task, stats, interactions } = analytics

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex min-h-screen items-start justify-center p-4 pt-8">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="relative bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
          {/* Header */}
          <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">Task Analytics</h2>
                <p className="text-sm text-gray-600 mt-1">{task.title}</p>
                <p className="text-xs text-gray-500">Project: {task.project?.title}</p>
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          </div>

          <div className="p-6 overflow-y-auto max-h-[calc(90vh-80px)]">
            {/* Stats Overview */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Eye className="h-8 w-8 text-blue-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-900">Total Views</p>
                    <p className="text-2xl font-bold text-blue-600">{stats.totalViews}</p>
                  </div>
                </div>
              </div>

              <div className="bg-yellow-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Play className="h-8 w-8 text-yellow-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-yellow-900">Times Started</p>
                    <p className="text-2xl font-bold text-yellow-600">{stats.totalStarts}</p>
                  </div>
                </div>
              </div>

              <div className="bg-green-50 rounded-lg p-4">
                <div className="flex items-center">
                  <CheckCircle className="h-8 w-8 text-green-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-900">Completions</p>
                    <p className="text-2xl font-bold text-green-600">{stats.totalCompletions}</p>
                  </div>
                </div>
              </div>

              <div className="bg-purple-50 rounded-lg p-4">
                <div className="flex items-center">
                  <Users className="h-8 w-8 text-purple-600" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-900">Unique IPs</p>
                    <p className="text-2xl font-bold text-purple-600">{stats.uniqueIps}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Info */}
            <div className="bg-gray-50 rounded-lg p-4 mb-6">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Task Information</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.status}</span>
                </div>
                <div>
                  <span className="text-gray-500">Priority:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.priority}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shareable:</span>
                  <span className="ml-2 font-medium text-gray-900">{task.isShareable ? 'Yes' : 'No'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Shared:</span>
                  <span className="ml-2 font-medium text-gray-900">
                    {task.sharedAt ? new Date(task.sharedAt).toLocaleDateString() : 'Not shared'}
                  </span>
                </div>
              </div>
            </div>

            {/* Last Activity */}
            {(stats.lastViewed || stats.lastStarted || stats.lastCompleted) && (
              <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Recent Activity</h3>
                <div className="space-y-2 text-sm">
                  {stats.lastViewed && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last viewed:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(stats.lastViewed).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {stats.lastStarted && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last started:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(stats.lastStarted).toLocaleString()}
                      </span>
                    </div>
                  )}
                  {stats.lastCompleted && (
                    <div className="flex items-center justify-between">
                      <span className="text-gray-600">Last completed:</span>
                      <span className="font-medium text-gray-900">
                        {new Date(stats.lastCompleted).toLocaleString()}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Interaction Timeline */}
            <div className="bg-white border border-gray-200 rounded-lg p-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-medium text-gray-900">Interaction Timeline</h3>
                <select
                  value={selectedAction}
                  onChange={(e) => setSelectedAction(e.target.value)}
                  className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="all">All Actions</option>
                  <option value="OPENED">Views</option>
                  <option value="STARTED">Starts</option>
                  <option value="COMPLETED">Completions</option>
                </select>
              </div>

              {filteredInteractions.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  <Activity className="h-12 w-12 mx-auto mb-2 text-gray-300" />
                  <p>No interactions found</p>
                </div>
              ) : (
                <div className="space-y-3 max-h-80 overflow-y-auto">
                  {filteredInteractions.map((interaction: any) => {
                    const ActionIcon = getActionIcon(interaction.action)
                    const actionColor = getActionColor(interaction.action)
                    
                    return (
                      <div key={interaction.id} className="flex items-start space-x-3 p-3 bg-gray-50 rounded-lg">
                        <div className={`p-2 rounded-full ${actionColor}`}>
                          <ActionIcon className="h-4 w-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium text-gray-900">
                              Task {interaction.action.toLowerCase()}
                            </p>
                            <p className="text-xs text-gray-500">
                              {new Date(interaction.timestamp).toLocaleString()}
                            </p>
                          </div>
                          <div className="mt-1 text-xs text-gray-600">
                            <div className="flex items-center space-x-4">
                              <span>IP: {interaction.ipAddress}</span>
                              <span className="truncate max-w-xs" title={interaction.userAgent}>
                                {interaction.userAgent?.split(' ')[0] || 'Unknown browser'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Share URL */}
            {task.isShareable && task.shareToken && (
              <div className="mt-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-medium text-blue-900 mb-2">Share URL</h3>
                <div className="flex items-center space-x-2">
                  <code className="flex-1 text-sm bg-white px-3 py-2 rounded border text-blue-800">
                    {`${window.location.origin}/shared/task/${task.shareToken}`}
                  </code>
                  <a
                    href={`/shared/task/${task.shareToken}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-700 p-2"
                    title="Open shared task"
                  >
                    <ExternalLink className="h-4 w-4" />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}