'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import {
  X,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  PlayCircle,
  AlertTriangle,
  Paperclip,
  DollarSign,
  Receipt
} from 'lucide-react'
import toast from 'react-hot-toast'
import { TaskBudgetSection } from './task-budget-section'
import { TaskPaymentList } from './task-payment-list'
import { TaskAttachments } from './task-attachments'
import { EscalateTaskModal } from './escalate-task-modal'

interface TaskDetailModalProps {
  taskId: string | null
  projectId: string
  isOpen: boolean
  onClose: () => void
}

interface Payment {
  id: string
  amount: number
  invoiceNumber?: string
  referenceNumber?: string
  paymentDate: string
  notes?: string
  createdBy: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  uploader?: {
    id: string
    firstName: string
    lastName: string
  } | null
  uploadedByVendor?: {
    id: string
    name: string
    companyName: string
  } | null
  createdAt: string
}

interface TaskDetail {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  category?: {
    name: string
    color: string
  }
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  creator: {
    id: string
    firstName: string
    lastName: string
  }
  budgetAmount?: number
  approvedAmount?: number
  isEscalated: boolean
  escalatedAt?: string
  escalatedBy?: string
  escalationReason?: string
  payments: Payment[]
  attachments: Attachment[]
  createdAt: string
  updatedAt: string
}

async function fetchTaskDetail(taskId: string): Promise<TaskDetail> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/task/${taskId}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })

  if (!response.ok) throw new Error('Failed to fetch task')
  return response.json()
}

async function updateTaskStatus(taskId: string, status: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/task/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ status })
  })

  if (!response.ok) throw new Error('Failed to update task')
  return response.json()
}

