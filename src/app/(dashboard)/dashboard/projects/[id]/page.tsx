'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { 
  ArrowLeft,
  Calendar,
  CheckSquare,
  FileText,
  Users,
  MapPin,
  Clock,
  AlertCircle,
  Plus,
  Filter,
  Search,
  ExternalLink,
  Eye,
  Copy,
  MessageSquare,
  Edit3,
  ChevronDown,
  Settings
} from 'lucide-react'
import Link from 'next/link'
import { ProjectOverview } from '@/components/projects/project-overview'
import { ProjectTasks } from '@/components/projects/project-tasks'
import { ProjectFiles } from '@/components/projects/project-files'
import { ProjectEstimates } from '@/components/projects/project-estimates'
import { ProjectCalendar } from '@/components/projects/project-calendar'
import { ProjectMessages } from '@/components/projects/project-messages'
import { ProjectEditModal } from '@/components/projects/project-edit-modal'
import { ProjectTeamModal } from '@/components/projects/project-team-modal'
import { PortalSettingsModal } from '@/components/projects/portal-settings-modal'
import { useModal } from '@/components/ui/modal-provider'

async function fetchProject(id: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
    
  const response = await fetch(`/api/project/${id}`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch project')
  return response.json()
}

export default function ProjectDetailPage() {
  const params = useParams()
  const router = useRouter()
  const searchParams = useSearchParams()
  const projectId = params.id as string
  const { showAlert } = useModal()
  
  // Initialize tab from URL or default to overview
  const tabFromUrl = searchParams.get('tab')
  const initialTab = tabFromUrl && ['overview', 'tasks', 'calendar', 'estimates', 'files', 'messages'].includes(tabFromUrl) 
    ? tabFromUrl 
    : 'overview'
  
  const [activeTab, setActiveTab] = useState(initialTab)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showAddEstimate, setShowAddEstimate] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showClientPortalModal, setShowClientPortalModal] = useState(false)
  const [showPortalSettingsModal, setShowPortalSettingsModal] = useState(false)
  const [showPortalDropdown, setShowPortalDropdown] = useState(false)
  const [clientAccessData, setClientAccessData] = useState<any>(null)
  const [isGeneratingAccess, setIsGeneratingAccess] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)

  // Update active tab when URL changes
  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && ['overview', 'tasks', 'calendar', 'estimates', 'files', 'messages'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  // Update URL when tab changes
  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('tab', tabId)
    router.push(newUrl.pathname + newUrl.search, { scroll: false })
  }

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement
      if (!target.closest('.portal-dropdown')) {
        setShowPortalDropdown(false)
      }
    }

    if (showPortalDropdown) {
      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPortalDropdown])

  // Handle Add Task button click
  const handleAddTask = () => {
    handleTabChange('tasks')
    // Set a flag that the tasks component can check to open add modal
    setShowAddTask(true)
    setTimeout(() => setShowAddTask(false), 100)
  }

  // Handle New Estimate button click
  const handleNewEstimate = () => {
    handleTabChange('estimates')
    // Set a flag that the estimates component can check to open add modal
    setShowAddEstimate(true)
    setTimeout(() => setShowAddEstimate(false), 100)
  }

  // Handle Team button click
  const handleTeamClick = () => {
    setShowTeamModal(true)
  }

  // Handle Client Portal button click
  const handleClientPortal = async () => {
    // Check if client access already exists
    const customFields = JSON.parse(project.customFields || '{}')
    if (customFields.clientAccessEnabled && customFields.clientAccessToken) {
      // Show existing access
      setClientAccessData({
        clientUrl: `${window.location.origin}/client/project/${customFields.clientAccessToken}`,
        clientToken: customFields.clientAccessToken,
        enabled: true
      })
      setShowClientPortalModal(true)
    } else {
      // Generate new access
      await generateClientAccess()
    }
  }

  // Generate client access token
  const generateClientAccess = async () => {
    setIsGeneratingAccess(true)
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${projectId}/client-access`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (response.ok) {
        const data = await response.json()
        setClientAccessData(data)
        setShowClientPortalModal(true)
        // Refresh project data to show updated status
        window.location.reload()
      } else {
        showAlert('Failed to generate client access', 'error')
      }
    } catch (error) {
      console.error('Error generating client access:', error)
      showAlert('Failed to generate client access', 'error')
    } finally {
      setIsGeneratingAccess(false)
    }
  }

  // Disable client access
  const disableClientAccess = async () => {
    try {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/project/${projectId}/client-access`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })

      if (response.ok) {
        setClientAccessData(null)
        setShowClientPortalModal(false)
        // Refresh project data to show updated status
        window.location.reload()
      } else {
        showAlert('Failed to disable client access', 'error')
      }
    } catch (error) {
      console.error('Error disabling client access:', error)
      showAlert('Failed to disable client access', 'error')
    }
  }

  // Copy URL to clipboard
  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      showAlert('Link copied to clipboard!', 'success')
    } catch (error) {
      console.error('Failed to copy:', error)
      showAlert('Failed to copy link', 'error')
    }
  }

  const { data: project, isLoading, refetch } = useQuery({
    queryKey: ['project', projectId],
    queryFn: () => fetchProject(projectId),
    enabled: !!projectId
  })

  // Handle project update
  const handleProjectUpdate = (updatedProject: any) => {
    refetch()
  }

  // Fetch unread message count
  const { data: unreadData } = useQuery({
    queryKey: ['unread-messages', projectId],
    queryFn: async () => {
      const token = document.cookie
        .split('; ')
        .find(row => row.startsWith('auth-token='))
        ?.split('=')[1]
      
      const response = await fetch(`/api/project/${projectId}/messages/unread`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Cookie': document.cookie
        }
      })
      if (response.ok) {
        const data = await response.json()
        return data
      }
      return { unreadCount: 0 }
    },
    enabled: !!projectId,
    refetchInterval: 30000 // Check for new messages every 30 seconds
  })

  useEffect(() => {
    if (unreadData?.unreadCount !== undefined) {
      setUnreadMessageCount(unreadData.unreadCount)
    }
  }, [unreadData])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: FileText },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'estimates', name: 'Estimates', icon: FileText },
    { id: 'files', name: 'Files', icon: FileText },
    { id: 'messages', name: 'Messages', icon: MessageSquare, count: unreadMessageCount },
  ]

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Project Not Found</h2>
        <p className="text-gray-600 mb-4">The project you're looking for doesn't exist or you don't have access to it.</p>
        <Link href="/dashboard/projects" className="text-primary-600 hover:text-primary-700">
          ← Back to Projects
        </Link>
      </div>
    )
  }

  const getProgressColor = (progress: number) => {
    if (progress >= 90) return 'bg-green-500'
    if (progress >= 70) return 'bg-blue-500'
    if (progress >= 50) return 'bg-yellow-500'
    return 'bg-red-500'
  }

  const progress = project.metrics?.progress || 0

  return (
    <div className="space-y-3">
      {/* Compact Header - Mobile Responsive */}
      <div className="bg-white p-3 rounded-lg shadow">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div className="flex items-start sm:items-center space-x-3">
            <Link 
              href="/dashboard/projects"
              className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-base sm:text-lg font-semibold text-gray-900 truncate">{project.title}</h1>
                <button
                  onClick={() => setShowEditModal(true)}
                  className="text-gray-400 hover:text-gray-600 p-1 hover:bg-gray-100 rounded flex-shrink-0"
                  title="Edit project details"
                >
                  <Edit3 className="h-4 w-4" />
                </button>
                <div className="flex gap-2">
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    project.priority === 'URGENT' ? 'bg-red-100 text-red-800' :
                    project.priority === 'HIGH' ? 'bg-orange-100 text-orange-800' :
                    project.priority === 'MEDIUM' ? 'bg-blue-100 text-blue-800' :
                    'bg-gray-100 text-gray-800'
                  }`}>
                    {project.priority}
                  </span>
                  <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                    project.status === 'ACTIVE' ? 'bg-green-100 text-green-800' :
                    project.status === 'COMPLETED' ? 'bg-blue-100 text-blue-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {project.status}
                  </span>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-2 sm:gap-4 text-xs text-gray-500 mt-1">
                {project.contactName && (
                  <span className="truncate">{project.contactName}</span>
                )}
                {project.projectAddress && (
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1 flex-shrink-0" />
                    <span className="truncate">
                      {project.projectCity || project.projectAddress}
                    </span>
                  </div>
                )}
                <div className="flex items-center space-x-2">
                  <span className="font-medium">{progress}%</span>
                  <div className="w-12 sm:w-16 bg-gray-200 rounded-full h-1.5">
                    <div
                      className={`h-1.5 rounded-full ${getProgressColor(progress)}`}
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Bold Action Buttons - Mobile Responsive */}
          <div className="flex flex-wrap sm:flex-nowrap gap-2 sm:space-x-2">
            <button 
              onClick={handleAddTask}
              className="bg-green-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-green-700 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-1 flex-1 sm:flex-initial">
              <Plus className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline">Add Task</span>
              <span className="sm:hidden">Task</span>
            </button>
            <button 
              onClick={handleNewEstimate}
              className="bg-blue-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-blue-700 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-1 flex-1 sm:flex-initial">
              <FileText className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span className="hidden sm:inline">New Estimate</span>
              <span className="sm:hidden">Estimate</span>
            </button>
            <button 
              onClick={handleTeamClick}
              className="bg-purple-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-purple-700 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-1 flex-1 sm:flex-initial">
              <Users className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
              <span>Team</span>
            </button>
            {/* Client Portal Dropdown */}
            <div className="relative portal-dropdown">
              <button 
                onClick={() => setShowPortalDropdown(!showPortalDropdown)}
                disabled={isGeneratingAccess}
                className="bg-orange-600 text-white px-3 py-1.5 sm:px-4 sm:py-2 rounded-md hover:bg-orange-700 disabled:bg-orange-400 font-semibold text-xs sm:text-sm flex items-center justify-center space-x-1 flex-1 sm:flex-initial">
                {isGeneratingAccess ? (
                  <div className="animate-spin rounded-full h-3.5 w-3.5 border-b-2 border-white"></div>
                ) : (
                  <ExternalLink className="h-3.5 sm:h-4 w-3.5 sm:w-4" />
                )}
                <span className="hidden sm:inline">Client Portal</span>
                <span className="sm:hidden">Portal</span>
                <ChevronDown className="h-3 w-3 ml-1" />
              </button>
              
              {showPortalDropdown && (
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg ring-1 ring-black ring-opacity-5 z-50">
                  <div className="py-1">
                    <button
                      onClick={() => {
                        setShowPortalDropdown(false)
                        handleClientPortal()
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <ExternalLink className="h-4 w-4" />
                      <span>Open Client Portal</span>
                    </button>
                    <button
                      onClick={() => {
                        setShowPortalDropdown(false)
                        setShowPortalSettingsModal(true)
                      }}
                      className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 flex items-center space-x-2"
                    >
                      <Settings className="h-4 w-4" />
                      <span>Portal Settings</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Compact Navigation Tabs - Settings Style */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`py-2 px-1 border-b-2 font-medium text-sm flex items-center space-x-2 ${
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.name}</span>
                {tab.count && tab.count > 0 && (
                  <span className="bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center ml-1">
                    {tab.count > 99 ? '99+' : tab.count}
                  </span>
                )}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div>
        {activeTab === 'overview' && <ProjectOverview project={project} onAddTask={handleAddTask} />}
        {activeTab === 'tasks' && <ProjectTasks projectId={projectId} shouldOpenAddModal={showAddTask} />}
        {activeTab === 'calendar' && <ProjectCalendar projectId={projectId} />}
        {activeTab === 'estimates' && <ProjectEstimates projectId={projectId} />}
        {activeTab === 'files' && <ProjectFiles projectId={projectId} />}
        {activeTab === 'messages' && <ProjectMessages projectId={projectId} />}
      </div>

      {/* Client Portal Modal */}
      {showClientPortalModal && clientAccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowClientPortalModal(false)} />
            
            <div className="relative bg-white rounded-lg shadow-xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Client Portal Access</h3>
                <button
                  onClick={() => setShowClientPortalModal(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <p className="text-sm text-gray-600 mb-2">
                    Share this link with your client to give them access to project updates:
                  </p>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={clientAccessData.clientUrl}
                      readOnly
                      className="flex-1 text-sm bg-gray-50 border border-gray-200 rounded px-3 py-2 text-gray-700"
                    />
                    <button
                      onClick={() => copyToClipboard(clientAccessData.clientUrl)}
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4" />
                    </button>
                    <a
                      href={clientAccessData.clientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-700 p-2"
                      title="Open client portal"
                    >
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-medium mb-1">What clients can see:</p>
                      <ul className="list-disc list-inside space-y-1 text-xs">
                        <li>Project overview and progress</li>
                        <li>Task status and completion</li>
                        <li>Project photos and documents</li>
                        <li>Estimates and milestones</li>
                        <li>Activity timeline</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between space-x-3">
                  <button
                    onClick={disableClientAccess}
                    className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 text-sm"
                  >
                    Disable Access
                  </button>
                  <button
                    onClick={() => setShowClientPortalModal(false)}
                    className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 text-sm"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Project Edit Modal */}
      {showEditModal && (
        <ProjectEditModal
          project={project}
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onSave={handleProjectUpdate}
        />
      )}

      {/* Project Team Modal */}
      {showTeamModal && (
        <ProjectTeamModal
          projectId={projectId}
          isOpen={showTeamModal}
          onClose={() => setShowTeamModal(false)}
          onTeamUpdate={() => refetch()}
        />
      )}

      {/* Portal Settings Modal */}
      {showPortalSettingsModal && (
        <PortalSettingsModal
          projectId={projectId}
          isOpen={showPortalSettingsModal}
          onClose={() => setShowPortalSettingsModal(false)}
          onSettingsUpdate={() => refetch()}
        />
      )}
    </div>
  )
}