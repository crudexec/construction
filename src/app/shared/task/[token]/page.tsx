'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  CheckSquare, 
  Clock, 
  Calendar,
  Building,
  MapPin,
  User,
  AlertCircle,
  ExternalLink,
  Shield,
  CheckCircle,
  Play,
  Target
} from 'lucide-react'

interface SharedTask {
  task: {
    id: string
    title: string
    description?: string
    status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
    priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
    dueDate?: string
    createdAt: string
    category?: {
      id: string
      name: string
      color: string
    }
    assignee?: {
      id: string
      firstName: string
      lastName: string
    }
    creator: {
      id: string
      firstName: string
      lastName: string
    }
  }
  project: {
    id: string
    title: string
    contactName?: string
    location?: string
  }
  company: {
    name: string
    logo?: string
    website?: string
  }
}

export default function SharedTaskPage() {
  const params = useParams()
  const token = params.token as string
  const [task, setTask] = useState<SharedTask | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [updating, setUpdating] = useState(false)

  useEffect(() => {
    fetchTask()
  }, [token])

  const fetchTask = async () => {
    try {
      const response = await fetch(`/api/shared/task/${token}`)
      if (!response.ok) {
        throw new Error('Task not found or sharing disabled')
      }
      const data = await response.json()
      setTask(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load task')
    } finally {
      setLoading(false)
    }
  }

  const updateTaskStatus = async (newStatus: string) => {
    if (!task) return

    setUpdating(true)
    try {
      const response = await fetch(`/api/shared/task/${token}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status: newStatus })
      })

      if (!response.ok) {
        throw new Error('Failed to update task')
      }

      const result = await response.json()
      
      // Update local state
      setTask(prev => prev ? {
        ...prev,
        task: {
          ...prev.task,
          status: newStatus as any,
          ...(result.completedAt && { completedAt: result.completedAt })
        }
      } : null)
    } catch (error) {
      alert(error instanceof Error ? error.message : 'Failed to update task')
    } finally {
      setUpdating(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800'
      case 'MEDIUM': return 'bg-blue-100 text-blue-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'TODO': return Target
      case 'IN_PROGRESS': return Play
      case 'COMPLETED': return CheckCircle
      default: return Clock
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading task...</p>
        </div>
      </div>
    )
  }

  if (error || !task) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Task Not Found</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The shared task link may have expired or been disabled.'}
          </p>
        </div>
      </div>
    )
  }

  const StatusIcon = getStatusIcon(task.task.status)

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {task.company.logo ? (
                <img 
                  src={task.company.logo} 
                  alt={task.company.name}
                  className="h-10 w-10 rounded-lg object-cover"
                />
              ) : (
                <div className="h-10 w-10 bg-blue-600 rounded-lg flex items-center justify-center">
                  <Building className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-xl font-semibold text-gray-900">{task.company.name}</h1>
                {task.company.website && (
                  <a 
                    href={task.company.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-blue-600 hover:text-blue-700 flex items-center"
                  >
                    Visit website
                    <ExternalLink className="h-3 w-3 ml-1" />
                  </a>
                )}
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Shield className="h-4 w-4" />
              <span>Shared Task</span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          {/* Task Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-start justify-between">
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <StatusIcon className="h-6 w-6 text-gray-600" />
                  <h2 className="text-2xl font-bold text-gray-900">{task.task.title}</h2>
                </div>
                {task.task.description && (
                  <p className="text-gray-600 mb-4">{task.task.description}</p>
                )}
                
                {/* Project Info */}
                <div className="space-y-2">
                  <div className="flex items-center text-sm text-gray-600">
                    <Building className="h-4 w-4 mr-2" />
                    <span className="font-medium">Project:</span>
                    <span className="ml-1">{task.project.title}</span>
                  </div>
                  {task.project.contactName && (
                    <div className="flex items-center text-sm text-gray-600">
                      <User className="h-4 w-4 mr-2" />
                      <span className="font-medium">Client:</span>
                      <span className="ml-1">{task.project.contactName}</span>
                    </div>
                  )}
                  {task.project.location && (
                    <div className="flex items-center text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span className="font-medium">Location:</span>
                      <span className="ml-1">{task.project.location}</span>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(task.task.status)}`}>
                  {task.task.status.replace('_', ' ')}
                </span>
                <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getPriorityColor(task.task.priority)}`}>
                  {task.task.priority}
                </span>
              </div>
            </div>
          </div>

          {/* Task Details */}
          <div className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Task Information */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Task Information</h3>
                <div className="space-y-3">
                  {task.task.category && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Category:</span>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: task.task.category.color }}
                        />
                        <span className="text-sm text-gray-900">{task.task.category.name}</span>
                      </div>
                    </div>
                  )}
                  
                  {task.task.assignee && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Assigned:</span>
                      <span className="text-sm text-gray-900">
                        {task.task.assignee.firstName} {task.task.assignee.lastName}
                      </span>
                    </div>
                  )}
                  
                  <div className="flex items-center">
                    <span className="text-sm font-medium text-gray-700 w-20">Created:</span>
                    <span className="text-sm text-gray-900">
                      {new Date(task.task.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  
                  {task.task.dueDate && (
                    <div className="flex items-center">
                      <span className="text-sm font-medium text-gray-700 w-20">Due:</span>
                      <div className="flex items-center space-x-2">
                        <Calendar className="h-4 w-4 text-gray-500" />
                        <span className="text-sm text-gray-900">
                          {new Date(task.task.dueDate).toLocaleDateString()}
                        </span>
                        {new Date(task.task.dueDate) < new Date() && task.task.status !== 'COMPLETED' && (
                          <span className="text-xs text-red-600 font-medium">Overdue</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Update Status</h3>
                <div className="space-y-3">
                  {task.task.status === 'TODO' && (
                    <button
                      onClick={() => updateTaskStatus('IN_PROGRESS')}
                      disabled={updating}
                      className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Play className="h-4 w-4" />
                      <span>{updating ? 'Starting...' : 'Start Task'}</span>
                    </button>
                  )}
                  
                  {task.task.status === 'IN_PROGRESS' && (
                    <button
                      onClick={() => updateTaskStatus('COMPLETED')}
                      disabled={updating}
                      className="w-full bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <CheckCircle className="h-4 w-4" />
                      <span>{updating ? 'Completing...' : 'Mark Complete'}</span>
                    </button>
                  )}
                  
                  {task.task.status === 'COMPLETED' && (
                    <div className="w-full bg-green-100 text-green-800 px-4 py-2 rounded-md flex items-center justify-center space-x-2">
                      <CheckCircle className="h-4 w-4" />
                      <span>Task Completed</span>
                    </div>
                  )}
                  
                  {task.task.status !== 'TODO' && task.task.status !== 'COMPLETED' && (
                    <button
                      onClick={() => updateTaskStatus('TODO')}
                      disabled={updating}
                      className="w-full bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 disabled:opacity-50 flex items-center justify-center space-x-2"
                    >
                      <Target className="h-4 w-4" />
                      <span>{updating ? 'Resetting...' : 'Reset to Todo'}</span>
                    </button>
                  )}
                </div>
                
                <div className="mt-4 p-3 bg-blue-50 rounded-md">
                  <p className="text-xs text-blue-800">
                    <strong>Note:</strong> Your interactions with this task are tracked for project management purposes.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}