export function TaskDetailModal({ taskId, projectId, isOpen, onClose }: TaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'internal' | 'attachments'>('details')
  const [isEscalateModalOpen, setIsEscalateModalOpen] = useState(false)
  const queryClient = useQueryClient()

  const { data: task, isLoading, refetch } = useQuery({
    queryKey: ['task', taskId],
    queryFn: () => fetchTaskDetail(taskId!),
    enabled: !!taskId && isOpen
  })

  const statusMutation = useMutation({
    mutationFn: ({ taskId, status }: { taskId: string; status: string }) =>
      updateTaskStatus(taskId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['task', taskId] })
      queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Task updated successfully')
    },
    onError: () => {
      toast.error('Failed to update task')
    }
  })

  const handleStatusChange = (newStatus: string) => {
    if (!taskId) return
    statusMutation.mutate({ taskId, status: newStatus })
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS':
        return <PlayCircle className="h-5 w-5 text-blue-600" />
      case 'OVERDUE':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  if (!isOpen || !taskId) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p>Task not found or access denied.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const totalPaid = task.payments?.reduce((sum, p) => sum + p.amount, 0) || 0

  return (
    <>
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                {getStatusIcon(task.status)}
                <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
                {task.isEscalated && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 bg-red-100 text-red-800 text-xs font-semibold rounded-full">
                    <AlertTriangle className="h-3 w-3" />
                    Escalated
                  </span>
                )}
              </div>
              <button
                onClick={onClose}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Tabs */}
            <div className="border-b border-gray-200 px-6">
              <nav className="-mb-px flex space-x-6">
                <button
                  onClick={() => setActiveTab('details')}
                  className={`py-3 border-b-2 font-medium text-sm ${
                    activeTab === 'details'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Details
                </button>
                <button
                  onClick={() => setActiveTab('internal')}
                  className={`py-3 border-b-2 font-medium text-sm flex items-center gap-1 ${
                    activeTab === 'internal'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <DollarSign className="h-4 w-4" />
                  Internal
                </button>
                <button
                  onClick={() => setActiveTab('attachments')}
                  className={`py-3 border-b-2 font-medium text-sm flex items-center gap-1 ${
                    activeTab === 'attachments'
                      ? 'border-primary-500 text-primary-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Paperclip className="h-4 w-4" />
                  Attachments
                  {(task.attachments?.length || 0) > 0 && (
                    <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                      {task.attachments.length}
                    </span>
                  )}
                </button>
              </nav>
            </div>

            {/* Content */}
            <div className="p-6 overflow-y-auto flex-1">
              {activeTab === 'details' && (
                <div className="space-y-6">
                  {/* Status and Priority */}
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Status:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                        {task.status.replace('_', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm font-medium text-gray-700">Priority:</span>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                        {task.priority}
                      </span>
                    </div>
                  </div>

                  {/* Escalation Warning */}
                  {task.isEscalated && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                        <div>
                          <p className="text-sm font-medium text-red-800">This task has been escalated</p>
                          {task.escalationReason && (
                            <p className="text-sm text-red-700 mt-1">{task.escalationReason}</p>
                          )}
                          {task.escalatedAt && (
                            <p className="text-xs text-red-600 mt-1">
                              Escalated on {format(new Date(task.escalatedAt), 'MMM dd, yyyy')}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Description */}
                  {task.description && (
                    <div>
                      <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                      <p className="text-gray-600 text-sm whitespace-pre-wrap">{task.description}</p>
                    </div>
                  )}

                  {/* Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Due Date */}
                    {task.dueDate && (
                      <div className="flex items-center space-x-3">
                        <Calendar className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Due Date</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Assignee */}
                    {task.assignee && (
                      <div className="flex items-center space-x-3">
                        <User className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Assigned To</div>
                          <div className="text-sm text-gray-600">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </div>
                          <div className="text-xs text-gray-500">{task.assignee.email}</div>
                        </div>
                      </div>
                    )}

                    {/* Category */}
                    {task.category && (
                      <div className="flex items-center space-x-3">
                        <Tag className="h-5 w-5 text-gray-400" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Category</div>
                          <div className="flex items-center space-x-2">
                            <div
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: task.category.color }}
                            />
                            <span className="text-sm text-gray-600">{task.category.name}</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Creator */}
                    <div className="flex items-center space-x-3">
                      <User className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Created By</div>
                        <div className="text-sm text-gray-600">
                          {task.creator.firstName} {task.creator.lastName}
                        </div>
                      </div>
                    </div>

                    {/* Created Date */}
                    <div className="flex items-center space-x-3">
                      <Clock className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Created</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>

                    {/* Completed Date */}
                    {task.completedAt && (
                      <div className="flex items-center space-x-3">
                        <CheckCircle2 className="h-5 w-5 text-green-500" />
                        <div>
                          <div className="text-sm font-medium text-gray-700">Completed</div>
                          <div className="text-sm text-gray-600">
                            {format(new Date(task.completedAt), 'MMM dd, yyyy')}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {activeTab === 'internal' && (
                <div className="space-y-6">
                  {/* Budget Section */}
                  <TaskBudgetSection
                    taskId={task.id}
                    budgetAmount={task.budgetAmount}
                    approvedAmount={task.approvedAmount}
                    totalPaid={totalPaid}
                    onUpdate={() => refetch()}
                  />

                  {/* Payments Section */}
                  <TaskPaymentList
                    taskId={task.id}
                    payments={task.payments || []}
                    onUpdate={() => refetch()}
                  />
                </div>
              )}

              {activeTab === 'attachments' && (
                <TaskAttachments
                  taskId={task.id}
                  attachments={task.attachments || []}
                  onUpdate={() => refetch()}
                />
              )}
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
                {task.status !== 'COMPLETED' && (
                  <button
                    onClick={() => handleStatusChange('COMPLETED')}
                    disabled={statusMutation.isPending}
                    className="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                  >
                    <CheckCircle2 className="h-4 w-4 mr-1" />
                    Mark Complete
                  </button>
                )}
                {task.status === 'TODO' && (
                  <button
                    onClick={() => handleStatusChange('IN_PROGRESS')}
                    disabled={statusMutation.isPending}
                    className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                  >
                    <PlayCircle className="h-4 w-4 mr-1" />
                    Start Work
                  </button>
                )}
                <button
                  onClick={() => setIsEscalateModalOpen(true)}
                  className={`inline-flex items-center px-3 py-1.5 border text-sm font-medium rounded-md ${
                    task.isEscalated
                      ? 'border-green-300 text-green-700 bg-green-50 hover:bg-green-100'
                      : 'border-red-300 text-red-700 bg-red-50 hover:bg-red-100'
                  }`}
                >
                  <AlertTriangle className="h-4 w-4 mr-1" />
                  {task.isEscalated ? 'De-escalate' : 'Escalate'}
                </button>
              </div>

              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Escalate Modal */}
      <EscalateTaskModal
        taskId={task.id}
        taskTitle={task.title}
        isEscalated={task.isEscalated}
        isOpen={isEscalateModalOpen}
        onClose={() => setIsEscalateModalOpen(false)}
        onSuccess={() => refetch()}
      />
    </>
  )
}
