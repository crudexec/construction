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
  AlertCircle,
  ExternalLink,
  Eye,
  Copy,
  MessageSquare,
  Edit3,
  ChevronDown,
  Settings,
  BarChart3,
  Truck,
  Target,
  TrendingUp,
  Layers,
  Building2,
  Calculator
} from 'lucide-react'
import Link from 'next/link'
import { ProjectOverview } from '@/components/projects/project-overview'
import { ProjectTasks } from '@/components/projects/project-tasks'
import { ProjectFiles } from '@/components/projects/project-files'
import { ProjectCalendar } from '@/components/projects/project-calendar'
import { ProjectMessages } from '@/components/projects/project-messages'
import { ProjectTimeline } from '@/components/projects/project-timeline'
import { ProjectEditModal } from '@/components/projects/project-edit-modal'
import { ProjectTeamModal } from '@/components/projects/project-team-modal'
import { PortalSettingsModal } from '@/components/projects/portal-settings-modal'
import { ProgressReport } from '@/components/projects/progress-report'
import { ProjectVendors } from '@/components/projects/project-vendors'
import { ProjectMilestones } from '@/components/projects/project-milestones'
import { ProjectBOQ } from '@/components/projects/project-boq'
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

  const tabFromUrl = searchParams.get('tab')
  const initialTab = tabFromUrl && ['overview', 'tasks', 'timeline', 'calendar', 'files', 'messages', 'bids', 'vendors', 'milestones', 'boq', 'reports'].includes(tabFromUrl)
    ? tabFromUrl
    : 'overview'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showClientPortalModal, setShowClientPortalModal] = useState(false)
  const [showPortalSettingsModal, setShowPortalSettingsModal] = useState(false)
  const [showPortalDropdown, setShowPortalDropdown] = useState(false)
  const [clientAccessData, setClientAccessData] = useState<any>(null)
  const [isGeneratingAccess, setIsGeneratingAccess] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    if (tabFromUrl && ['overview', 'tasks', 'timeline', 'calendar', 'files', 'messages', 'bids', 'vendors', 'milestones', 'boq', 'reports'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }
  }, [searchParams])

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId)
    const newUrl = new URL(window.location.href)
    newUrl.searchParams.set('tab', tabId)
    router.push(newUrl.pathname + newUrl.search, { scroll: false })
  }

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

  const handleAddTask = () => {
    handleTabChange('tasks')
    setShowAddTask(true)
    setTimeout(() => setShowAddTask(false), 100)
  }


  const handleTeamClick = () => {
    setShowTeamModal(true)
  }

  const handleClientPortal = async () => {
    const customFields = JSON.parse(project.customFields || '{}')
    if (customFields.clientAccessEnabled && customFields.clientAccessToken) {
      setClientAccessData({
        clientUrl: `${window.location.origin}/client/project/${customFields.clientAccessToken}`,
        clientToken: customFields.clientAccessToken,
        enabled: true
      })
      setShowClientPortalModal(true)
    } else {
      await generateClientAccess()
    }
  }

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
        window.location.reload()
      } else {
        showAlert('Failed to disable client access', 'error')
      }
    } catch (error) {
      console.error('Error disabling client access:', error)
      showAlert('Failed to disable client access', 'error')
    }
  }

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

  const handleProjectUpdate = (updatedProject: any) => {
    refetch()
  }

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
    refetchInterval: 30000
  })

  useEffect(() => {
    if (unreadData?.unreadCount !== undefined) {
      setUnreadMessageCount(unreadData.unreadCount)
    }
  }, [unreadData])

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Layers, color: 'text-slate-600' },
    { id: 'milestones', name: 'Milestones', icon: Target, color: 'text-amber-600' },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare, color: 'text-blue-600' },
    { id: 'timeline', name: 'Timeline', icon: BarChart3, color: 'text-purple-600' },
    { id: 'calendar', name: 'Calendar', icon: Calendar, color: 'text-rose-600' },
    { id: 'boq', name: 'BOQ', icon: Calculator, color: 'text-purple-600' },
    { id: 'files', name: 'Files', icon: FileText, color: 'text-cyan-600' },
    { id: 'messages', name: 'Messages', icon: MessageSquare, color: 'text-indigo-600', count: unreadMessageCount },
    { id: 'vendors', name: 'Vendors', icon: Truck, color: 'text-teal-600' },
    { id: 'reports', name: 'Reports', icon: TrendingUp, color: 'text-pink-600' },
  ]

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="w-8 h-8 border-3 border-slate-200 rounded-full animate-spin border-t-orange-500"></div>
      </div>
    )
  }

  if (!project) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
        <div className="text-center max-w-md px-6">
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-800 mb-3">Project Not Found</h2>
          <p className="text-slate-500 mb-6">The project you're looking for doesn't exist or you don't have access to it.</p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 bg-slate-800 text-white px-6 py-3 rounded-lg font-medium hover:bg-slate-700 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </div>
      </div>
    )
  }

  const progress = project.metrics?.progress || 0
  const totalTasks = project.metrics?.totalTasks || 0
  const completedTasks = project.metrics?.completedTasks || 0
  const inProgressTasks = totalTasks - completedTasks

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE': return { bg: 'bg-emerald-500', text: 'text-emerald-500', light: 'bg-emerald-50', label: 'Active' }
      case 'COMPLETED': return { bg: 'bg-blue-500', text: 'text-blue-500', light: 'bg-blue-50', label: 'Completed' }
      case 'ON_HOLD': return { bg: 'bg-amber-500', text: 'text-amber-500', light: 'bg-amber-50', label: 'On Hold' }
      default: return { bg: 'bg-slate-500', text: 'text-slate-500', light: 'bg-slate-50', label: status }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'URGENT': return { bg: 'bg-red-500', dot: 'bg-red-500', label: 'Urgent' }
      case 'HIGH': return { bg: 'bg-orange-500', dot: 'bg-orange-500', label: 'High' }
      case 'MEDIUM': return { bg: 'bg-blue-500', dot: 'bg-blue-500', label: 'Medium' }
      default: return { bg: 'bg-slate-400', dot: 'bg-slate-400', label: 'Low' }
    }
  }

  const statusConfig = getStatusConfig(project.status)
  const priorityConfig = getPriorityConfig(project.priority)

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Hero Header */}
      <div className="relative bg-gradient-to-br from-slate-800 via-slate-900 to-slate-800 overflow-hidden">
        {/* Blueprint Grid Pattern */}
        <div className="absolute inset-0 opacity-5">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
                <path d="M 40 0 L 0 0 0 40" fill="none" stroke="white" strokeWidth="0.5"/>
              </pattern>
            </defs>
            <rect width="100%" height="100%" fill="url(#grid)" />
          </svg>
        </div>

        {/* Accent Line */}
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-500 via-amber-500 to-orange-500"></div>

        <div className="relative px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
          {/* Back Button & Actions Row */}
          <div className="flex items-center justify-between mb-6">
            <Link
              href="/dashboard/projects"
              className="group flex items-center gap-2 text-slate-400 hover:text-white transition-colors"
            >
              <div className="p-2 rounded-lg bg-white/5 group-hover:bg-white/10 transition-colors">
                <ArrowLeft className="h-4 w-4" />
              </div>
              <span className="text-sm font-medium hidden sm:inline">All Projects</span>
            </Link>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title="Edit project"
              >
                <Edit3 className="h-4 w-4" />
              </button>

              <div className="relative portal-dropdown">
                <button
                  onClick={() => setShowPortalDropdown(!showPortalDropdown)}
                  disabled={isGeneratingAccess}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg bg-orange-500 hover:bg-orange-400 text-white font-medium text-sm transition-all shadow-lg shadow-orange-500/20"
                >
                  {isGeneratingAccess ? (
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></div>
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  <span className="hidden sm:inline">Options</span>
                  <ChevronDown className="h-3 w-3" />
                </button>

                {showPortalDropdown && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
                    <div className="p-1">
                      <button
                        onClick={() => { setShowPortalDropdown(false); handleTeamClick() }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <Users className="h-4 w-4 text-slate-400" />
                        <span>Manage Team</span>
                      </button>
                      <button
                        onClick={() => { setShowPortalDropdown(false); handleClientPortal() }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <ExternalLink className="h-4 w-4 text-slate-400" />
                        <span>Client Portal</span>
                      </button>
                      <button
                        onClick={() => { setShowPortalDropdown(false); setShowPortalSettingsModal(true) }}
                        className="w-full text-left px-4 py-3 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-3 transition-colors"
                      >
                        <Settings className="h-4 w-4 text-slate-400" />
                        <span>Portal Settings</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Project Title & Meta */}
          <div className="mb-8">
            <div className="flex flex-wrap items-center gap-3 mb-3">
              <div className={`w-2 h-2 rounded-full ${priorityConfig.dot} animate-pulse`}></div>
              <span className="text-xs font-semibold tracking-wider text-slate-400 uppercase">
                {priorityConfig.label} Priority
              </span>
              <span className="text-slate-600">|</span>
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold ${statusConfig.light} ${statusConfig.text}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${statusConfig.bg}`}></span>
                {statusConfig.label}
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-white mb-4 tracking-tight">
              {project.title}
            </h1>

            <div className="flex flex-wrap items-center gap-4 text-sm text-slate-400">
              {project.contactName && (
                <div className="flex items-center gap-2">
                  <Building2 className="h-4 w-4" />
                  <span>{project.contactName}</span>
                </div>
              )}
              {project.projectAddress && (
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  <span className="truncate max-w-[200px]">
                    {project.projectCity || project.projectAddress}
                    {project.projectState && `, ${project.projectState}`}
                  </span>
                </div>
              )}
              {project.startDate && (
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  <span>
                    {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                    {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`}
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Tabs Navigation - Flush to bottom */}
        <div className="px-4 sm:px-6 lg:px-8">
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-2 px-4 py-3 text-sm font-medium whitespace-nowrap transition-all border-b-2 ${
                    isActive
                      ? 'text-white border-orange-500 bg-white/5'
                      : 'text-slate-400 border-transparent hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-orange-400' : ''}`} />
                  <span>{tab.name}</span>
                  {tab.count && tab.count > 0 && (
                    <span className="bg-red-500 text-white text-xs px-1.5 py-0.5 rounded-full min-w-[20px] text-center">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Main Content */}
      <div className="bg-slate-50 min-h-[calc(100vh-300px)]">
        <main className="p-4 lg:p-6 pb-24 lg:pb-6">
          <div className="max-w-6xl mx-auto">
            {activeTab === 'overview' && (
              <ProjectOverview
                project={project}
                onAddTask={handleAddTask}
                onTeamClick={handleTeamClick}
                progress={progress}
                totalTasks={totalTasks}
                completedTasks={completedTasks}
                inProgressTasks={inProgressTasks}
              />
            )}
            {activeTab === 'tasks' && <ProjectTasks projectId={projectId} shouldOpenAddModal={showAddTask} />}
            {activeTab === 'timeline' && <ProjectTimeline projectId={projectId} />}
            {activeTab === 'calendar' && <ProjectCalendar projectId={projectId} />}
            {activeTab === 'files' && <ProjectFiles projectId={projectId} />}
            {activeTab === 'messages' && <ProjectMessages projectId={projectId} />}
            {activeTab === 'vendors' && <ProjectVendors projectId={projectId} />}
            {activeTab === 'milestones' && <ProjectMilestones projectId={projectId} />}
            {activeTab === 'boq' && <ProjectBOQ projectId={projectId} />}
            {activeTab === 'reports' && <ProgressReport projectId={projectId} />}
          </div>
        </main>
      </div>

      {/* Client Portal Modal */}
      {showClientPortalModal && clientAccessData && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex min-h-screen items-center justify-center p-4">
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setShowClientPortalModal(false)} />

            <div className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
              <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-white">Client Portal Access</h3>
                  <button
                    onClick={() => setShowClientPortalModal(false)}
                    className="text-slate-400 hover:text-white transition-colors"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-5">
                <div>
                  <p className="text-sm text-slate-600 mb-3">
                    Share this link with your client to give them access to project updates:
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      value={clientAccessData.clientUrl}
                      readOnly
                      className="flex-1 text-sm bg-slate-50 border border-slate-200 rounded-lg px-4 py-3 text-slate-700 font-mono text-xs"
                    />
                    <button
                      onClick={() => copyToClipboard(clientAccessData.clientUrl)}
                      className="p-3 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                      title="Copy link"
                    >
                      <Copy className="h-4 w-4 text-slate-600" />
                    </button>
                    <a
                      href={clientAccessData.clientUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-3 bg-orange-500 hover:bg-orange-600 rounded-lg transition-colors"
                      title="Open client portal"
                    >
                      <ExternalLink className="h-4 w-4 text-white" />
                    </a>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Eye className="h-5 w-5 text-blue-600 mt-0.5 flex-shrink-0" />
                    <div className="text-sm text-blue-800">
                      <p className="font-semibold mb-2">What clients can see:</p>
                      <ul className="space-y-1.5 text-blue-700">
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          Project overview and progress
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          Task status and completion
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          Photos and documents
                        </li>
                        <li className="flex items-center gap-2">
                          <span className="w-1 h-1 bg-blue-500 rounded-full"></span>
                          Milestones
                        </li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    onClick={disableClientAccess}
                    className="flex-1 bg-red-50 text-red-600 border border-red-200 px-4 py-2.5 rounded-lg hover:bg-red-100 text-sm font-medium transition-colors"
                  >
                    Disable Access
                  </button>
                  <button
                    onClick={() => setShowClientPortalModal(false)}
                    className="flex-1 bg-slate-900 text-white px-4 py-2.5 rounded-lg hover:bg-slate-800 text-sm font-medium transition-colors"
                  >
                    Done
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

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { transform: scale(0.95); }
          to { transform: scale(1); }
        }
        @keyframes slide-in-from-top-2 {
          from { transform: translateY(-8px); }
          to { transform: translateY(0); }
        }
        .animate-in {
          animation: fade-in 0.2s ease-out, zoom-in-95 0.2s ease-out;
        }
        .scrollbar-hide {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
        .scrollbar-hide::-webkit-scrollbar {
          display: none;
        }
        .safe-area-inset-bottom {
          padding-bottom: env(safe-area-inset-bottom);
        }
      `}</style>
    </div>
  )
}
