'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Eye, 
  Edit, 
  Trash2,
  Calendar,
  DollarSign,
  Users,
  CheckCircle,
  Clock,
  AlertCircle,
  Building,
  MapPin
} from 'lucide-react'
import { AddProjectModal } from '@/components/projects/add-project-modal'
import { CompactFilters } from '@/components/ui/compact-filters'

interface Project {
  id: string
  title: string
  description?: string
  contactName?: string
  contactEmail?: string
  contactPhone?: string
  projectAddress?: string
  projectCity?: string
  projectState?: string
  budget?: number
  startDate?: string
  endDate?: string
  priority: string
  status: string
  stage: {
    id: string
    name: string
    color: string
  }
  owner: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  assignedUsers: Array<{
    id: string
    firstName: string
    lastName: string
    email: string
  }>
  metrics: {
    totalBudget: number
    totalExpenses: number
    profit: number
    progress: number
    completedTasks: number
    totalTasks: number
  }
  createdAt: string
  updatedAt: string
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

export default function ProjectsPage() {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [selectedPriority, setSelectedPriority] = useState('all')
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  const statuses = ['ACTIVE', 'COMPLETED', 'CANCELLED']

  // Filter projects
  const filteredProjects = projects.filter((project: Project) => {
    const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         project.projectAddress?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus
    const matchesPriority = selectedPriority === 'all' || project.priority === selectedPriority
    
    return matchesSearch && matchesStatus && matchesPriority
  })

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-800',
    MEDIUM: 'bg-blue-100 text-blue-800',
    HIGH: 'bg-orange-100 text-orange-800',
    URGENT: 'bg-red-100 text-red-800',
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-800',
    COMPLETED: 'bg-blue-100 text-blue-800',
    CANCELLED: 'bg-red-100 text-red-800',
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-3">
        {/* Compact Header - Mobile Responsive */}
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div className="flex items-center gap-2 sm:gap-4 flex-1">
              <h1 className="text-base sm:text-lg font-semibold text-gray-900">Projects</h1>
              <div className="text-xs sm:text-sm text-gray-500">
                {filteredProjects.length}/{projects.length}
              </div>
            </div>
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="bg-primary-600 text-white px-3 py-1.5 rounded text-xs sm:text-sm hover:bg-primary-700 flex items-center justify-center space-x-1"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>New Project</span>
            </button>
          </div>
        </div>

        {/* Compact Stats */}
        <div className="bg-white p-3 rounded-lg shadow">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="flex items-center space-x-2">
              <Building className="h-5 w-5 text-blue-500" />
              <div>
                <p className="text-xs text-gray-500">Total</p>
                <p className="text-sm font-semibold text-gray-900">{projects.length}</p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="text-sm font-semibold text-gray-900">
                  {projects.filter((p: Project) => p.status === 'ACTIVE').length}
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <DollarSign className="h-5 w-5 text-purple-500" />
              <div>
                <p className="text-xs text-gray-500">Total Value</p>
                <p className="text-sm font-semibold text-gray-900">
                  ${Math.round(projects.reduce((sum: number, p: Project) => sum + (p.metrics?.totalBudget || 0), 0) / 1000)}k
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5 text-orange-500" />
              <div>
                <p className="text-xs text-gray-500">Behind</p>
                <p className="text-sm font-semibold text-gray-900">
                  {projects.filter((p: Project) => {
                    if (!p.endDate) return false
                    const endDate = new Date(p.endDate)
                    const now = new Date()
                    return endDate < now && p.status === 'ACTIVE'
                  }).length}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Compact Filters */}
        <CompactFilters
          searchValue={searchTerm}
          onSearchChange={setSearchTerm}
          searchPlaceholder="Search projects..."
          resultsCount={filteredProjects.length}
          totalCount={projects.length}
          filters={[
            {
              key: 'status',
              label: 'Status',
              value: selectedStatus,
              onChange: setSelectedStatus,
              options: [
                { value: 'all', label: 'All Status' },
                ...statuses.map(status => ({ value: status, label: status }))
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

        {/* Compact Projects List */}
        <div className="bg-white rounded-lg shadow">
          <div className="p-2">
            <div className="space-y-1">
              {filteredProjects.map((project: Project) => (
                <div key={project.id} className="bg-gray-50 rounded p-3 hover:bg-gray-100 transition-colors cursor-pointer"
                     onClick={() => router.push(`/dashboard/projects/${project.id}`)}>
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      {/* Project Info */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-2 mb-1">
                        <h3 className="text-xs sm:text-sm font-semibold text-gray-900 truncate">{project.title}</h3>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                            priorityColors[project.priority as keyof typeof priorityColors]
                          }`}
                        >
                          {project.priority}
                        </span>
                        <span
                          className={`inline-flex px-1.5 py-0.5 text-xs font-medium rounded-full ${
                            statusColors[project.status as keyof typeof statusColors]
                          }`}
                        >
                          {project.status}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500">
                        {project.contactName && (
                          <span className="truncate">{project.contactName}</span>
                        )}
                        {project.projectAddress && (
                          <div className="flex items-center space-x-1">
                            <MapPin className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">
                              {project.projectCity || project.projectAddress}
                            </span>
                          </div>
                        )}
                        <span className="hidden sm:inline">Budget: ${(project.budget || 0).toLocaleString()}</span>
                        <span className="sm:hidden">${Math.round((project.budget || 0) / 1000)}k</span>
                        <span>Tasks: {project.metrics?.completedTasks || 0}/{project.metrics?.totalTasks || 0}</span>
                        {project.assignedUsers.length > 0 && (
                          <div className="flex items-center space-x-1">
                            <Users className="h-3 w-3" />
                            <span>{project.assignedUsers.length}</span>
                          </div>
                        )}
                      </div>
                    </div>
                    
                    {/* Progress - Mobile Responsive */}
                    <div className="flex items-center space-x-2">
                      <div className="text-xs text-gray-500">{project.metrics?.progress || 0}%</div>
                      <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${getProgressColor(project.metrics?.progress || 0)}`}
                          style={{ width: `${project.metrics?.progress || 0}%` }}
                        />
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-1">
                      <button 
                        onClick={(e) => {
                          e.stopPropagation()
                          router.push(`/dashboard/projects/${project.id}`)
                        }}
                        className="text-gray-400 hover:text-gray-600"
                        title="View"
                      >
                        <Eye className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-gray-600"
                        title="Edit"
                      >
                        <Edit className="h-3.5 w-3.5" />
                      </button>
                      <button 
                        onClick={(e) => e.stopPropagation()}
                        className="text-gray-400 hover:text-red-600"
                        title="Delete"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {filteredProjects.length === 0 && (
          <div className="bg-white rounded-lg shadow p-6 text-center">
            <Building className="h-12 w-12 text-gray-400 mx-auto mb-3" />
            <div className="text-sm text-gray-500 mb-3">
              {searchTerm || selectedStatus !== 'all' || selectedPriority !== 'all'
                ? 'No projects match your filters'
                : 'No projects found'}
            </div>
            {(!searchTerm && selectedStatus === 'all' && selectedPriority === 'all') && (
              <button
                onClick={() => setIsAddModalOpen(true)}
                className="text-xs text-primary-600 hover:text-primary-700 font-medium"
              >
                Create your first project
              </button>
            )}
          </div>
        )}
      </div>

      <AddProjectModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          refetch()
          setIsAddModalOpen(false)
        }}
      />
    </>
  )
}