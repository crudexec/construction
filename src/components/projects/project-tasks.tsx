'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd'
import {
  Plus,
  Calendar,
  User,
  CheckSquare,
  Clock,
  AlertCircle,
  AlertTriangle,
  MoreHorizontal,
  Edit,
  Trash2,
  X,
  ChevronDown,
  ChevronRight,
  Folder,
  FolderOpen,
  Share,
  Copy,
  ExternalLink,
  Eye,
  Table,
  List,
  Check,
  ChevronUp,
  ArrowUpDown,
  GripVertical,
  Building2,
  DollarSign,
  CheckCircle,
  XCircle,
  Target,
  Paperclip,
  Search,
  Link2,
  GitBranch
} from 'lucide-react'
import toast from 'react-hot-toast'
import { TaskAnalytics } from '@/components/admin/task-analytics'
import { CompactFilters } from '@/components/ui/compact-filters'
import { useModal } from '@/components/ui/modal-provider'
import { TaskComments } from '@/components/projects/task-comments'
import { TaskAttachments } from '@/components/projects/task-attachments'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'

interface ProjectTasksProps {
  projectId: string
  shouldOpenAddModal?: boolean
  openTaskId?: string | null
}

interface TaskCategory {
  id: string
  name: string
  description?: string
  color: string
  order: number
  _count: {
    tasks: number
  }
}

interface Task {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  order?: number
  category?: {
    id: string
    name: string
    color: string
    order?: number
  }
  milestone?: {
    id: string
    title: string
    description?: string
    status: string
    targetDate?: string
    completedDate?: string
    amount?: number
    order: number
  }
  milestoneId?: string
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
  dependsOn?: Array<{
    id: string
    title: string
    status: string
  }>
  vendor?: {
    id: string
    name: string
    companyName: string
  }
  budgetAmount?: number
  approvedAmount?: number
  completionPendingApproval?: boolean
  completionRequestedAt?: string
  completionApprovedAt?: string
  completionApprover?: {
    id: string
    firstName: string
    lastName: string
  }
  attachments?: Array<{
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
  }>
  createdAt: string
}

interface Vendor {
  id: string
  name: string
  companyName: string
}

const taskSchema = Yup.object().shape({
  title: Yup.string().required('Task title is required'),
  description: Yup.string(),
  priority: Yup.string().required('Priority is required'),
  dueDate: Yup.date(),
  categoryId: Yup.string(),
  milestoneId: Yup.string(),
  assigneeId: Yup.string(),
  vendorId: Yup.string(),
  dependencyIds: Yup.array().of(Yup.string())
})

const categorySchema = Yup.object().shape({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  color: Yup.string().required('Color is required')
})

const milestoneSchema = Yup.object().shape({
  title: Yup.string().required('Milestone title is required'),
  description: Yup.string(),
  targetDate: Yup.date().nullable(),
  amount: Yup.number().nullable()
})

