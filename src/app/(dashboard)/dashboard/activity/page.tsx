'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { 
  Calendar,
  User,
  Filter,
  Search,
  ArrowLeft,
  ArrowRight,
  Clock,
  FileText,
  MessageSquare,
  UserPlus,
  CheckSquare,
  Trash2,
  Edit,
  Eye,
  Upload,
  Download,
  Settings,
  AlertCircle,
  Activity as ActivityIcon
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { CompactFilters } from '@/components/ui/compact-filters'
import Link from 'next/link'

interface Activity {
  id: string
  type: string
  description: string
  createdAt: string
  user: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar?: string
    role: string
  }
  card: {
    id: string
    title: string
    status: string
  }
}

interface ActivityResponse {
  activities: Activity[]
  pagination: {
    page: number
    limit: number
    totalCount: number
    totalPages: number
  }
  typeCounts: Array<{ type: string; count: number }>
}

async function fetchActivities(params: {
  page?: number
  limit?: number
  type?: string
  userId?: string
  cardId?: string
  search?: string
  startDate?: string
  endDate?: string
}) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const queryParams = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      queryParams.set(key, value.toString())
    }
  })

  const response = await fetch(`/api/activities?${queryParams.toString()}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch activities')
  return response.json()
}

async function fetchUsers() {
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
  if (!response.ok) throw new Error('Failed to fetch users')
  return response.json()
}

async function fetchProjects() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch('/api/project', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch projects')
  return response.json()
}

const getActivityIcon = (type: string) => {
  switch (type) {
    case 'task_created':
    case 'task_updated':
    case 'task_completed':
      return CheckSquare
    case 'task_deleted':
      return Trash2
    case 'comment_added':
      return MessageSquare
    case 'project_created':
    case 'project_updated':
    case 'card_created':
      return FileText
    case 'project_deleted':
      return Trash2
    case 'user_invited':
    case 'user_added':
    case 'user_joined':
      return UserPlus
    case 'user_login':
      return User
    case 'dailylog_created':
    case 'dailylog_updated':
      return FileText
    case 'dailylog_deleted':
      return Trash2
    case 'document_uploaded':
      return Upload
    case 'document_downloaded':
      return Download
    case 'settings_updated':
      return Settings
    case 'login':
      return User
    case 'project_viewed':
    case 'task_viewed':
      return Eye
    default:
      return ActivityIcon
  }
}

const getActivityColor = (type: string) => {
  switch (type) {
    case 'task_created':
    case 'project_created':
    case 'card_created':
    case 'user_added':
    case 'user_joined':
      return 'text-green-600 bg-green-100'
    case 'task_updated':
    case 'project_updated':
    case 'comment_added':
      return 'text-blue-600 bg-blue-100'
    case 'task_deleted':
    case 'project_deleted':
      return 'text-red-600 bg-red-100'
    case 'task_completed':
      return 'text-purple-600 bg-purple-100'
    case 'user_invited':
      return 'text-yellow-600 bg-yellow-100'
    case 'user_login':
      return 'text-cyan-600 bg-cyan-100'
    case 'dailylog_created':
    case 'dailylog_updated':
      return 'text-orange-600 bg-orange-100'
    case 'dailylog_deleted':
      return 'text-red-600 bg-red-100'
    case 'document_uploaded':
    case 'document_downloaded':
      return 'text-indigo-600 bg-indigo-100'
    default:
      return 'text-gray-600 bg-gray-100'
  }
}

export default function ActivityPage() {
  const [page, setPage] = useState(1)
  const [selectedType, setSelectedType] = useState('all')
  const [selectedUser, setSelectedUser] = useState('all')
  const [selectedProject, setSelectedProject] = useState('all')
  const [searchTerm, setSearchTerm] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const limit = 50

  const { data: response, isLoading } = useQuery<ActivityResponse>({
    queryKey: ['activities', page, selectedType, selectedUser, selectedProject, searchTerm, startDate, endDate],
    queryFn: () => fetchActivities({
      page,
      limit,
      type: selectedType !== 'all' ? selectedType : undefined,
      userId: selectedUser !== 'all' ? selectedUser : undefined,
      cardId: selectedProject !== 'all' ? selectedProject : undefined,
      search: searchTerm || undefined,
      startDate: startDate || undefined,
      endDate: endDate || undefined
    })
  })

  const { data: users = [] } = useQuery({
    queryKey: ['users'],
    queryFn: fetchUsers
  })

  const { data: projects = [] } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects
  })

  const activities = response?.activities || []
  const pagination = response?.pagination
  const typeCounts = response?.typeCounts || []

  const activityTypes = [
    { value: 'all', label: 'All Activities' },
    ...typeCounts.map(tc => ({
      value: tc.type,
      label: `${tc.type.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())} (${tc.count})`
    }))
  ]

  const handlePageChange = (newPage: number) => {
    if (newPage >= 1 && newPage <= (pagination?.totalPages || 1)) {
      setPage(newPage)
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
    <div className="space-y-4">
      {/* Header */}
      <div className="bg-white p-4 rounded-lg shadow">
        <div className="flex items-center space-x-2 mb-4">
          <ActivityIcon className="h-6 w-6 text-primary-600" />
          <h1 className="text-xl font-semibold text-gray-900">Activity Log</h1>
          {pagination && (
            <span className="text-sm text-gray-500">
              ({pagination.totalCount} total activities)
            </span>
          )}
        </div>

        {/* Date Range Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="startDate" className="block text-sm font-medium text-gray-700 mb-1">
              From Date
            </label>
            <input
              id="startDate"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
          <div>
            <label htmlFor="endDate" className="block text-sm font-medium text-gray-700 mb-1">
              To Date
            </label>
            <input
              id="endDate"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>
        </div>

        {/* Filters */}
        <CompactFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search activity descriptions..."
          resultsCount={activities.length}
          totalCount={pagination?.totalCount}
          filters={[
            {
              key: 'type',
              label: 'Activity Type',
              value: selectedType,
              onChange: setSelectedType,
              options: activityTypes
            },
            {
              key: 'user',
              label: 'User',
              value: selectedUser,
              onChange: setSelectedUser,
              options: [
                { value: 'all', label: 'All Users' },
                ...(Array.isArray(users) ? users.map((user: any) => ({
                  value: user.id,
                  label: `${user.firstName} ${user.lastName}`
                })) : [])
              ]
            },
            {
              key: 'project',
              label: 'Project',
              value: selectedProject,
              onChange: setSelectedProject,
              options: [
                { value: 'all', label: 'All Projects' },
                ...(Array.isArray(projects) ? projects.map((project: any) => ({
                  value: project.id,
                  label: project.title
                })) : [])
              ]
            }
          ]}
        />
      </div>

      {/* Activities List */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4">
          <div className="space-y-4">
            {activities.map((activity) => {
              const Icon = getActivityIcon(activity.type)
              const colorClasses = getActivityColor(activity.type)

              return (
                <div key={activity.id} className="flex space-x-3 p-3 hover:bg-gray-50 rounded-lg transition-colors">
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${colorClasses}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="text-sm text-gray-900 mb-1">
                          {activity.description}
                        </p>
                        
                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <User className="w-3 h-3" />
                            <span>
                              {activity.user.firstName} {activity.user.lastName}
                            </span>
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              activity.user.role === 'ADMIN' ? 'bg-red-100 text-red-800' :
                              activity.user.role === 'STAFF' ? 'bg-blue-100 text-blue-800' :
                              activity.user.role === 'SUBCONTRACTOR' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-gray-100 text-gray-800'
                            }`}>
                              {activity.user.role}
                            </span>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <FileText className="w-3 h-3" />
                            <Link 
                              href={`/dashboard/projects/${activity.card.id}`}
                              className="text-primary-600 hover:text-primary-800 hover:underline"
                            >
                              {activity.card.title}
                            </Link>
                          </div>
                          
                          <div className="flex items-center space-x-1">
                            <Clock className="w-3 h-3" />
                            <span title={format(new Date(activity.createdAt), 'PPpp')}>
                              {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )
            })}

            {activities.length === 0 && (
              <div className="text-center py-12">
                <ActivityIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                <div className="text-sm text-gray-500 mb-3">
                  {searchTerm || selectedType !== 'all' || selectedUser !== 'all' || selectedProject !== 'all' || startDate || endDate
                    ? 'No activities match your filters'
                    : 'No activities found'}
                </div>
                {(searchTerm || selectedType !== 'all' || selectedUser !== 'all' || selectedProject !== 'all' || startDate || endDate) && (
                  <button
                    onClick={() => {
                      setSearchTerm('')
                      setSelectedType('all')
                      setSelectedUser('all')
                      setSelectedProject('all')
                      setStartDate('')
                      setEndDate('')
                    }}
                    className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  >
                    Clear filters
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-gray-500">
              Showing {((pagination.page - 1) * pagination.limit) + 1} to {Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount} activities
            </div>
            
            <div className="flex items-center space-x-2">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
              
              <span className="text-sm text-gray-700">
                Page {pagination.page} of {pagination.totalPages}
              </span>
              
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}