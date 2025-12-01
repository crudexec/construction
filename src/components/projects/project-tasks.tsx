'use client'

import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Formik, Form, Field, ErrorMessage } from 'formik'
import * as Yup from 'yup'
import { 
  Plus, 
  Calendar,
  User,
  CheckSquare,
  Clock,
  AlertCircle,
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
  Eye
} from 'lucide-react'
import toast from 'react-hot-toast'
import { TaskAnalytics } from '@/components/admin/task-analytics'
import { CompactFilters } from '@/components/ui/compact-filters'
import { useModal } from '@/components/ui/modal-provider'
import { TaskComments } from '@/components/projects/task-comments'

interface ProjectTasksProps {
  projectId: string
  shouldOpenAddModal?: boolean
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
  createdAt: string
}

const taskSchema = Yup.object().shape({
  title: Yup.string().required('Task title is required'),
  description: Yup.string(),
  priority: Yup.string().required('Priority is required'),
  dueDate: Yup.date(),
  categoryId: Yup.string(),
  assigneeId: Yup.string()
})

const categorySchema = Yup.object().shape({
  name: Yup.string().required('Category name is required'),
  description: Yup.string(),
  color: Yup.string().required('Color is required')
})

async function fetchProjectTasks(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/tasks`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch tasks')
  return response.json()
}

async function createTask(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/tasks`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create task')
  return response.json()
}

async function updateTask(taskId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/task/${taskId}`, {
    method: 'PATCH',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to update task')
  return response.json()
}

async function deleteTask(taskId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/task/${taskId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete task')
  return response.json()
}

async function fetchProjectCategories(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/categories`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch categories')
  return response.json()
}

async function createCategory(projectId: string, data: any) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/categories`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create category')
  return response.json()
}

async function deleteCategory(categoryId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/category/${categoryId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to delete category')
  return response.json()
}

async function fetchTeamMembers() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch team members')
  return response.json()
}

async function fetchProjectTeamMembers(projectId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${projectId}/team`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
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