async function fetchProjectTasks(projectId: string, groupBy?: string) {
  const url = groupBy
    ? `/api/project/${projectId}/tasks?groupBy=${groupBy}`
    : `/api/project/${projectId}/tasks`
  const response = await fetch(url, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

async function createTask(projectId: string, data: any) {
  const response = await fetch(`/api/project/${projectId}/tasks`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create task')
  return response.json()
}

async function updateTask(taskId: string, data: any) {
  const response = await fetch(`/api/task/${taskId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update task')
  return response.json()
}

async function reorderTasks(projectId: string, taskIds: string[]) {
  const response = await fetch(`/api/project/${projectId}/tasks/reorder`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify({ taskIds }),
  })
  if (!response.ok) throw new Error('Failed to reorder tasks')
  return response.json()
}

async function deleteTask(taskId: string) {
  const response = await fetch(`/api/task/${taskId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to delete task')
  return response.json()
}

async function duplicateTask(taskId: string) {
  const response = await fetch(`/api/task/${taskId}/duplicate`, {
    method: 'POST',
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to duplicate task')
  return response.json()
}

async function fetchProjectCategories(projectId: string) {
  const response = await fetch(`/api/project/${projectId}/categories`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function createCategory(projectId: string, data: any) {
  const response = await fetch(`/api/project/${projectId}/categories`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create category')
  return response.json()
}

async function deleteCategory(categoryId: string) {
  const response = await fetch(`/api/category/${categoryId}`, {
    method: 'DELETE',
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to delete category')
  return response.json()
}

async function createMilestone(projectId: string, data: any) {
  const response = await fetch(`/api/project/${projectId}/milestones`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    credentials: 'include',
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create milestone')
  return response.json()
}

async function fetchTeamMembers() {
  const response = await fetch('/api/users', {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch team members')
  return response.json()
}

async function fetchProjectTeamMembers(projectId: string) {
  const response = await fetch(`/api/project/${projectId}/team`, {
    credentials: 'include'
  })
  if (!response.ok) throw new Error('Failed to fetch project team members')
  const data = await response.json()

  // The API returns { owner, teamMembers }, we want to combine them for the dropdown
  const allMembers = []
  if (data.owner) {
    allMembers.push(data.owner)
  }
  if (data.teamMembers && Array.isArray(data.teamMembers)) {
    allMembers.push(...data.teamMembers)
  }

  return allMembers
}

async function fetchVendors(): Promise<Vendor[]> {
  const response = await fetch('/api/vendors', {
    credentials: 'include'
  })
  if (!response.ok) return []
  return response.json()
}

// Helper function to get due date status and styling
function getDueDateInfo(dueDate: string | null, status: string) {
  if (!dueDate || status === 'COMPLETED') {
    return null
  }

  const now = new Date()
  const due = new Date(dueDate)
  const diffTime = due.getTime() - now.getTime()
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))

  if (diffDays < 0) {
    const overdueDays = Math.abs(diffDays)
    return {
      label: `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`,
      tooltip: `${overdueDays} day${overdueDays > 1 ? 's' : ''} overdue`,
      className: 'bg-red-100 text-red-800 border border-red-200',
      icon: 'AlertTriangle'
    }
  } else if (diffDays === 0) {
    return {
      label: 'Due today',
      tooltip: 'Due today',
      className: 'bg-orange-100 text-orange-800 border border-orange-200',
      icon: 'Calendar'
    }
  } else if (diffDays <= 3) {
    return {
      label: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      tooltip: `Due in ${diffDays} day${diffDays > 1 ? 's' : ''}`,
      className: 'bg-yellow-100 text-yellow-800 border border-yellow-200',
      icon: 'Clock'
    }
  }
  
  return null
}

// Table Row Component for editable tasks
function TableTaskRow({ 
  task, 
  isSelected, 
  onSelect, 
  onStatusChange,
  priorityColors,
  statusColors,
  updateMutation,
  duplicateMutation,
  deleteMutation,
  shareTask,
  setAnalyticsTaskId,
  categories,
  members,
  dragProvided,
  isDragging
}: {
  task: Task
  isSelected: boolean
  onSelect: (checked: boolean) => void
  onStatusChange: (taskId: string, status: string) => void
  priorityColors: any
  statusColors: any
  updateMutation: any
  duplicateMutation: any
  deleteMutation: any
  shareTask: (taskId: string) => void
  setAnalyticsTaskId: (taskId: string) => void
  categories: TaskCategory[]
  members: any[]
  dragProvided?: any
  isDragging?: boolean
}) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editTitle, setEditTitle] = useState(task.title)
  const [isEditingDescription, setIsEditingDescription] = useState(false)
  const [editDescription, setEditDescription] = useState(task.description || '')

  const handleTitleSave = () => {
    if (editTitle.trim() && editTitle !== task.title) {
      updateMutation.mutate({ 
        taskId: task.id, 
        data: { title: editTitle.trim() } 
      })
    }
    setIsEditingTitle(false)
  }

  const handleDescriptionSave = () => {
    if (editDescription !== task.description) {
      updateMutation.mutate({ 
        taskId: task.id, 
        data: { description: editDescription.trim() } 
      })
    }
    setIsEditingDescription(false)
  }

  return (
    <tr 
      ref={dragProvided?.innerRef}
      {...dragProvided?.draggableProps}
      className={`hover:bg-gray-50 ${isDragging ? 'bg-blue-50 opacity-75' : ''}`}
    >
      <td className="px-2 py-3 whitespace-nowrap">
        <div 
          {...dragProvided?.dragHandleProps}
          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
        >
          <GripVertical className="h-4 w-4" />
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={(e) => onSelect(e.target.checked)}
          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
        />
      </td>
      <td className="px-3 py-3">
        <div className="space-y-1">
          {isEditingTitle ? (
            <input
              type="text"
              value={editTitle}
              onChange={(e) => setEditTitle(e.target.value)}
              onBlur={handleTitleSave}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleTitleSave()
                if (e.key === 'Escape') {
                  setEditTitle(task.title)
                  setIsEditingTitle(false)
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-sm"
              autoFocus
            />
          ) : (
            <div 
              onClick={() => setIsEditingTitle(true)}
              className="text-sm font-medium text-gray-900 cursor-pointer hover:text-primary-600"
            >
              {task.title}
            </div>
          )}
          {isEditingDescription ? (
            <textarea
              value={editDescription}
              onChange={(e) => setEditDescription(e.target.value)}
              onBlur={handleDescriptionSave}
              onKeyDown={(e) => {
                if (e.key === 'Escape') {
                  setEditDescription(task.description || '')
                  setIsEditingDescription(false)
                }
              }}
              className="w-full px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
              rows={2}
            />
          ) : (
            <div 
              onClick={() => setIsEditingDescription(true)}
              className="text-xs text-gray-500 cursor-pointer hover:text-gray-700"
            >
              {task.description || <span className="italic">Add description...</span>}
            </div>
          )}
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <select
          value={task.status}
          onChange={(e) => onStatusChange(task.id, e.target.value)}
          className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${statusColors[task.status]}`}
        >
          <option value="TODO">TODO</option>
          <option value="IN_PROGRESS">IN PROGRESS</option>
          <option value="COMPLETED">COMPLETED</option>
        </select>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <select
          value={task.priority}
          onChange={(e) => updateMutation.mutate({ 
            taskId: task.id, 
            data: { priority: e.target.value } 
          })}
          className={`text-xs rounded-full px-2 py-1 font-medium border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 ${priorityColors[task.priority]}`}
        >
          <option value="LOW">LOW</option>
          <option value="MEDIUM">MEDIUM</option>
          <option value="HIGH">HIGH</option>
          <option value="URGENT">URGENT</option>
        </select>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <select
          value={task.assignee?.id || ''}
          onChange={(e) => updateMutation.mutate({ 
            taskId: task.id, 
            data: { assigneeId: e.target.value || null } 
          })}
          className="text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Unassigned</option>
          {members.map((member: any) => (
            <option key={member.id} value={member.id}>
              {member.firstName} {member.lastName}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <select
          value={task.category?.id || ''}
          onChange={(e) => updateMutation.mutate({ 
            taskId: task.id, 
            data: { categoryId: e.target.value || null } 
          })}
          className="text-sm text-gray-900 border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-1 focus:ring-primary-500"
        >
          <option value="">Uncategorized</option>
          {categories.map((category: TaskCategory) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="space-y-1">
          {(() => {
            const dueDateInfo = getDueDateInfo(task.dueDate || null, task.status)
            return dueDateInfo ? (
              <div className="flex justify-center mb-1">
                {dueDateInfo.icon === 'AlertTriangle' && (
                  <div 
                    className="h-3 w-3 rounded-full bg-red-500 border border-red-600 cursor-pointer"
                    title={dueDateInfo.tooltip || dueDateInfo.label}
                  ></div>
                )}
                {dueDateInfo.icon === 'Calendar' && (
                  <div 
                    className="h-3 w-3 rounded-full bg-orange-500 border border-orange-600 cursor-pointer"
                    title={dueDateInfo.tooltip || dueDateInfo.label}
                  ></div>
                )}
                {dueDateInfo.icon === 'Clock' && (
                  <div 
                    className="h-3 w-3 rounded-full bg-yellow-500 border border-yellow-600 cursor-pointer"
                    title={dueDateInfo.tooltip || dueDateInfo.label}
                  ></div>
                )}
              </div>
            ) : null
          })()}
          <DatePicker
            value={task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : ''}
            onChange={(date) => updateMutation.mutate({
              taskId: task.id,
              data: { dueDate: date ? new Date(date) : null }
            })}
            placeholder="Select date"
          />
        </div>
      </td>
      <td className="px-3 py-3 whitespace-nowrap text-sm text-gray-500">
        {new Date(task.createdAt).toLocaleDateString()}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => shareTask(task.id)}
            className="text-gray-400 hover:text-blue-600 p-1"
            title="Share Task"
          >
            <Share className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setAnalyticsTaskId(task.id)}
            className="text-gray-400 hover:text-purple-600 p-1"
            title="View Analytics"
          >
            <Eye className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => duplicateMutation.mutate(task.id)}
            className="text-gray-400 hover:text-indigo-600 p-1"
            title="Duplicate"
          >
            <Copy className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => deleteMutation.mutate(task.id)}
            className="text-gray-400 hover:text-red-600 p-1"
            title="Delete"
          >
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </td>
    </tr>
  )
}

export function ProjectTasks({ projectId, shouldOpenAddModal, openTaskId }: ProjectTasksProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [isAddMilestoneModalOpen, setIsAddMilestoneModalOpen] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [sharingTask, setSharingTask] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [analyticsTaskId, setAnalyticsTaskId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editModalTab, setEditModalTab] = useState<'details' | 'internal' | 'comments' | 'attachments'>('details')
  const [viewType, setViewType] = useState<'list' | 'table'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('taskViewType') as 'list' | 'table') || 'list'
    }
    return 'list'
  })
  const [groupBy, setGroupBy] = useState<'category' | 'milestone'>(() => {
    if (typeof window !== 'undefined') {
      return (localStorage.getItem('taskGroupBy') as 'category' | 'milestone') || 'category'
    }
    return 'category'
  })
  const [selectedTasks, setSelectedTasks] = useState<Set<string>>(new Set())
  const [sortColumn, setSortColumn] = useState<string | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')
  const [editingTaskId, setEditingTaskId] = useState<string | null>(null)
  const [editingField, setEditingField] = useState<string | null>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()
  const { format: formatCurrency, symbol: currencySymbol } = useCurrency()

  // Open modal when shouldOpenAddModal prop is true
  useEffect(() => {
    if (shouldOpenAddModal) {
      setIsAddModalOpen(true)
    }
  }, [shouldOpenAddModal])

  // Handle view type change and persist to localStorage
  const handleViewTypeChange = (type: 'list' | 'table') => {
    setViewType(type)
    localStorage.setItem('taskViewType', type)
  }

  // Handle group by change and persist to localStorage
  const handleGroupByChange = (type: 'category' | 'milestone') => {
    setGroupBy(type)
    localStorage.setItem('taskGroupBy', type)
  }

  // Handle sorting
  const handleSort = (column: string) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortColumn(column)
      setSortDirection('asc')
    }
  }

  // Handle drag and drop
  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination) return

    const { source, destination } = result

    // Handle table view reordering (single droppable for all tasks)
    if (source.droppableId === 'table-tasks' && destination.droppableId === 'table-tasks') {
      // Use sortedTasks for table view
      const currentTasks = queryClient.getQueryData<Task[]>(['project-tasks', projectId]) || []
      const reorderedTasks = [...currentTasks]
      const [removed] = reorderedTasks.splice(source.index, 1)

      if (!removed) {
        console.error('No task found at source index:', source.index)
        return
      }

      reorderedTasks.splice(destination.index, 0, removed)

      // Get the new order of task IDs
      const reorderedTaskIds = reorderedTasks.map((task: Task) => task.id)

      // Optimistically update the UI
      queryClient.setQueryData(['project-tasks', projectId], (oldData: Task[]) => {
        if (!oldData) return oldData

        // Create a map of new orders
        const orderMap = new Map<string, number>()
        reorderedTaskIds.forEach((id: string, index: number) => {
          orderMap.set(id, index)
        })

        // Update the order in the tasks array
        return oldData.map((task: Task) => ({
          ...task,
          order: orderMap.get(task.id) ?? task.order
        }))
      })

      // Call API to persist the order
      try {
        await reorderTasks(projectId, reorderedTaskIds)
        toast.success('Task order updated')
      } catch (error) {
        // Revert on error by refetching
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
        toast.error('Failed to update task order')
      }
      return
    }

    // Handle list view reordering (grouped by milestone or category)
    if (source.droppableId === destination.droppableId) {
      // Same group reordering
      if (groupBy === 'milestone') {
        const milestoneId = source.droppableId
        const milestoneData = tasksByMilestone[milestoneId]
        if (!milestoneData) {
          console.error('No milestone data found for:', milestoneId)
          return
        }

        const tasksInMilestone = [...milestoneData.tasks]
        const [removed] = tasksInMilestone.splice(source.index, 1)
        if (!removed) return

        tasksInMilestone.splice(destination.index, 0, removed)
        const reorderedTaskIds = tasksInMilestone.map((task: Task) => task.id)

        // Optimistically update the UI
        queryClient.setQueryData(['project-tasks', projectId, groupBy], (oldData: any) => {
          if (!oldData) return oldData

          // If data is grouped (from API)
          if (oldData.groupBy === 'milestone' && oldData.groups) {
            return {
              ...oldData,
              groups: oldData.groups.map((group: any) => {
                const groupId = group.milestone?.id || 'unassigned'
                if (groupId === milestoneId) {
                  return {
                    ...group,
                    tasks: reorderedTaskIds.map((id: string) =>
                      tasksInMilestone.find((t: Task) => t.id === id)
                    ).filter(Boolean)
                  }
                }
                return group
              })
            }
          }

          // If data is flat array
          if (Array.isArray(oldData)) {
            const orderMap = new Map<string, number>()
            reorderedTaskIds.forEach((id: string, index: number) => {
              orderMap.set(id, index)
            })

            return oldData.map((task: Task) => {
              if (orderMap.has(task.id)) {
                return { ...task, order: orderMap.get(task.id) }
              }
              return task
            })
          }

          return oldData
        })

        try {
          await reorderTasks(projectId, reorderedTaskIds)
          toast.success('Task order updated')
        } catch (error) {
          // Revert on error by refetching
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
          toast.error('Failed to update task order')
        }
        return
      }

      // Category reordering (existing logic)
      const categoryId = source.droppableId
      const tasksInCategory = [...(tasksByCategory[categoryId] || [])]

      if (tasksInCategory.length === 0) {
        console.error('No tasks found in category:', categoryId)
        return
      }

      const [removed] = tasksInCategory.splice(source.index, 1)

      if (!removed) {
        console.error('No task found at source index:', source.index)
        return
      }

      tasksInCategory.splice(destination.index, 0, removed)

      // Get the new order of task IDs for this category
      const reorderedTaskIds = tasksInCategory.map((task: Task) => task.id)

      // Optimistically update the UI
      queryClient.setQueryData(['project-tasks', projectId], (oldData: Task[]) => {
        if (!oldData) return oldData

        // Create a map of new orders
        const orderMap = new Map<string, number>()
        reorderedTaskIds.forEach((id: string, index: number) => {
          orderMap.set(id, index)
        })

        // Update the order in the tasks array
        return oldData.map((task: Task) => {
          if (orderMap.has(task.id)) {
            return { ...task, order: orderMap.get(task.id) }
          }
          return task
        }).sort((a: Task, b: Task) => {
          // Sort by category order first, then by task order
          const categoryOrderA = a.category?.order ?? 999
          const categoryOrderB = b.category?.order ?? 999
          if (categoryOrderA !== categoryOrderB) return categoryOrderA - categoryOrderB
          return (a.order ?? 0) - (b.order ?? 0)
        })
      })

      // Call API to persist the order
      try {
        await reorderTasks(projectId, reorderedTaskIds)
        toast.success('Task order updated')
      } catch (error) {
        // Revert on error by refetching
        queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
        toast.error('Failed to update task order')
      }
    } else {
      // Moving between groups (milestone or category)
      if (groupBy === 'milestone') {
        // Moving between milestones
        const sourceMilestoneId = source.droppableId
        const destMilestoneId = destination.droppableId

        const sourceData = tasksByMilestone[sourceMilestoneId]
        const destData = tasksByMilestone[destMilestoneId]

        if (!sourceData || !destData) {
          console.error('Milestone data not found')
          return
        }

        const sourceTasks = [...sourceData.tasks]
        const [movedTask] = sourceTasks.splice(source.index, 1)

        if (!movedTask) return

        // Update the task's milestone
        const newMilestoneId = destMilestoneId === 'unassigned' ? null : destMilestoneId

        // Optimistically update the UI
        queryClient.setQueryData(['project-tasks', projectId, groupBy], (oldData: any) => {
          if (!oldData) return oldData

          // If data is grouped (from API)
          if (oldData.groupBy === 'milestone' && oldData.groups) {
            return {
              ...oldData,
              groups: oldData.groups.map((group: any) => {
                const groupId = group.milestone?.id || 'unassigned'

                // Remove from source
                if (groupId === sourceMilestoneId) {
                  return {
                    ...group,
                    tasks: group.tasks.filter((t: Task) => t.id !== movedTask.id)
                  }
                }

                // Add to destination
                if (groupId === destMilestoneId) {
                  const updatedTask = { ...movedTask, milestoneId: newMilestoneId }
                  const newTasks = [...group.tasks]
                  newTasks.splice(destination.index, 0, updatedTask)
                  return {
                    ...group,
                    tasks: newTasks
                  }
                }

                return group
              })
            }
          }

          // If data is flat array
          if (Array.isArray(oldData)) {
            return oldData.map((task: Task) => {
              if (task.id === movedTask.id) {
                return { ...task, milestoneId: newMilestoneId }
              }
              return task
            })
          }

          return oldData
        })

        try {
          await updateTask(movedTask.id, { milestoneId: newMilestoneId })
          toast.success(`Task moved to ${destMilestoneId === 'unassigned' ? 'Unassigned' : destData.milestone?.title || 'milestone'}`)
        } catch (error) {
          // Revert on error
          queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
          toast.error('Failed to move task')
        }
      } else {
        // Moving between categories (existing logic)
        const sourceCategory = source.droppableId
        const destCategory = destination.droppableId
        const sourceTasks = [...(tasksByCategory[sourceCategory] || [])]
        const destTasks = [...(tasksByCategory[destCategory] || [])]

        if (sourceTasks.length === 0) {
          console.error('No tasks found in source category:', sourceCategory)
          return
        }

        const [movedTask] = sourceTasks.splice(source.index, 1)

        if (!movedTask) {
          console.error('No task found at source index:', source.index)
          return
        }

        destTasks.splice(destination.index, 0, movedTask)

        // Update the task's category and reorder destination category
        const newCategoryId = destCategory === 'uncategorized' ? null : destCategory
        const reorderedDestTaskIds = destTasks.map((task: Task) => task.id)

        // Update category first
        updateMutation.mutate({
          taskId: movedTask.id,
          data: { categoryId: newCategoryId }
        })

        // Then reorder the destination category
        try {
          await reorderTasks(projectId, reorderedDestTaskIds)
        } catch (error) {
          console.error('Failed to reorder after category change:', error)
        }
      }
    }
  }

  const { data: tasksData, isLoading } = useQuery({
    queryKey: ['project-tasks', projectId, groupBy],
    queryFn: () => fetchProjectTasks(projectId, groupBy === 'milestone' ? 'milestone' : undefined),
    enabled: !!projectId
  })

  // Extract tasks - handle both flat array and grouped response
  const tasks = tasksData?.groupBy === 'milestone'
    ? tasksData.groups.flatMap((g: any) => g.tasks)
    : (Array.isArray(tasksData) ? tasksData : [])

  const milestonesWithTasks = tasksData?.groupBy === 'milestone' ? tasksData.groups : []

  // Open specific task modal when openTaskId is provided
  useEffect(() => {
    if (openTaskId && tasks.length > 0) {
      const taskToOpen = tasks.find((t: Task) => t.id === openTaskId)
      if (taskToOpen) {
        setSelectedTask(taskToOpen)
        setIsEditModalOpen(true)
        setEditModalTab('details')
      }
    }
  }, [openTaskId, tasks])

  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: () => fetchProjectCategories(projectId),
    enabled: !!projectId
  })

  const { data: milestones = [] } = useQuery({
    queryKey: ['project-milestones', projectId],
    queryFn: async () => {
      const response = await fetch(`/api/project/${projectId}/milestones`, {
        credentials: 'include'
      })
      if (!response.ok) throw new Error('Failed to fetch milestones')
      return response.json()
    },
    enabled: !!projectId && groupBy === 'milestone'
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['project-team', projectId],
    queryFn: () => fetchProjectTeamMembers(projectId),
    enabled: !!projectId
  })

  const { data: vendors = [] } = useQuery({
    queryKey: ['vendors'],
    queryFn: fetchVendors
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask(projectId, data),
    onSuccess: () => {
      toast.success('Task created successfully!')
      // Invalidate all project-tasks queries (with any groupBy param)
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      setIsAddModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string, data: any }) => updateTask(taskId, data),
    onMutate: async ({ taskId, data }) => {
      // Cancel outgoing refetches
      await queryClient.cancelQueries({ queryKey: ['project-tasks', projectId] })

      // Snapshot the previous value
      const previousTasks = queryClient.getQueryData(['project-tasks', projectId, groupBy])
      
      // Optimistically update the cache
      queryClient.setQueryData(['project-tasks', projectId], (old: any) => {
        if (!old?.tasks) return old
        return {
          ...old,
          tasks: old.tasks.map((task: Task) => 
            task.id === taskId ? { ...task, ...data } : task
          )
        }
      })
      
      return { previousTasks }
    },
    onSuccess: () => {
      toast.success('Task updated successfully!')
      // Invalidate all variations of project-tasks queries
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      setIsEditModalOpen(false)
      setSelectedTask(null)
    },
    onError: (error, variables, context) => {
      // Rollback on error
      if (context?.previousTasks) {
        queryClient.setQueryData(['project-tasks', projectId], context.previousTasks)
      }
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
    }
  })

  // Separate mutation for internal tab updates (doesn't close modal)
  const internalUpdateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string, data: any }) => updateTask(taskId, data),
    onSuccess: (updatedTask) => {
      toast.success('Saved')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      // Update selectedTask with new values without closing modal
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, ...updatedTask })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to save')
    }
  })

  const approvalMutation = useMutation({
    mutationFn: async ({ taskId, action }: { taskId: string, action: 'approve' | 'reject' }) => {
      const response = await fetch(`/api/task/${taskId}/approve`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({ action })
      })
      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to process approval')
      }
      return response.json()
    },
    onSuccess: (updatedTask, { action }) => {
      toast.success(action === 'approve' ? 'Task completion approved' : 'Task completion rejected')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      if (selectedTask) {
        setSelectedTask({ ...selectedTask, ...updatedTask })
      }
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to process approval')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteTask,
    onSuccess: () => {
      toast.success('Task deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete task')
    }
  })

  const duplicateMutation = useMutation({
    mutationFn: duplicateTask,
    onSuccess: () => {
      toast.success('Task duplicated successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to duplicate task')
    }
  })

  const createCategoryMutation = useMutation({
    mutationFn: (data: any) => createCategory(projectId, data),
    onSuccess: () => {
      toast.success('Category created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-categories', projectId] })
      setIsAddCategoryModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create category')
    }
  })

  const deleteCategoryMutation = useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => {
      toast.success('Category deleted successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-categories', projectId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete category')
    }
  })

  const createMilestoneMutation = useMutation({
    mutationFn: (data: any) => createMilestone(projectId, data),
    onSuccess: () => {
      toast.success('Milestone created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-milestones', projectId] })
      setIsAddMilestoneModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create milestone')
    }
  })

  const statuses = ['TODO', 'IN_PROGRESS', 'COMPLETED']
  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']

  // Filter tasks
  const filteredTasks = tasks.filter((task: Task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         task.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || task.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || task.priority === selectedPriority
    const matchesCategory = selectedCategory === 'all' || 
                           (selectedCategory === 'uncategorized' && !task.category) ||
                           task.category?.id === selectedCategory
    
    return matchesSearch && matchesStatus && matchesPriority && matchesCategory
  })

  // Group tasks by category
  const tasksByCategory = filteredTasks.reduce((acc: { [key: string]: Task[] }, task: Task) => {
    const categoryId = task.category?.id || 'uncategorized'
    const categoryName = task.category?.name || 'Uncategorized'

    if (!acc[categoryId]) {
      acc[categoryId] = []
    }
    acc[categoryId].push(task)

    return acc
  }, {})

  // Group tasks by milestone (only when groupBy is 'milestone')
  const tasksByMilestone = groupBy === 'milestone' && milestonesWithTasks.length > 0
    ? milestonesWithTasks.reduce((acc: { [key: string]: { milestone: any; tasks: Task[] } }, group: any) => {
        const milestoneId = group.milestone?.id || 'unassigned'
        acc[milestoneId] = {
          milestone: group.milestone,
          tasks: group.tasks
        }
        return acc
      }, {})
    : filteredTasks.reduce((acc: { [key: string]: { milestone: any; tasks: Task[] } }, task: Task) => {
        const milestoneId = task.milestoneId || 'unassigned'

        if (!acc[milestoneId]) {
          acc[milestoneId] = {
            milestone: task.milestone || null,
            tasks: []
          }
        }
        acc[milestoneId].tasks.push(task)

        return acc
      }, {})

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  const statusColors = {
    TODO: 'bg-gray-100 text-gray-800',
    IN_PROGRESS: 'bg-yellow-100 text-yellow-800',
    COMPLETED: 'bg-green-100 text-green-800',
  }

  // Handle bulk selection
  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedTasks(new Set(filteredTasks.map((task: Task) => task.id)))
    } else {
      setSelectedTasks(new Set())
    }
  }

  const handleSelectTask = (taskId: string, checked: boolean) => {
    const newSelected = new Set(selectedTasks)
    if (checked) {
      newSelected.add(taskId)
    } else {
      newSelected.delete(taskId)
    }
    setSelectedTasks(newSelected)
  }

  // Sort tasks if needed for table view
  const sortedTasks = [...filteredTasks].sort((a: Task, b: Task) => {
    // Always sort by category first (primary sort)
    const aCategoryOrder = a.category?.order ?? Number.MAX_VALUE
    const bCategoryOrder = b.category?.order ?? Number.MAX_VALUE
    
    if (aCategoryOrder !== bCategoryOrder) {
      return aCategoryOrder - bCategoryOrder
    }
    
    // If categories are the same, apply secondary sort
    if (!sortColumn) {
      // Default to creation date if no column is selected
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    }
    
    let aVal: any = a[sortColumn as keyof Task]
    let bVal: any = b[sortColumn as keyof Task]
    
    // Handle nested properties
    if (sortColumn === 'assignee') {
      aVal = a.assignee ? `${a.assignee.firstName} ${a.assignee.lastName}` : ''
      bVal = b.assignee ? `${b.assignee.firstName} ${b.assignee.lastName}` : ''
    } else if (sortColumn === 'category') {
      // For category column sort, use the name for secondary sorting within same order
      aVal = a.category?.name || ''
      bVal = b.category?.name || ''
    } else if (sortColumn === 'dueDate') {
      aVal = a.dueDate ? new Date(a.dueDate).getTime() : Number.MAX_VALUE
      bVal = b.dueDate ? new Date(b.dueDate).getTime() : Number.MAX_VALUE
    } else if (sortColumn === 'createdAt') {
      aVal = new Date(a.createdAt).getTime()
      bVal = new Date(b.createdAt).getTime()
    }
    
    if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1
    if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1
    
    // Tertiary sort by creation date if values are equal
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  })

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updateData = { 
      status: newStatus,
      ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {})
    }
    updateMutation.mutate({ taskId, data: updateData })
  }

  const handleDuplicateTask = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation()
    duplicateMutation.mutate(task.id)
  }

  const handleEditTask = (task: Task, event: React.MouseEvent) => {
    event.stopPropagation()
    setSelectedTask(task)
    setIsEditModalOpen(true)
  }

  const handleArchiveTask = async (task: Task, event: React.MouseEvent) => {
    event.stopPropagation()
    try {
      const confirmed = await showConfirm(
        `Are you sure you want to delete "${task.title}"? This action cannot be undone.`,
        'Delete Task'
      )

      if (confirmed) {
        deleteMutation.mutate(task.id)
      }
    } catch (error) {
      toast.error('Failed to delete task')
    }
  }

  const toggleCategoryCollapse = (categoryId: string) => {
    const newCollapsed = new Set(collapsedCategories)
    if (newCollapsed.has(categoryId)) {
      newCollapsed.delete(categoryId)
    } else {
      newCollapsed.add(categoryId)
    }
    setCollapsedCategories(newCollapsed)
  }

  const isCategoryCollapsed = (categoryId: string) => {
    return collapsedCategories.has(categoryId)
  }

  // Share task functionality
  // Handle task click to open edit modal
  const handleTaskClick = (task: Task, event: React.MouseEvent) => {
    // Don't open modal if clicking on buttons or interactive elements
    const target = event.target as HTMLElement
    if (target.closest('button') || target.closest('a')) {
      return
    }
    
    setSelectedTask(task)
    setIsEditModalOpen(true)
  }

  const shareTask = async (taskId: string) => {
    try {
      setSharingTask(taskId)
      const response = await fetch(`/api/task/${taskId}/share`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!response.ok) {
        throw new Error('Failed to share task')
      }

      const data = await response.json()
      setShareUrl(data.shareUrl)
      setShowShareModal(true)
      toast.success('Task sharing enabled!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to share task')
    } finally {
      setSharingTask(null)
    }
  }

  const copyShareUrl = async () => {
    if (shareUrl) {
      try {
        await navigator.clipboard.writeText(shareUrl)
        toast.success('Share link copied to clipboard!')
      } catch (error) {
        toast.error('Failed to copy link')
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Compact Header with Filters */}
      <div className="space-y-3">
        {/* Action Buttons */}
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
              <div className="flex items-center gap-3">
                {/* Group By Toggle (only in list view) */}
                {viewType === 'list' && (
                  <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                    <button
                      onClick={() => handleGroupByChange('category')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        groupBy === 'category'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="Group by Category"
                    >
                      <Folder className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleGroupByChange('milestone')}
                      className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                        groupBy === 'milestone'
                          ? 'bg-white text-gray-900 shadow'
                          : 'text-gray-600 hover:text-gray-900'
                      }`}
                      title="Group by Milestone"
                    >
                      <Target className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {/* View Toggle */}
                <div className="flex items-center bg-gray-100 rounded-md p-0.5">
                  <button
                    onClick={() => handleViewTypeChange('list')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewType === 'list'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="List View"
                  >
                    <List className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleViewTypeChange('table')}
                    className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                      viewType === 'table'
                        ? 'bg-white text-gray-900 shadow'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                    title="Table View"
                  >
                    <Table className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex space-x-2">
              {selectedTasks.size > 0 && viewType === 'table' && (
                <div className="flex items-center space-x-2 mr-4">
                  <span className="text-sm text-gray-600">{selectedTasks.size} selected</span>
                  <button
                    onClick={async () => {
                      const confirmed = await showConfirm(
                        `Delete ${selectedTasks.size} selected tasks?`,
                        'Delete Tasks'
                      )
                      if (confirmed) {
                        // Implement bulk delete
                        selectedTasks.forEach(taskId => {
                          deleteMutation.mutate(taskId)
                        })
                        setSelectedTasks(new Set())
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete Selected
                  </button>
                </div>
              )}
              <button
                onClick={() => setIsAddCategoryModalOpen(true)}
                className="bg-gray-600 text-white px-3 py-1.5 rounded-md hover:bg-gray-700 flex items-center space-x-1 text-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Category</span>
              </button>
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="bg-primary-600 text-white px-3 py-1.5 rounded-md hover:bg-primary-700 flex items-center space-x-1 text-sm"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Task</span>
              </button>
            </div>
          </div>
        </div>

        {/* Compact Filters */}
        <CompactFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search tasks..."
          resultsCount={filteredTasks.length}
          filters={[
            {
              key: 'category',
              label: 'Category',
              value: selectedCategory,
              onChange: setSelectedCategory,
              options: [
                { value: 'all', label: 'All Categories' },
                { value: 'uncategorized', label: 'Uncategorized' },
                ...categories.map((category: TaskCategory) => ({ 
                  value: category.id, 
                  label: category.name 
                }))
              ]
            },
            {
              key: 'status',
              label: 'Status',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: [
                { value: 'all', label: 'All Status' },
                ...statuses.map(status => ({ 
                  value: status, 
                  label: status.replace(/_/g, ' ') 
                }))
              ]
            },
            {
              key: 'priority',
              label: 'Priority',
              value: selectedPriority,
              onChange: setSelectedPriority,
              options: [
                { value: 'all', label: 'All Priorities' },
                ...priorities.map(priority => ({ value: priority, label: priority }))
              ]
            }
          ]}
        />
      </div>

      {/* Task View - Conditional rendering based on viewType */}
      {viewType === 'table' ? (
        /* Table View */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="w-8 px-2 py-3"></th>
                    <th scope="col" className="w-12 px-3 py-3">
                      <input
                        type="checkbox"
                        checked={selectedTasks.size === filteredTasks.length && filteredTasks.length > 0}
                        onChange={(e) => handleSelectAll(e.target.checked)}
                        className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                      />
                    </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Task</span>
                      {sortColumn === 'title' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Status</span>
                      {sortColumn === 'status' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Priority</span>
                      {sortColumn === 'priority' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('assignee')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Assignee</span>
                      {sortColumn === 'assignee' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('category')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Category</span>
                      {sortColumn === 'category' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('dueDate')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Due Date</span>
                      {sortColumn === 'dueDate' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th 
                    scope="col" 
                    className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort('createdAt')}
                  >
                    <div className="flex items-center space-x-1">
                      <span>Created</span>
                      {sortColumn === 'createdAt' && (
                        sortDirection === 'asc' ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />
                      )}
                    </div>
                  </th>
                  <th scope="col" className="relative px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <Droppable droppableId="table-tasks">
                {(provided) => (
                  <tbody 
                    className="bg-white divide-y divide-gray-200"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {sortedTasks.map((task: Task, index: number) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <TableTaskRow
                            task={task}
                            isSelected={selectedTasks.has(task.id)}
                            onSelect={(checked) => handleSelectTask(task.id, checked)}
                            onStatusChange={handleStatusChange}
                            priorityColors={priorityColors}
                            statusColors={statusColors}
                            updateMutation={updateMutation}
                            duplicateMutation={duplicateMutation}
                            deleteMutation={deleteMutation}
                            shareTask={shareTask}
                            setAnalyticsTaskId={setAnalyticsTaskId}
                            categories={categories}
                            members={teamMembers}
                            dragProvided={provided}
                            isDragging={snapshot.isDragging}
                          />
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </tbody>
                )}
              </Droppable>
            </table>
          </div>
          {filteredTasks.length === 0 && (
            <div className="text-center py-12">
              <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
              <div className="text-sm text-gray-500 mb-3">
                {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'No tasks match your filters'
                  : 'No tasks found'}
              </div>
              {(!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && selectedPriority === 'all') && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                >
                  Create your first task
                </button>
              )}
            </div>
          )}
        </div>
        </DragDropContext>
      ) : groupBy === 'milestone' ? (
        /* List View - Grouped by Milestone */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-2">
            {/* Milestone Groups */}
            {Object.entries(tasksByMilestone).map(([key, group]: [string, any]) => {
              const { milestone, tasks: milestoneTasks } = group
              const isUnassigned = key === 'unassigned' || !milestone
              const milestoneId = milestone?.id || 'unassigned'

              if (milestoneTasks.length === 0) return null

              const completedCount = milestoneTasks.filter((t: Task) => t.status === 'COMPLETED').length
              const progress = milestoneTasks.length > 0 ? Math.round((completedCount / milestoneTasks.length) * 100) : 0

              return (
                <div key={milestoneId} className="bg-white rounded-lg shadow">
                  <div
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-gray-50 border-b"
                    onClick={() => toggleCategoryCollapse(milestoneId)}
                  >
                    <div className="flex items-center space-x-3 flex-1">
                      {isCategoryCollapsed(milestoneId) ? (
                        <ChevronRight className="h-4 w-4 text-gray-400" />
                      ) : (
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      )}
                      <Target className={`h-4 w-4 ${isUnassigned ? 'text-gray-500' : 'text-blue-600'}`} />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="text-sm font-medium text-gray-900">
                            {isUnassigned ? 'Unassigned Tasks' : milestone.title}
                          </h3>
                          {!isUnassigned && milestone.status && (
                            <span className={`px-2 py-0.5 text-xs rounded-full ${
                              milestone.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                              milestone.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                              milestone.status === 'OVERDUE' ? 'bg-red-100 text-red-700' :
                              'bg-gray-100 text-gray-700'
                            }`}>
                              {milestone.status.replace('_', ' ')}
                            </span>
                          )}
                          <span className="text-xs text-gray-500">
                            ({completedCount}/{milestoneTasks.length})
                          </span>
                        </div>
                        {!isUnassigned && (
                          <div className="flex items-center gap-4 mt-1 text-xs text-gray-500">
                            <span>Progress: {progress}%</span>
                            {milestone.targetDate && (
                              <span>Due: {new Date(milestone.targetDate).toLocaleDateString()}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                    {!isUnassigned && (
                      <div className="w-24 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-blue-600 rounded-full transition-all"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    )}
                  </div>

                  {!isCategoryCollapsed(milestoneId) && (
                    <Droppable droppableId={milestoneId}>
                      {(provided) => (
                        <div
                          className="p-2 space-y-1"
                          {...provided.droppableProps}
                          ref={provided.innerRef}
                        >
                          {milestoneTasks.map((task: Task, index: number) => (
                            <Draggable key={task.id} draggableId={task.id} index={index}>
                              {(provided, snapshot) => (
                                <div
                                  ref={provided.innerRef}
                                  {...provided.draggableProps}
                                  className={`bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors cursor-pointer ${
                                    snapshot.isDragging ? 'shadow-lg bg-blue-50' : ''
                                  }`}
                                  onClick={(e) => handleTaskClick(task, e)}
                                >
                                  <div className="flex items-start justify-between">
                                    <div className="flex items-start space-x-2 flex-1">
                                      <div {...provided.dragHandleProps} className="mt-0.5">
                                        <GripVertical className="h-4 w-4 text-gray-400" />
                                      </div>
                                      <div className="flex-1">
                                        <p className="text-sm font-medium text-gray-900">{task.title}</p>
                                        {task.description && (
                                          <p className="text-xs text-gray-500 mt-1 line-clamp-1">{task.description}</p>
                                        )}
                                        <div className="flex items-center gap-2 mt-1">
                                          {task.category && (
                                            <span
                                              className="px-1.5 py-0.5 text-xs rounded"
                                              style={{ backgroundColor: `${task.category.color}20`, color: task.category.color }}
                                            >
                                              {task.category.name}
                                            </span>
                                          )}
                                          {task.assignee && (
                                            <span className="text-xs text-gray-500 flex items-center">
                                              <User className="h-3 w-3 mr-1" />
                                              {task.assignee.firstName}
                                            </span>
                                          )}
                                          {task.dueDate && (
                                            <span className="text-xs text-gray-500 flex items-center">
                                              <Calendar className="h-3 w-3 mr-1" />
                                              {new Date(task.dueDate).toLocaleDateString()}
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <select
                                        value={task.status}
                                        onChange={(e) => {
                                          e.stopPropagation()
                                          handleStatusChange(task.id, e.target.value)
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                        disabled={updateMutation.isPending}
                                        className={`px-2 py-1 text-xs rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                                          task.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                          task.status === 'IN_PROGRESS' ? 'bg-blue-100 text-blue-700' :
                                          'bg-gray-100 text-gray-700'
                                        }`}
                                      >
                                        <option value="TODO">To Do</option>
                                        <option value="IN_PROGRESS">In Progress</option>
                                        <option value="COMPLETED">Completed</option>
                                      </select>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                        </div>
                      )}
                    </Droppable>
                  )}
                </div>
              )
            })}

            {/* Empty State */}
            {Object.keys(tasksByMilestone).length === 0 && (
              <div className="bg-white rounded-lg shadow p-12 text-center">
                <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No tasks found</h3>
                <p className="text-gray-500 mb-4">
                  {milestones.length === 0
                    ? 'Create a milestone first, then add tasks to it.'
                    : 'Tasks will appear here when assigned to milestones.'}
                </p>
              </div>
            )}
          </div>
        </DragDropContext>
      ) : (
        /* List View - Original grouped by category */
        <DragDropContext onDragEnd={handleDragEnd}>
          <div className="space-y-2">
        {/* Uncategorized Tasks */}
        {tasksByCategory['uncategorized'] && tasksByCategory['uncategorized'].length > 0 && (
          <div className="bg-white rounded-lg shadow">
            <div 
              className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 border-b"
              onClick={() => toggleCategoryCollapse('uncategorized')}
            >
              <div className="flex items-center space-x-2">
                {isCategoryCollapsed('uncategorized') ? (
                  <ChevronRight className="h-4 w-4 text-gray-400" />
                ) : (
                  <ChevronDown className="h-4 w-4 text-gray-400" />
                )}
                <Folder className="h-4 w-4 text-gray-500" />
                <h3 className="text-sm font-medium text-gray-900">Uncategorized</h3>
                <span className="text-xs text-gray-500">({tasksByCategory['uncategorized'].length})</span>
              </div>
            </div>
            
            {!isCategoryCollapsed('uncategorized') && (
              <Droppable droppableId="uncategorized">
                {(provided) => (
                  <div 
                    className="p-2 space-y-1"
                    {...provided.droppableProps}
                    ref={provided.innerRef}
                  >
                    {tasksByCategory['uncategorized'].map((task: Task, index: number) => (
                      <Draggable key={task.id} draggableId={task.id} index={index}>
                        {(provided, snapshot) => (
                          <div 
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            className={`bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors cursor-pointer ${
                              snapshot.isDragging ? 'shadow-lg bg-blue-50' : ''
                            }`}
                            onClick={(e) => handleTaskClick(task, e)}
                          >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2 flex-1">
                        <div 
                          {...provided.dragHandleProps}
                          className="cursor-grab active:cursor-grabbing text-gray-400 hover:text-gray-600"
                        >
                          <GripVertical className="h-4 w-4" />
                        </div>
                        <button
                          onClick={() => handleStatusChange(task.id, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED')}
                          className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                            task.status === 'COMPLETED'
                              ? 'bg-green-500 border-green-500 text-white'
                              : 'border-gray-300 hover:border-green-500'
                          }`}
                        >
                          {task.status === 'COMPLETED' && <CheckSquare className="h-2.5 w-2.5" />}
                        </button>
                        <h4 className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                          {task.title}
                        </h4>
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
                          {task.priority}
                        </span>
                        <select
                          value={task.status}
                          onChange={(e) => {
                            e.stopPropagation()
                            handleStatusChange(task.id, e.target.value)
                          }}
                          onClick={(e) => e.stopPropagation()}
                          disabled={updateMutation.isPending}
                          className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[task.status]}`}
                        >
                          <option value="TODO">To Do</option>
                          <option value="IN_PROGRESS">In Progress</option>
                          <option value="COMPLETED">Completed</option>
                        </select>

                        {task.assignee && (
                          <span className="text-xs text-gray-500">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        )}
                        
                        {task.dueDate && (
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                            </span>
                            {(() => {
                              const dueDateInfo = getDueDateInfo(task.dueDate || null, task.status)
                              return dueDateInfo ? (
                                <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium  ${dueDateInfo.className}`}>
                                  {dueDateInfo.icon === 'AlertTriangle' && <AlertCircle className="h-3 w-3 mr-1" />}
                                  {dueDateInfo.icon === 'Calendar' && <Calendar className="h-3 w-3 mr-1" />}
                                  {dueDateInfo.icon === 'Clock' && <Clock className="h-3 w-3 mr-1" />}
                                  {dueDateInfo.label}
                                </span>
                              ) : null
                            })()}
                          </div>
                        )}
                      </div>
                      
                      <div className="flex items-center space-x-1">
                        <button
                          onClick={() => shareTask(task.id)}
                          disabled={sharingTask === task.id}
                          className="text-gray-400 hover:text-blue-600 p-1"
                          title="Share Task"
                        >
                          {sharingTask === task.id ? (
                            <div className="animate-spin h-3.5 w-3.5 border border-gray-400 border-t-transparent rounded-full" />
                          ) : (
                            <Share className="h-3.5 w-3.5" />
                          )}
                        </button>
                        
                        <button
                          onClick={() => setAnalyticsTaskId(task.id)}
                          className="text-gray-400 hover:text-purple-600 p-1"
                          title="View Analytics"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={(e) => handleDuplicateTask(task, e)}
                          className="text-gray-400 hover:text-indigo-600 p-1"
                          title="Duplicate"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={(e) => handleEditTask(task, e)}
                          className="text-gray-400 hover:text-gray-600 p-1"
                          title="Edit"
                        >
                          <Edit className="h-3.5 w-3.5" />
                        </button>
                        
                        <button
                          onClick={(e) => handleArchiveTask(task, e)}
                          className="text-gray-400 hover:text-red-600 p-1"
                          title="Delete"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            )}
          </div>
        )}

        {/* Category Tasks */}
        {categories.map((category: TaskCategory) => {
          const categoryTasks = tasksByCategory[category.id] || []
          if (categoryTasks.length === 0) return null
          
          return (
            <div key={category.id} className="bg-white rounded-lg shadow">
              <div 
                className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-50 border-b"
                onClick={() => toggleCategoryCollapse(category.id)}
              >
                <div className="flex items-center space-x-2">
                  {isCategoryCollapsed(category.id) ? (
                    <ChevronRight className="h-4 w-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  )}
                  <div 
                    className="w-4 h-4 rounded"
                    style={{ backgroundColor: category.color }}
                  />
                  <h3 className="text-sm font-medium text-gray-900">{category.name}</h3>
                  <span className="text-xs text-gray-500">({categoryTasks.length})</span>
                </div>
              </div>
              
              {!isCategoryCollapsed(category.id) && (
                <div className="p-2 space-y-1">
                  {categoryTasks.map((task: Task) => (
                    <div 
                      key={task.id} 
                      className="bg-gray-50 rounded p-2 hover:bg-gray-100 transition-colors cursor-pointer"
                      onClick={(e) => handleTaskClick(task, e)}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2 flex-1">
                          <button
                            onClick={() => handleStatusChange(task.id, task.status === 'COMPLETED' ? 'TODO' : 'COMPLETED')}
                            className={`w-4 h-4 rounded border-2 flex items-center justify-center ${
                              task.status === 'COMPLETED'
                                ? 'bg-green-500 border-green-500 text-white'
                                : 'border-gray-300 hover:border-green-500'
                            }`}
                          >
                            {task.status === 'COMPLETED' && <CheckSquare className="h-2.5 w-2.5" />}
                          </button>
                          <h4 className={`text-sm font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                            {task.title}
                          </h4>
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${priorityColors[task.priority]}`}>
                            {task.priority}
                          </span>
                          <select
                            value={task.status}
                            onChange={(e) => {
                              e.stopPropagation()
                              handleStatusChange(task.id, e.target.value)
                            }}
                            onClick={(e) => e.stopPropagation()}
                            disabled={updateMutation.isPending}
                            className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full border-0 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500 ${statusColors[task.status]}`}
                          >
                            <option value="TODO">To Do</option>
                            <option value="IN_PROGRESS">In Progress</option>
                            <option value="COMPLETED">Completed</option>
                          </select>

                          {task.assignee && (
                            <span className="text-xs text-gray-500">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </span>
                          )}
                          
                          {task.dueDate && (
                            <div className="flex items-center space-x-2">
                              <span className="text-xs text-gray-500 flex items-center">
                                <Calendar className="h-3 w-3 mr-1" />
                                {new Date(task.dueDate).toLocaleDateString()}
                              </span>
                              {(() => {
                                const dueDateInfo = getDueDateInfo(task.dueDate || null, task.status)
                                return dueDateInfo ? (
                                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium  ${dueDateInfo.className}`}>
                                    {dueDateInfo.icon === 'AlertTriangle' && <AlertCircle className="h-3 w-3 mr-1" />}
                                    {dueDateInfo.icon === 'Calendar' && <Calendar className="h-3 w-3 mr-1" />}
                                    {dueDateInfo.icon === 'Clock' && <Clock className="h-3 w-3 mr-1" />}
                                    {dueDateInfo.label}
                                  </span>
                                ) : null
                              })()}
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => shareTask(task.id)}
                            disabled={sharingTask === task.id}
                            className="text-gray-400 hover:text-blue-600 p-1"
                            title="Share Task"
                          >
                            {sharingTask === task.id ? (
                              <div className="animate-spin h-3.5 w-3.5 border border-gray-400 border-t-transparent rounded-full" />
                            ) : (
                              <Share className="h-3.5 w-3.5" />
                            )}
                          </button>
                          
                          <button
                            onClick={() => setAnalyticsTaskId(task.id)}
                            className="text-gray-400 hover:text-purple-600 p-1"
                            title="View Analytics"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => handleDuplicateTask(task, e)}
                            className="text-gray-400 hover:text-indigo-600 p-1"
                            title="Duplicate"
                          >
                            <Copy className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => handleEditTask(task, e)}
                            className="text-gray-400 hover:text-gray-600 p-1"
                            title="Edit"
                          >
                            <Edit className="h-3.5 w-3.5" />
                          </button>
                          
                          <button
                            onClick={(e) => handleArchiveTask(task, e)}
                            className="text-gray-400 hover:text-red-600 p-1"
                            title="Archive"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}

        {filteredTasks.length === 0 && (
          <div className="text-center py-8 bg-white rounded-lg shadow">
            <CheckSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-3">
              {searchTerm || selectedCategory !== 'all' || selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'No tasks match your filters'
                : 'No tasks found'}
            </div>
            {(!searchTerm && selectedCategory === 'all' && selectedStatus === 'all' && selectedPriority === 'all') && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
              >
                Create your first task
              </button>
            )}
          </div>
        )}
      </div>
      </DragDropContext>
      )}

      {/* This empty state moved into each view type for better layout */}

      {/* Add Task Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsAddModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Create New Task
                  </h3>
                  
                  <Formik
                    initialValues={{
                      title: '',
                      description: '',
                      priority: 'MEDIUM',
                      dueDate: '',
                      categoryId: '',
                      milestoneId: '',
                      assigneeId: '',
                      dependencyIds: []
                    }}
                    validationSchema={taskSchema}
                    onSubmit={(values) => createMutation.mutate(values)}
                  >
                    {({ isSubmitting, values, setFieldValue }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Task Title *
                          </label>
                          <Field
                            id="title"
                            name="title"
                            type="text"
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Install electrical wiring"
                          />
                          <ErrorMessage name="title" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <Field
                            as="textarea"
                            id="description"
                            name="description"
                            rows={3}
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Task details and requirements..."
                          />
                          <ErrorMessage name="description" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                              Priority *
                            </label>
                            <Field
                              as="select"
                              id="priority"
                              name="priority"
                              className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </Field>
                            <ErrorMessage name="priority" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                              Due Date
                            </label>
                            <DatePicker
                              value={values.dueDate}
                              onChange={(date) => setFieldValue('dueDate', date)}
                              placeholder="Select due date"
                            />
                            <ErrorMessage name="dueDate" component="p" className=" text-sm text-red-600" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                            Category
                          </label>
                          <div className="flex gap-2">
                            <Field
                              as="select"
                              id="categoryId"
                              name="categoryId"
                              className="flex-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Uncategorized</option>
                              {Array.isArray(categories) ? categories.map((category: TaskCategory) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              )) : []}
                            </Field>
                            <button
                              type="button"
                              onClick={() => setIsAddCategoryModalOpen(true)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              title="Add new category"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <ErrorMessage name="categoryId" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="milestoneId" className="block text-sm font-medium text-gray-700">
                            <div className="flex items-center gap-2">
                              <Target className="h-4 w-4 text-gray-400" />
                              <span>Milestone</span>
                            </div>
                          </label>
                          <div className="flex gap-2">
                            <Field
                              as="select"
                              id="milestoneId"
                              name="milestoneId"
                              className="flex-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">No milestone</option>
                              {Array.isArray(milestones) ? milestones.map((milestone: any) => (
                                <option key={milestone.id} value={milestone.id}>
                                  {milestone.title}
                                </option>
                              )) : []}
                            </Field>
                            <button
                              type="button"
                              onClick={() => setIsAddMilestoneModalOpen(true)}
                              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              title="Add new milestone"
                            >
                              <Plus className="h-4 w-4" />
                            </button>
                          </div>
                          <ErrorMessage name="milestoneId" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
                            Assign To
                          </label>
                          <Field
                            as="select"
                            id="assigneeId"
                            name="assigneeId"
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">Unassigned</option>
                            {Array.isArray(teamMembers) ? teamMembers.map((member: any) => (
                              <option key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                              </option>
                            )) : []}
                          </Field>
                          <ErrorMessage name="assigneeId" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            <div className="flex items-center gap-2">
                              <GitBranch className="h-4 w-4 text-gray-400" />
                              Task Dependencies
                            </div>
                          </label>
                          <Field name="dependencyIds">
                            {({ field, form }: any) => {
                              const [depSearch, setDepSearch] = useState('')
                              const [showDepDropdown, setShowDepDropdown] = useState(false)

                              const availableTasks = tasks.filter((task: Task) => {
                                return task.status !== 'COMPLETED'
                              })

                              const filteredTasks = availableTasks.filter((task: Task) =>
                                task.title.toLowerCase().includes(depSearch.toLowerCase())
                              )

                              const selectedDeps = field.value || []
                              const selectedTasks = availableTasks.filter((t: Task) => selectedDeps.includes(t.id))

                              const toggleDependency = (taskId: string) => {
                                const current = field.value || []
                                if (current.includes(taskId)) {
                                  form.setFieldValue('dependencyIds', current.filter((id: string) => id !== taskId))
                                } else {
                                  form.setFieldValue('dependencyIds', [...current, taskId])
                                }
                              }

                              const getStatusConfig = (status: string) => {
                                switch (status) {
                                  case 'TODO': return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
                                  case 'IN_PROGRESS': return { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' }
                                  case 'REVIEW': return { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' }
                                  case 'BLOCKED': return { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' }
                                  default: return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
                                }
                              }

                              return (
                                <div className="space-y-3">
                                  {/* Selected Dependencies */}
                                  {selectedTasks.length > 0 && (
                                    <div className="space-y-2">
                                      <p className="text-xs text-gray-500">This task depends on:</p>
                                      <div className="flex flex-wrap gap-2">
                                        {selectedTasks.map((task: Task) => {
                                          const config = getStatusConfig(task.status)
                                          return (
                                            <div
                                              key={task.id}
                                              className="group flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                                            >
                                              <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                                              <span className="text-primary-700 font-medium truncate max-w-[150px]">
                                                {task.title}
                                              </span>
                                              <button
                                                type="button"
                                                onClick={() => toggleDependency(task.id)}
                                                className="p-0.5 rounded hover:bg-primary-200 text-primary-400 hover:text-primary-600 transition-colors"
                                              >
                                                <X className="h-3.5 w-3.5" />
                                              </button>
                                            </div>
                                          )
                                        })}
                                      </div>
                                    </div>
                                  )}

                                  {/* Search & Select */}
                                  <div className="relative">
                                    <div className="relative">
                                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                      <input
                                        type="text"
                                        placeholder="Search tasks to add as dependency..."
                                        value={depSearch}
                                        onChange={(e) => setDepSearch(e.target.value)}
                                        onFocus={() => setShowDepDropdown(true)}
                                        className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                      />
                                    </div>

                                    {showDepDropdown && (
                                      <>
                                        <div
                                          className="fixed inset-0 z-10"
                                          onClick={() => setShowDepDropdown(false)}
                                        />
                                        <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                                          {filteredTasks.length === 0 ? (
                                            <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                              {depSearch ? 'No matching tasks found' : 'No available tasks'}
                                            </div>
                                          ) : (
                                            filteredTasks.map((task: Task) => {
                                              const isSelected = selectedDeps.includes(task.id)
                                              const config = getStatusConfig(task.status)
                                              return (
                                                <button
                                                  key={task.id}
                                                  type="button"
                                                  onClick={() => toggleDependency(task.id)}
                                                  className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                                    isSelected ? 'bg-primary-50' : ''
                                                  }`}
                                                >
                                                  <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                    isSelected
                                                      ? 'bg-primary-500 border-primary-500'
                                                      : 'border-gray-300'
                                                  }`}>
                                                    {isSelected && <Check className="h-3 w-3 text-white" />}
                                                  </div>
                                                  <div className="flex-1 min-w-0">
                                                    <p className="text-sm font-medium text-gray-900 truncate">
                                                      {task.title}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-0.5">
                                                      <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                                                        <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                        {task.status.replace('_', ' ')}
                                                      </span>
                                                      {task.assignee && (
                                                        <span className="text-xs text-gray-400">
                                                          {task.assignee.firstName}
                                                        </span>
                                                      )}
                                                    </div>
                                                  </div>
                                                </button>
                                              )
                                            })
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>

                                  <p className="text-xs text-gray-500 flex items-center gap-1">
                                    <Link2 className="h-3 w-3" />
                                    Dependencies must be completed before this task can start
                                  </p>
                                </div>
                              )
                            }}
                          </Field>
                          <ErrorMessage name="dependencyIds" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || createMutation.isPending}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {createMutation.isPending ? 'Creating...' : 'Create Task'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Category Modal */}
      {isAddCategoryModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddCategoryModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsAddCategoryModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Create New Category
                  </h3>
                  
                  <Formik
                    initialValues={{
                      name: '',
                      description: '',
                      color: '#6366f1'
                    }}
                    validationSchema={categorySchema}
                    onSubmit={(values) => createCategoryMutation.mutate(values)}
                  >
                    {({ isSubmitting }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                            Category Name *
                          </label>
                          <Field
                            id="name"
                            name="name"
                            type="text"
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Foundation, Electrical, Plumbing"
                          />
                          <ErrorMessage name="name" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <Field
                            as="textarea"
                            id="description"
                            name="description"
                            rows={3}
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Optional description for this category..."
                          />
                          <ErrorMessage name="description" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <div className=" flex items-center space-x-3">
                            <Field
                              id="color"
                              name="color"
                              type="color"
                              className="h-10 w-16 rounded-md border border-gray-300 cursor-pointer"
                            />
                            <span className="text-sm text-gray-500">Choose a color to identify this category</span>
                          </div>
                          <ErrorMessage name="color" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsAddCategoryModalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || createCategoryMutation.isPending}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {createCategoryMutation.isPending ? 'Creating...' : 'Create Category'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Milestone Modal */}
      {isAddMilestoneModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsAddMilestoneModalOpen(false)} />

            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-md sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsAddMilestoneModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="sm:flex sm:items-start">
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-6">
                    Create New Milestone
                  </h3>

                  <Formik
                    initialValues={{
                      title: '',
                      description: '',
                      targetDate: '',
                      amount: ''
                    }}
                    validationSchema={milestoneSchema}
                    onSubmit={(values) => createMilestoneMutation.mutate({
                      ...values,
                      amount: values.amount ? parseFloat(values.amount) : null,
                      targetDate: values.targetDate || null
                    })}
                  >
                    {({ isSubmitting, values, setFieldValue }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Milestone Title *
                          </label>
                          <Field
                            id="title"
                            name="title"
                            type="text"
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Foundation Complete, Framing Done"
                          />
                          <ErrorMessage name="title" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                            Description
                          </label>
                          <Field
                            as="textarea"
                            id="description"
                            name="description"
                            rows={3}
                            className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Optional description for this milestone..."
                          />
                          <ErrorMessage name="description" component="p" className=" text-sm text-red-600" />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label htmlFor="targetDate" className="block text-sm font-medium text-gray-700">
                              Target Date
                            </label>
                            <DatePicker
                              value={values.targetDate}
                              onChange={(date) => setFieldValue('targetDate', date)}
                              placeholder="Select target date"
                            />
                            <ErrorMessage name="targetDate" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="amount" className="block text-sm font-medium text-gray-700">
                              Amount
                            </label>
                            <Field
                              id="amount"
                              name="amount"
                              type="number"
                              step="0.01"
                              className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="0.00"
                            />
                            <ErrorMessage name="amount" component="p" className=" text-sm text-red-600" />
                          </div>
                        </div>

                        <div className="flex justify-end space-x-3 pt-4">
                          <button
                            type="button"
                            onClick={() => setIsAddMilestoneModalOpen(false)}
                            className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                          >
                            Cancel
                          </button>
                          <button
                            type="submit"
                            disabled={isSubmitting || createMilestoneMutation.isPending}
                            className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                          >
                            {createMilestoneMutation.isPending ? 'Creating...' : 'Create Milestone'}
                          </button>
                        </div>
                      </Form>
                    )}
                  </Formik>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Share Task Modal */}
      {showShareModal && shareUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowShareModal(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setShowShareModal(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Share className="h-6 w-6 text-blue-600" />
                </div>
                <div className="mt-3 text-center sm:ml-4 sm:mt-0 sm:text-left w-full">
                  <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                    Share Task
                  </h3>
                  
                  <div className="mb-4">
                    <p className="text-sm text-gray-600 mb-3">
                      Anyone with this link can view and update the task status. All interactions will be tracked.
                    </p>
                    
                    <div className="flex items-center space-x-2 p-3 bg-gray-50 rounded-md">
                      <input
                        type="text"
                        value={shareUrl}
                        readOnly
                        className="flex-1 text-sm bg-transparent border-none outline-none text-gray-700"
                      />
                      <button
                        onClick={copyShareUrl}
                        className="flex-shrink-0 text-blue-600 hover:text-blue-700 p-1"
                        title="Copy Link"
                      >
                        <Copy className="h-4 w-4" />
                      </button>
                      <a
                        href={shareUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 text-blue-600 hover:text-blue-700 p-1"
                        title="Open Link"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </a>
                    </div>
                  </div>

                  <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3 mb-4">
                    <div className="flex">
                      <AlertCircle className="h-5 w-5 text-yellow-400" />
                      <div className="ml-3">
                        <h4 className="text-sm font-medium text-yellow-800">
                          Security Note
                        </h4>
                        <p className="text-sm text-yellow-700 ">
                          This link allows anyone to view task details and update its status. Share only with trusted individuals.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => setShowShareModal(false)}
                      className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                    >
                      Close
                    </button>
                    <button
                      onClick={copyShareUrl}
                      className="inline-flex items-center rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                    >
                      <Copy className="h-4 w-4 mr-2" />
                      Copy Link
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Analytics Modal */}
      {analyticsTaskId && (
        <TaskAnalytics 
          taskId={analyticsTaskId} 
          onClose={() => setAnalyticsTaskId(null)} 
        />
      )}

      {/* Edit Task Modal with Comments */}
      {isEditModalOpen && selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4 text-center sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditModalOpen(false)} />
            
            <div className="relative transform rounded-lg bg-white px-4 pb-4 pt-5 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-4xl sm:p-6">
              <div className="absolute right-0 top-0 pr-4 pt-4">
                <button
                  type="button"
                  className="rounded-md bg-white text-gray-400 hover:text-gray-500"
                  onClick={() => setIsEditModalOpen(false)}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <h3 className="text-lg font-medium leading-6 text-gray-900 mb-4">
                  {selectedTask.title}
                </h3>
                
                {/* Tab Navigation */}
                <div className="border-b border-gray-200">
                  <nav className="-mb-px flex space-x-8">
                    <button
                      onClick={() => setEditModalTab('details')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        editModalTab === 'details'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Details
                    </button>
                    <button
                      onClick={() => setEditModalTab('comments')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        editModalTab === 'comments'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <span>Comments</span>
                      <span className="bg-gray-200 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                        {/* We'll add comment count here later */}
                        0
                      </span>
                    </button>
                    <button
                      onClick={() => setEditModalTab('internal')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm ${
                        editModalTab === 'internal'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      Internal
                    </button>
                    <button
                      onClick={() => setEditModalTab('attachments')}
                      className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                        editModalTab === 'attachments'
                          ? 'border-primary-500 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Paperclip className="h-4 w-4" />
                      <span>Attachments</span>
                    </button>
                  </nav>
                </div>
                
                {/* Tab Content */}
                <div className="mt-4">
                  {editModalTab === 'details' ? (
                    <Formik
                      initialValues={{
                        title: selectedTask.title || '',
                        description: selectedTask.description || '',
                        priority: selectedTask.priority || 'MEDIUM',
                        dueDate: selectedTask.dueDate ? new Date(selectedTask.dueDate).toISOString().split('T')[0] : '',
                        categoryId: selectedTask.category?.id || '',
                        milestoneId: selectedTask.milestone?.id || '',
                        assigneeId: selectedTask.assignee?.id || '',
                        vendorId: selectedTask.vendor?.id || '',
                        dependencyIds: selectedTask.dependsOn?.map(d => d.id) || []
                      }}
                      validationSchema={taskSchema}
                      onSubmit={(values) => updateMutation.mutate({ taskId: selectedTask.id, data: values })}
                    >
                      {({ isSubmitting, values, setFieldValue }) => (
                        <Form className="space-y-4">
                          <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                              Task Title *
                            </label>
                            <Field
                              id="title"
                              name="title"
                              type="text"
                              className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Enter task title..."
                            />
                            <ErrorMessage name="title" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                              Description
                            </label>
                            <Field
                              as="textarea"
                              id="description"
                              name="description"
                              rows={3}
                              className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Optional task description..."
                            />
                            <ErrorMessage name="description" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label htmlFor="priority" className="block text-sm font-medium text-gray-700">
                                Priority *
                              </label>
                              <Field
                                as="select"
                                id="priority"
                                name="priority"
                                className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </Field>
                              <ErrorMessage name="priority" component="p" className=" text-sm text-red-600" />
                            </div>

                            <div>
                              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                                Due Date
                              </label>
                              <DatePicker
                                value={values.dueDate}
                                onChange={(date) => setFieldValue('dueDate', date)}
                                placeholder="Select due date"
                              />
                              <ErrorMessage name="dueDate" component="p" className=" text-sm text-red-600" />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                              Category
                            </label>
                            <div className="flex gap-2">
                              <Field
                                as="select"
                                id="categoryId"
                                name="categoryId"
                                className="flex-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="">Select Category (Optional)</option>
                                {(categories || []).map((category: TaskCategory) => (
                                  <option key={category.id} value={category.id}>
                                    {category.name}
                                  </option>
                                ))}
                              </Field>
                              <button
                                type="button"
                                onClick={() => setIsAddCategoryModalOpen(true)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Add new category"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <ErrorMessage name="categoryId" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="milestoneId" className="block text-sm font-medium text-gray-700">
                              <div className="flex items-center gap-2">
                                <Target className="h-4 w-4 text-gray-400" />
                                <span>Milestone</span>
                              </div>
                            </label>
                            <div className="flex gap-2 mt-1">
                              <Field
                                as="select"
                                id="milestoneId"
                                name="milestoneId"
                                className="flex-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="">No milestone</option>
                                {(milestones || []).map((milestone: any) => (
                                  <option key={milestone.id} value={milestone.id}>
                                    {milestone.title}
                                  </option>
                                ))}
                              </Field>
                              <button
                                type="button"
                                onClick={() => setIsAddMilestoneModalOpen(true)}
                                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500"
                                title="Add new milestone"
                              >
                                <Plus className="h-4 w-4" />
                              </button>
                            </div>
                            <ErrorMessage name="milestoneId" component="p" className="text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
                              Assign To
                            </label>
                            <Field
                              as="select"
                              id="assigneeId"
                              name="assigneeId"
                              className=" block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Unassigned</option>
                              {Array.isArray(teamMembers) ? teamMembers.map((user: any) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName}
                                </option>
                              )) : []}
                            </Field>
                            <ErrorMessage name="assigneeId" component="p" className=" text-sm text-red-600" />
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-4 w-4 text-gray-400" />
                                Task Dependencies
                              </div>
                            </label>
                            <Field name="dependencyIds">
                              {({ field, form }: any) => {
                                const [depSearchEdit, setDepSearchEdit] = useState('')
                                const [showDepDropdownEdit, setShowDepDropdownEdit] = useState(false)

                                const availableTasks = tasks.filter((task: Task) => {
                                  return task.id !== selectedTask.id && task.status !== 'COMPLETED'
                                })

                                const filteredTasks = availableTasks.filter((task: Task) =>
                                  task.title.toLowerCase().includes(depSearchEdit.toLowerCase())
                                )

                                const selectedDeps = field.value || []
                                const selectedTasks = availableTasks.filter((t: Task) => selectedDeps.includes(t.id))

                                const toggleDependency = (taskId: string) => {
                                  const current = field.value || []
                                  if (current.includes(taskId)) {
                                    form.setFieldValue('dependencyIds', current.filter((id: string) => id !== taskId))
                                  } else {
                                    form.setFieldValue('dependencyIds', [...current, taskId])
                                  }
                                }

                                const getStatusConfig = (status: string) => {
                                  switch (status) {
                                    case 'TODO': return { bg: 'bg-slate-100', text: 'text-slate-600', dot: 'bg-slate-400' }
                                    case 'IN_PROGRESS': return { bg: 'bg-blue-100', text: 'text-blue-600', dot: 'bg-blue-500' }
                                    case 'REVIEW': return { bg: 'bg-purple-100', text: 'text-purple-600', dot: 'bg-purple-500' }
                                    case 'BLOCKED': return { bg: 'bg-red-100', text: 'text-red-600', dot: 'bg-red-500' }
                                    default: return { bg: 'bg-gray-100', text: 'text-gray-600', dot: 'bg-gray-400' }
                                  }
                                }

                                return (
                                  <div className="space-y-3">
                                    {/* Selected Dependencies */}
                                    {selectedTasks.length > 0 && (
                                      <div className="space-y-2">
                                        <p className="text-xs text-gray-500">This task depends on:</p>
                                        <div className="flex flex-wrap gap-2">
                                          {selectedTasks.map((task: Task) => {
                                            const config = getStatusConfig(task.status)
                                            return (
                                              <div
                                                key={task.id}
                                                className="group flex items-center gap-2 px-3 py-1.5 bg-primary-50 border border-primary-200 rounded-lg text-sm"
                                              >
                                                <div className={`w-2 h-2 rounded-full ${config.dot}`} />
                                                <span className="text-primary-700 font-medium truncate max-w-[150px]">
                                                  {task.title}
                                                </span>
                                                <button
                                                  type="button"
                                                  onClick={() => toggleDependency(task.id)}
                                                  className="p-0.5 rounded hover:bg-primary-200 text-primary-400 hover:text-primary-600 transition-colors"
                                                >
                                                  <X className="h-3.5 w-3.5" />
                                                </button>
                                              </div>
                                            )
                                          })}
                                        </div>
                                      </div>
                                    )}

                                    {/* Search & Select */}
                                    <div className="relative">
                                      <div className="relative">
                                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                                        <input
                                          type="text"
                                          placeholder="Search tasks to add as dependency..."
                                          value={depSearchEdit}
                                          onChange={(e) => setDepSearchEdit(e.target.value)}
                                          onFocus={() => setShowDepDropdownEdit(true)}
                                          className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                                        />
                                      </div>

                                      {showDepDropdownEdit && (
                                        <>
                                          <div
                                            className="fixed inset-0 z-10"
                                            onClick={() => setShowDepDropdownEdit(false)}
                                          />
                                          <div className="absolute z-20 mt-1 w-full bg-white rounded-lg shadow-lg border border-gray-200 max-h-48 overflow-y-auto">
                                            {filteredTasks.length === 0 ? (
                                              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                                                {depSearchEdit ? 'No matching tasks found' : 'No available tasks'}
                                              </div>
                                            ) : (
                                              filteredTasks.map((task: Task) => {
                                                const isSelected = selectedDeps.includes(task.id)
                                                const config = getStatusConfig(task.status)
                                                return (
                                                  <button
                                                    key={task.id}
                                                    type="button"
                                                    onClick={() => toggleDependency(task.id)}
                                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left hover:bg-gray-50 transition-colors ${
                                                      isSelected ? 'bg-primary-50' : ''
                                                    }`}
                                                  >
                                                    <div className={`w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0 ${
                                                      isSelected
                                                        ? 'bg-primary-500 border-primary-500'
                                                        : 'border-gray-300'
                                                    }`}>
                                                      {isSelected && <Check className="h-3 w-3 text-white" />}
                                                    </div>
                                                    <div className="flex-1 min-w-0">
                                                      <p className="text-sm font-medium text-gray-900 truncate">
                                                        {task.title}
                                                      </p>
                                                      <div className="flex items-center gap-2 mt-0.5">
                                                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium ${config.bg} ${config.text}`}>
                                                          <span className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
                                                          {task.status.replace('_', ' ')}
                                                        </span>
                                                        {task.assignee && (
                                                          <span className="text-xs text-gray-400">
                                                            {task.assignee.firstName}
                                                          </span>
                                                        )}
                                                      </div>
                                                    </div>
                                                  </button>
                                                )
                                              })
                                            )}
                                          </div>
                                        </>
                                      )}
                                    </div>

                                    <p className="text-xs text-gray-500 flex items-center gap-1">
                                      <Link2 className="h-3 w-3" />
                                      Dependencies must be completed before this task can start
                                    </p>
                                  </div>
                                )
                              }}
                            </Field>
                            <ErrorMessage name="dependencyIds" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div className="flex justify-end space-x-3 pt-4">
                            <button
                              type="button"
                              onClick={() => setIsEditModalOpen(false)}
                              className="rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
                            >
                              Cancel
                            </button>
                            <button
                              type="submit"
                              disabled={isSubmitting || updateMutation.isPending}
                              className="inline-flex items-center rounded-md bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
                            >
                              {updateMutation.isPending ? 'Updating...' : 'Update Task'}
                            </button>
                          </div>
                        </Form>
                      )}
                    </Formik>
                  ) : editModalTab === 'comments' ? (
                    <TaskComments taskId={selectedTask.id} projectId={projectId} />
                  ) : editModalTab === 'attachments' ? (
                    <TaskAttachments
                      taskId={selectedTask.id}
                      attachments={selectedTask.attachments || []}
                      onUpdate={() => {
                        // Refetch task data to get updated attachments
                        queryClient.invalidateQueries({ queryKey: ['project-timeline', projectId] })
                      }}
                    />
                  ) : (
                    <div className="space-y-6">
                      {/* Completion Approval Alert */}
                      {selectedTask.completionPendingApproval && (
                        <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                          <div className="flex items-start gap-3">
                            <AlertTriangle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                              <h4 className="text-sm font-semibold text-amber-800">
                                Completion Approval Required
                              </h4>
                              <p className="text-sm text-amber-700 mt-1">
                                The vendor has marked this task as complete. Please review and approve or reject the completion.
                              </p>
                              {selectedTask.completionRequestedAt && (
                                <p className="text-xs text-amber-600 mt-2">
                                  Requested on {new Date(selectedTask.completionRequestedAt).toLocaleDateString()} at {new Date(selectedTask.completionRequestedAt).toLocaleTimeString()}
                                </p>
                              )}
                              <div className="flex gap-2 mt-3">
                                <button
                                  onClick={() => approvalMutation.mutate({ taskId: selectedTask.id, action: 'approve' })}
                                  disabled={approvalMutation.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-green-600 text-white text-sm font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                                >
                                  <CheckCircle className="h-4 w-4" />
                                  {approvalMutation.isPending ? 'Processing...' : 'Approve Completion'}
                                </button>
                                <button
                                  onClick={() => approvalMutation.mutate({ taskId: selectedTask.id, action: 'reject' })}
                                  disabled={approvalMutation.isPending}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                                >
                                  <XCircle className="h-4 w-4" />
                                  {approvalMutation.isPending ? 'Processing...' : 'Reject'}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* Budget Information */}
                      <div className="bg-gray-50 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3 flex items-center gap-2">
                          <DollarSign className="h-4 w-4" />
                          Budget Information
                        </h4>
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Budget Amount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">{currencySymbol}</span>
                              <input
                                type="number"
                                key={`budget-${selectedTask.id}-${selectedTask.budgetAmount}`}
                                defaultValue={selectedTask.budgetAmount || ''}
                                onBlur={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : null
                                  if (value !== selectedTask.budgetAmount) {
                                    internalUpdateMutation.mutate({
                                      taskId: selectedTask.id,
                                      data: { budgetAmount: value }
                                    })
                                  }
                                }}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">Approved Amount</label>
                            <div className="relative">
                              <span className="absolute left-3 top-2 text-gray-500">{currencySymbol}</span>
                              <input
                                type="number"
                                key={`approved-${selectedTask.id}-${selectedTask.approvedAmount}`}
                                defaultValue={selectedTask.approvedAmount || ''}
                                onBlur={(e) => {
                                  const value = e.target.value ? parseFloat(e.target.value) : null
                                  if (value !== selectedTask.approvedAmount) {
                                    internalUpdateMutation.mutate({
                                      taskId: selectedTask.id,
                                      data: { approvedAmount: value }
                                    })
                                  }
                                }}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full border border-gray-300 rounded-md pl-7 pr-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-500"
                              />
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-gray-500 mt-2">
                          Changes are saved automatically when you click outside the field.
                        </p>
                      </div>

                      {/* Summary with Cost Variance */}
                      <div className="bg-white border border-gray-200 rounded-lg p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-3">Summary</h4>
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div>
                            <span className="text-gray-500">Budget:</span>
                            <span className="ml-2 font-medium">
                              {selectedTask.budgetAmount ? formatCurrency(selectedTask.budgetAmount) : 'Not set'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Approved:</span>
                            <span className="ml-2 font-medium">
                              {selectedTask.approvedAmount ? formatCurrency(selectedTask.approvedAmount) : 'Not set'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Vendor:</span>
                            <span className="ml-2 font-medium">
                              {selectedTask.vendor ? selectedTask.vendor.name : 'Not assigned'}
                            </span>
                          </div>
                          <div>
                            <span className="text-gray-500">Cost Variance:</span>
                            {selectedTask.budgetAmount && selectedTask.approvedAmount ? (
                              <span className={`ml-2 font-medium ${
                                selectedTask.budgetAmount - selectedTask.approvedAmount >= 0
                                  ? 'text-green-600'
                                  : 'text-red-600'
                              }`}>
                                {selectedTask.budgetAmount - selectedTask.approvedAmount >= 0 ? '+' : ''}
                                {formatCurrency(Math.abs(selectedTask.budgetAmount - selectedTask.approvedAmount))}
                              </span>
                            ) : (
                              <span className="ml-2 font-medium text-gray-400">N/A</span>
                            )}
                          </div>
                        </div>
                        {selectedTask.budgetAmount && selectedTask.approvedAmount && (
                          <div className="mt-3 pt-3 border-t border-gray-100">
                            <p className={`text-xs ${
                              selectedTask.budgetAmount - selectedTask.approvedAmount >= 0
                                ? 'text-green-600'
                                : 'text-red-600'
                            }`}>
                              {selectedTask.budgetAmount - selectedTask.approvedAmount >= 0
                                ? `Under budget by ${formatCurrency(selectedTask.budgetAmount - selectedTask.approvedAmount)}`
                                : `Over budget by ${formatCurrency(Math.abs(selectedTask.budgetAmount - selectedTask.approvedAmount))}`
                              }
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}