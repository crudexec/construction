'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import {
  Plus,
  Search,
  Building,
  ChevronUp,
  ChevronDown,
  Download
} from 'lucide-react'
import { AddProjectModal } from '@/components/projects/add-project-modal'
import { useCurrency } from '@/hooks/useCurrency'

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

type SortField = 'title' | 'contactName' | 'status' | 'priority' | 'budget' | 'progress' | 'startDate' | 'endDate' | 'assignedUsers' | 'createdAt'
type SortDirection = 'asc' | 'desc'

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
  const [selectedRows, setSelectedRows] = useState<Set<string>>(new Set())
  const [sortField, setSortField] = useState<SortField>('title')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const { format: formatCurrency } = useCurrency()

  const { data: projects = [], isLoading, refetch } = useQuery({
    queryKey: ['projects'],
    queryFn: fetchProjects,
  })

  const priorities = ['LOW', 'MEDIUM', 'HIGH', 'URGENT']
  const statuses = ['ACTIVE', 'COMPLETED', 'CANCELLED']

  // Filter projects
  const filteredProjects = useMemo(() => {
    return projects.filter((project: Project) => {
      const matchesSearch = project.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.contactName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.projectAddress?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           project.projectCity?.toLowerCase().includes(searchTerm.toLowerCase())

      const matchesStatus = selectedStatus === 'all' || project.status === selectedStatus
      const matchesPriority = selectedPriority === 'all' || project.priority === selectedPriority

      return matchesSearch && matchesStatus && matchesPriority
    })
  }, [projects, searchTerm, selectedStatus, selectedPriority])

  // Sort projects
  const sortedProjects = useMemo(() => {
    return [...filteredProjects].sort((a: Project, b: Project) => {
      let comparison = 0
      switch (sortField) {
        case 'title':
          comparison = a.title.localeCompare(b.title)
          break
        case 'contactName':
          comparison = (a.contactName || '').localeCompare(b.contactName || '')
          break
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'priority':
          const priorityOrder = { URGENT: 4, HIGH: 3, MEDIUM: 2, LOW: 1 }
          comparison = (priorityOrder[a.priority as keyof typeof priorityOrder] || 0) -
                       (priorityOrder[b.priority as keyof typeof priorityOrder] || 0)
          break
        case 'budget':
          comparison = (a.budget || 0) - (b.budget || 0)
          break
        case 'progress':
          comparison = (a.metrics?.progress || 0) - (b.metrics?.progress || 0)
          break
        case 'startDate':
          comparison = new Date(a.startDate || 0).getTime() - new Date(b.startDate || 0).getTime()
          break
        case 'endDate':
          comparison = new Date(a.endDate || 0).getTime() - new Date(b.endDate || 0).getTime()
          break
        case 'assignedUsers':
          comparison = a.assignedUsers.length - b.assignedUsers.length
          break
        case 'createdAt':
          comparison = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
          break
      }
      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredProjects, sortField, sortDirection])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortDirection('asc')
    }
  }

  const handleSelectAll = () => {
    if (selectedRows.size === sortedProjects.length) {
      setSelectedRows(new Set())
    } else {
      setSelectedRows(new Set(sortedProjects.map((p: Project) => p.id)))
    }
  }

  const handleSelectRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    const newSelected = new Set(selectedRows)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedRows(newSelected)
  }

  const SortIcon = ({ field }: { field: SortField }) => {
    if (sortField !== field) return <ChevronUp className="h-3 w-3 text-gray-300" />
    return sortDirection === 'asc'
      ? <ChevronUp className="h-3 w-3 text-gray-700" />
      : <ChevronDown className="h-3 w-3 text-gray-700" />
  }

  const priorityColors = {
    LOW: 'bg-gray-100 text-gray-700',
    MEDIUM: 'bg-blue-100 text-blue-700',
    HIGH: 'bg-orange-100 text-orange-700',
    URGENT: 'bg-red-100 text-red-700',
  }

  const statusColors = {
    ACTIVE: 'bg-green-100 text-green-700',
    COMPLETED: 'bg-blue-100 text-blue-700',
    CANCELLED: 'bg-red-100 text-red-700',
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: '2-digit'
    })
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <>
      <div className="space-y-2">
        {/* Compact Toolbar */}
        <div className="bg-white border border-gray-300 rounded px-2 py-1.5 flex flex-wrap items-center gap-2">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-[300px]">
            <Search className="absolute left-2 top-1.5 h-3.5 w-3.5 text-gray-400" />
            <input
              type="text"
              placeholder="Search projects..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-7 w-full rounded border border-gray-300 py-1 px-2 text-xs focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="rounded border border-gray-300 py-1 px-2 text-xs focus:border-primary-500 focus:outline-none bg-white"
          >
            <option value="all">All Status</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={selectedPriority}
            onChange={(e) => setSelectedPriority(e.target.value)}
            className="rounded border border-gray-300 py-1 px-2 text-xs focus:border-primary-500 focus:outline-none bg-white"
          >
            <option value="all">All Priority</option>
            {priorities.map((priority) => (
              <option key={priority} value={priority}>{priority}</option>
            ))}
          </select>

          <div className="flex-1" />

          {/* Count */}
          <span className="text-[10px] text-gray-500">
            {filteredProjects.length} of {projects.length}
          </span>

          {/* Export */}
          <button className="p-1 hover:bg-gray-100 rounded" title="Export">
            <Download className="h-3.5 w-3.5 text-gray-500" />
          </button>

          {/* Add Button */}
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="bg-primary-600 text-white px-2 py-1 rounded text-xs hover:bg-primary-700 flex items-center gap-1"
          >
            <Plus className="h-3 w-3" />
            <span>New</span>
          </button>
        </div>

        {/* Excel-like Table */}
        <div className="border border-gray-300 rounded overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs border-collapse">
              <thead>
                <tr className="bg-gray-100 border-b border-gray-300">
                  <th className="w-8 px-1 py-1.5 border-r border-gray-200">
                    <input
                      type="checkbox"
                      checked={selectedRows.size === sortedProjects.length && sortedProjects.length > 0}
                      onChange={handleSelectAll}
                      className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th className="w-6 px-1 py-1.5 border-r border-gray-200 text-center text-gray-500">#</th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[200px]"
                    onClick={() => handleSort('title')}
                  >
                    <div className="flex items-center gap-1">Project <SortIcon field="title" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 min-w-[120px]"
                    onClick={() => handleSort('contactName')}
                  >
                    <div className="flex items-center gap-1">Contact <SortIcon field="contactName" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[80px]"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-1">Status <SortIcon field="status" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[70px]"
                    onClick={() => handleSort('priority')}
                  >
                    <div className="flex items-center gap-1">Priority <SortIcon field="priority" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-right font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[100px]"
                    onClick={() => handleSort('budget')}
                  >
                    <div className="flex items-center justify-end gap-1">Budget <SortIcon field="budget" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[100px]"
                    onClick={() => handleSort('progress')}
                  >
                    <div className="flex items-center gap-1">Progress <SortIcon field="progress" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[75px]"
                    onClick={() => handleSort('startDate')}
                  >
                    <div className="flex items-center gap-1">Start <SortIcon field="startDate" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-left font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[75px]"
                    onClick={() => handleSort('endDate')}
                  >
                    <div className="flex items-center gap-1">End <SortIcon field="endDate" /></div>
                  </th>
                  <th
                    className="px-2 py-1.5 border-r border-gray-200 text-center font-semibold text-gray-700 cursor-pointer hover:bg-gray-200 w-[50px]"
                    onClick={() => handleSort('assignedUsers')}
                  >
                    <div className="flex items-center justify-center gap-1">Team <SortIcon field="assignedUsers" /></div>
                  </th>
                  <th className="px-2 py-1.5 text-left font-semibold text-gray-700 min-w-[120px]">
                    Location
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedProjects.map((project: Project, index: number) => (
                  <tr
                    key={project.id}
                    className={`border-b border-gray-200 hover:bg-blue-50 cursor-pointer ${
                      selectedRows.has(project.id)
                        ? 'bg-blue-100'
                        : index % 2 === 0 ? 'bg-white' : 'bg-gray-50'
                    }`}
                    onClick={() => router.push(`/dashboard/projects/${project.id}`)}
                  >
                    <td className="px-1 py-1 border-r border-gray-200 text-center" onClick={(e) => handleSelectRow(project.id, e)}>
                      <input
                        type="checkbox"
                        checked={selectedRows.has(project.id)}
                        onChange={() => {}}
                        className="h-3 w-3 rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-1 py-1 border-r border-gray-200 text-center text-[10px] text-gray-400">
                      {index + 1}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      <div className="font-medium text-gray-900 truncate max-w-[200px]" title={project.title}>
                        {project.title}
                      </div>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-gray-600 truncate max-w-[120px]" title={project.contactName}>
                      {project.contactName || '-'}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        statusColors[project.status as keyof typeof statusColors] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {project.status}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      <span className={`inline-flex px-1.5 py-0.5 text-[10px] font-medium rounded ${
                        priorityColors[project.priority as keyof typeof priorityColors] || 'bg-gray-100 text-gray-700'
                      }`}>
                        {project.priority}
                      </span>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-right text-gray-700 font-mono text-[10px]">
                      {formatCurrency(project.budget || 0)}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200">
                      <div className="flex items-center gap-1.5">
                        <div className="flex-1 bg-gray-200 rounded-full h-1.5 min-w-[40px]">
                          <div
                            className={`h-1.5 rounded-full ${getProgressColor(project.metrics?.progress || 0)}`}
                            style={{ width: `${project.metrics?.progress || 0}%` }}
                          />
                        </div>
                        <span className="text-[10px] text-gray-500 w-7 text-right">{project.metrics?.progress || 0}%</span>
                      </div>
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-[10px] text-gray-600">
                      {formatDate(project.startDate)}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-[10px] text-gray-600">
                      {formatDate(project.endDate)}
                    </td>
                    <td className="px-2 py-1 border-r border-gray-200 text-center">
                      {project.assignedUsers.length > 0 ? (
                        <span className="inline-flex items-center justify-center h-5 w-5 rounded-full bg-primary-100 text-primary-700 text-[10px] font-medium">
                          {project.assignedUsers.length}
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-2 py-1 text-gray-600 truncate max-w-[120px]" title={`${project.projectCity || ''}${project.projectCity && project.projectState ? ', ' : ''}${project.projectState || ''}`}>
                      {project.projectCity || project.projectState
                        ? `${project.projectCity || ''}${project.projectCity && project.projectState ? ', ' : ''}${project.projectState || ''}`
                        : '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {sortedProjects.length === 0 && (
            <div className="text-center py-6 bg-white">
              <Building className="h-8 w-8 text-gray-400 mx-auto mb-2" />
              <div className="text-gray-500 text-xs">
                {searchTerm || selectedStatus !== 'all' || selectedPriority !== 'all'
                  ? 'No projects match your filters'
                  : 'No projects found'}
              </div>
              {(!searchTerm && selectedStatus === 'all' && selectedPriority === 'all') && (
                <button
                  onClick={() => setIsAddModalOpen(true)}
                  className="mt-2 text-primary-600 hover:text-primary-700 font-medium text-xs"
                >
                  Create your first project
                </button>
              )}
            </div>
          )}
        </div>

        {/* Selection info */}
        {selectedRows.size > 0 && (
          <div className="bg-primary-50 border border-primary-200 rounded px-3 py-1.5 text-xs text-primary-700">
            {selectedRows.size} project{selectedRows.size > 1 ? 's' : ''} selected
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