export function ProjectTasks({ projectId, shouldOpenAddModal }: ProjectTasksProps) {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isAddCategoryModalOpen, setIsAddCategoryModalOpen] = useState(false)
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set())
  const [sharingTask, setSharingTask] = useState<string | null>(null)
  const [shareUrl, setShareUrl] = useState<string | null>(null)
  const [showShareModal, setShowShareModal] = useState(false)
  const [analyticsTaskId, setAnalyticsTaskId] = useState<string | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [selectedTask, setSelectedTask] = useState<Task | null>(null)
  const [editModalTab, setEditModalTab] = useState<'details' | 'comments'>('details')
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()

  // Open modal when shouldOpenAddModal prop is true
  useEffect(() => {
    if (shouldOpenAddModal) {
      setIsAddModalOpen(true)
    }
  }, [shouldOpenAddModal])

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['project-tasks', projectId],
    queryFn: () => fetchProjectTasks(projectId),
    enabled: !!projectId
  })

  const { data: categories = [] } = useQuery({
    queryKey: ['project-categories', projectId],
    queryFn: () => fetchProjectCategories(projectId),
    enabled: !!projectId
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['project-team', projectId],
    queryFn: () => fetchProjectTeamMembers(projectId),
    enabled: !!projectId
  })

  const createMutation = useMutation({
    mutationFn: (data: any) => createTask(projectId, data),
    onSuccess: () => {
      toast.success('Task created successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsAddModalOpen(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to create task')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ taskId, data }: { taskId: string, data: any }) => updateTask(taskId, data),
    onSuccess: () => {
      toast.success('Task updated successfully!')
      queryClient.invalidateQueries({ queryKey: ['project-tasks', projectId] })
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      setIsEditModalOpen(false)
      setSelectedTask(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update task')
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

  const handleStatusChange = (taskId: string, newStatus: string) => {
    const updateData = { 
      status: newStatus,
      ...(newStatus === 'COMPLETED' ? { completedAt: new Date() } : {})
    }
    updateMutation.mutate({ taskId, data: updateData })
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
        headers: {
          'Authorization': `Bearer ${document.cookie.split('; ').find(row => row.startsWith('auth-token='))?.split('=')[1]}`,
          'Cookie': document.cookie
        }
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
            <h3 className="text-lg font-medium text-gray-900">Tasks</h3>
            <div className="flex space-x-2">
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

      {/* Tasks List - Grouped by Category */}
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
              <div className="p-2 space-y-1">
                {tasksByCategory['uncategorized'].map((task: Task) => (
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
                        <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                          {task.status.replace(/_/g, ' ')}
                        </span>
                        
                        {task.assignee && (
                          <span className="text-xs text-gray-500">
                            {task.assignee.firstName} {task.assignee.lastName}
                          </span>
                        )}
                        
                        {task.dueDate && (
                          <span className="text-xs text-gray-500 flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {new Date(task.dueDate).toLocaleDateString()}
                            {new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && (
                              <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                            )}
                          </span>
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
                ))}
              </div>
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
                          <span className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${statusColors[task.status]}`}>
                            {task.status.replace(/_/g, ' ')}
                          </span>
                          
                          {task.assignee && (
                            <span className="text-xs text-gray-500">
                              {task.assignee.firstName} {task.assignee.lastName}
                            </span>
                          )}
                          
                          {task.dueDate && (
                            <span className="text-xs text-gray-500 flex items-center">
                              <Calendar className="h-3 w-3 mr-1" />
                              {new Date(task.dueDate).toLocaleDateString()}
                              {new Date(task.dueDate) < new Date() && task.status !== 'COMPLETED' && (
                                <AlertCircle className="h-3 w-3 ml-1 text-red-500" />
                              )}
                            </span>
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

      {filteredTasks.length === 0 && (
        <div className="text-center py-12">
          <CheckSquare className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <div className="text-gray-500 mb-4">
            {searchTerm || selectedStatus !== 'all' || selectedPriority !== 'all'
              ? 'No tasks match your filters'
              : 'No tasks found'}
          </div>
          {(!searchTerm && selectedStatus === 'all' && selectedPriority === 'all') && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              Create your first task
            </button>
          )}
        </div>
      )}

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
                      assigneeId: ''
                    }}
                    validationSchema={taskSchema}
                    onSubmit={(values) => createMutation.mutate(values)}
                  >
                    {({ isSubmitting }) => (
                      <Form className="space-y-4">
                        <div>
                          <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                            Task Title *
                          </label>
                          <Field
                            id="title"
                            name="title"
                            type="text"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Install electrical wiring"
                          />
                          <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
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
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Task details and requirements..."
                          />
                          <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
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
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="LOW">Low</option>
                              <option value="MEDIUM">Medium</option>
                              <option value="HIGH">High</option>
                              <option value="URGENT">Urgent</option>
                            </Field>
                            <ErrorMessage name="priority" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                              Due Date
                            </label>
                            <Field
                              id="dueDate"
                              name="dueDate"
                              type="date"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            />
                            <ErrorMessage name="dueDate" component="p" className="mt-1 text-sm text-red-600" />
                          </div>
                        </div>

                        <div>
                          <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                            Category
                          </label>
                          <Field
                            as="select"
                            id="categoryId"
                            name="categoryId"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">Uncategorized</option>
                            {Array.isArray(categories) ? categories.map((category: TaskCategory) => (
                              <option key={category.id} value={category.id}>
                                {category.name}
                              </option>
                            )) : []}
                          </Field>
                          <ErrorMessage name="categoryId" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
                            Assign To
                          </label>
                          <Field
                            as="select"
                            id="assigneeId"
                            name="assigneeId"
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                          >
                            <option value="">Unassigned</option>
                            {Array.isArray(teamMembers) ? teamMembers.map((member: any) => (
                              <option key={member.id} value={member.id}>
                                {member.firstName} {member.lastName}
                              </option>
                            )) : []}
                          </Field>
                          <ErrorMessage name="assigneeId" component="p" className="mt-1 text-sm text-red-600" />
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
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="e.g., Foundation, Electrical, Plumbing"
                          />
                          <ErrorMessage name="name" component="p" className="mt-1 text-sm text-red-600" />
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
                            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            placeholder="Optional description for this category..."
                          />
                          <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
                        </div>

                        <div>
                          <label htmlFor="color" className="block text-sm font-medium text-gray-700">
                            Color
                          </label>
                          <div className="mt-1 flex items-center space-x-3">
                            <Field
                              id="color"
                              name="color"
                              type="color"
                              className="h-10 w-16 rounded-md border border-gray-300 cursor-pointer"
                            />
                            <span className="text-sm text-gray-500">Choose a color to identify this category</span>
                          </div>
                          <ErrorMessage name="color" component="p" className="mt-1 text-sm text-red-600" />
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
                        <p className="text-sm text-yellow-700 mt-1">
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
                        assigneeId: selectedTask.assignee?.id || ''
                      }}
                      validationSchema={taskSchema}
                      onSubmit={(values) => updateMutation.mutate({ taskId: selectedTask.id, data: values })}
                    >
                      {({ isSubmitting }) => (
                        <Form className="space-y-4">
                          <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">
                              Task Title *
                            </label>
                            <Field
                              id="title"
                              name="title"
                              type="text"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Enter task title..."
                            />
                            <ErrorMessage name="title" component="p" className="mt-1 text-sm text-red-600" />
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
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              placeholder="Optional task description..."
                            />
                            <ErrorMessage name="description" component="p" className="mt-1 text-sm text-red-600" />
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
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              >
                                <option value="LOW">Low</option>
                                <option value="MEDIUM">Medium</option>
                                <option value="HIGH">High</option>
                                <option value="URGENT">Urgent</option>
                              </Field>
                              <ErrorMessage name="priority" component="p" className="mt-1 text-sm text-red-600" />
                            </div>

                            <div>
                              <label htmlFor="dueDate" className="block text-sm font-medium text-gray-700">
                                Due Date
                              </label>
                              <Field
                                id="dueDate"
                                name="dueDate"
                                type="date"
                                className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                              />
                              <ErrorMessage name="dueDate" component="p" className="mt-1 text-sm text-red-600" />
                            </div>
                          </div>

                          <div>
                            <label htmlFor="categoryId" className="block text-sm font-medium text-gray-700">
                              Category
                            </label>
                            <Field
                              as="select"
                              id="categoryId"
                              name="categoryId"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Select Category (Optional)</option>
                              {(categories || []).map((category: TaskCategory) => (
                                <option key={category.id} value={category.id}>
                                  {category.name}
                                </option>
                              ))}
                            </Field>
                            <ErrorMessage name="categoryId" component="p" className="mt-1 text-sm text-red-600" />
                          </div>

                          <div>
                            <label htmlFor="assigneeId" className="block text-sm font-medium text-gray-700">
                              Assign To
                            </label>
                            <Field
                              as="select"
                              id="assigneeId"
                              name="assigneeId"
                              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
                            >
                              <option value="">Unassigned</option>
                              {Array.isArray(teamMembers) ? teamMembers.map((user: any) => (
                                <option key={user.id} value={user.id}>
                                  {user.firstName} {user.lastName}
                                </option>
                              )) : []}
                            </Field>
                            <ErrorMessage name="assigneeId" component="p" className="mt-1 text-sm text-red-600" />
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
                  ) : (
                    <TaskComments taskId={selectedTask.id} projectId={projectId} />
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