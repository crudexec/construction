'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import {
  User,
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
  Activity as ActivityIcon
} from 'lucide-react'
import { formatDistanceToNow, format } from 'date-fns'
import { DatePicker } from '@/components/ui/date-picker'
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
      return 'text-green-600 bg-green-50'
    case 'task_updated':
    case 'project_updated':
    case 'comment_added':
      return 'text-blue-600 bg-blue-50'
    case 'task_deleted':
    case 'project_deleted':
      return 'text-red-600 bg-red-50'
    case 'task_completed':
      return 'text-purple-600 bg-purple-50'
    case 'user_invited':
      return 'text-yellow-600 bg-yellow-50'
    case 'user_login':
      return 'text-cyan-600 bg-cyan-50'
    case 'dailylog_created':
    case 'dailylog_updated':
      return 'text-orange-600 bg-orange-50'
    case 'dailylog_deleted':
      return 'text-red-600 bg-red-50'
    case 'document_uploaded':
    case 'document_downloaded':
      return 'text-indigo-600 bg-indigo-50'
    default:
      return 'text-gray-600 bg-gray-50'
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
    { value: 'all', label: 'All Types' },
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
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {/* Compact Header */}
      <div className="flex justify-between items-center py-1">
        <div className="flex items-center space-x-2">
          <ActivityIcon className="h-4 w-4 text-gray-500" />
          <h1 className="text-sm font-medium text-gray-900">Activity Log</h1>
          {pagination && (
            <span className="text-xs text-gray-500">({pagination.totalCount} total)</span>
          )}
        </div>
      </div>

      {/* Compact Filters */}
      <div className="bg-white border border-gray-200 rounded">
        <div className="flex flex-wrap items-center gap-2 p-1.5">
          <div className="relative flex-1 min-w-[150px]">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-gray-400" />
            <input
              type="text"
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-6 pr-2 py-1 w-full text-xs border border-gray-200 rounded focus:border-primary-500 focus:outline-none"
            />
          </div>
          <select
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            {activityTypes.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
          <select
            value={selectedUser}
            onChange={(e) => setSelectedUser(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Users</option>
            {Array.isArray(users) && users.map((user: any) => (
              <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
            ))}
          </select>
          <select
            value={selectedProject}
            onChange={(e) => setSelectedProject(e.target.value)}
            className="text-xs border border-gray-200 rounded py-1 px-2 focus:border-primary-500 focus:outline-none"
          >
            <option value="all">All Projects</option>
            {Array.isArray(projects) && projects.map((project: any) => (
              <option key={project.id} value={project.id}>{project.title}</option>
            ))}
          </select>
          <div className="flex items-center gap-1">
            <DatePicker
              value={startDate}
              onChange={(date) => setStartDate(date)}
              placeholder="From"
              maxDate={endDate ? new Date(endDate) : undefined}
            />
            <span className="text-xs text-gray-400">-</span>
            <DatePicker
              value={endDate}
              onChange={(date) => setEndDate(date)}
              placeholder="To"
              minDate={startDate ? new Date(startDate) : undefined}
            />
          </div>
        </div>
      </div>

      {/* Compact Activity Table */}
      <div className="bg-white border border-gray-200 rounded overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase w-8"></th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Activity</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">User</th>
              <th className="px-2 py-1.5 text-left text-[10px] font-medium text-gray-500 uppercase">Project</th>
              <th className="px-2 py-1.5 text-right text-[10px] font-medium text-gray-500 uppercase">Time</th>
            </tr>
          </thead>
          <tbody>
            {activities.map((activity, index) => {
              const Icon = getActivityIcon(activity.type)
              const colorClasses = getActivityColor(activity.type)

              return (
                <tr key={activity.id} className={`border-b border-gray-100 hover:bg-blue-50 ${index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-2 py-1.5">
                    <div className={`w-5 h-5 rounded flex items-center justify-center ${colorClasses}`}>
                      <Icon className="w-2.5 h-2.5" />
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="text-xs text-gray-900 truncate max-w-[250px]">
                      {activity.description}
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <div className="flex items-center gap-1">
                      <span className="text-xs text-gray-700">
                        {activity.user.firstName} {activity.user.lastName}
                      </span>
                      <span className={`px-1 py-0.5 rounded text-[9px] font-medium ${
                        activity.user.role === 'ADMIN' ? 'bg-red-100 text-red-700' :
                        activity.user.role === 'STAFF' ? 'bg-blue-100 text-blue-700' :
                        activity.user.role === 'SUBCONTRACTOR' ? 'bg-yellow-100 text-yellow-700' :
                        'bg-gray-100 text-gray-700'
                      }`}>
                        {activity.user.role}
                      </span>
                    </div>
                  </td>
                  <td className="px-2 py-1.5">
                    <Link
                      href={`/dashboard/projects/${activity.card.id}`}
                      className="text-xs text-primary-600 hover:text-primary-800 hover:underline truncate block max-w-[120px]"
                    >
                      {activity.card.title}
                    </Link>
                  </td>
                  <td className="px-2 py-1.5 text-right">
                    <span
                      className="text-[10px] text-gray-500"
                      title={format(new Date(activity.createdAt), 'PPpp')}
                    >
                      {formatDistanceToNow(new Date(activity.createdAt), { addSuffix: true })}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>

        {activities.length === 0 && (
          <div className="text-center py-8">
            <ActivityIcon className="h-8 w-8 text-gray-300 mx-auto mb-2" />
            <div className="text-xs text-gray-500">
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
                className="mt-1 text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Clear filters
              </button>
            )}
          </div>
        )}

        {/* Compact Pagination */}
        {pagination && pagination.totalPages > 1 && (
          <div className="border-t border-gray-200 px-2 py-1.5 flex items-center justify-between bg-gray-50">
            <div className="text-[10px] text-gray-500">
              {((pagination.page - 1) * pagination.limit) + 1}-{Math.min(pagination.page * pagination.limit, pagination.totalCount)} of {pagination.totalCount}
            </div>
            <div className="flex items-center space-x-1">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={pagination.page === 1}
                className="p-0.5 text-xs border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="w-3 h-3" />
              </button>
              <span className="text-[10px] text-gray-600 px-1">
                {pagination.page}/{pagination.totalPages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={pagination.page === pagination.totalPages}
                className="p-0.5 text-xs border border-gray-200 rounded hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}