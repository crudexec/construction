'use client'

import { useState, useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useParams, useRouter, useSearchParams } from 'next/navigation'
import { motion, AnimatePresence } from 'framer-motion'
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
  Calculator,
  Clock,
  Check,
  X,
  DollarSign
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
import { ProjectFinancial } from '@/components/projects/project-financial'
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
  const taskIdFromUrl = searchParams.get('taskId')
  const initialTab = tabFromUrl && ['overview', 'tasks', 'timeline', 'calendar', 'files', 'messages', 'bids', 'vendors', 'milestones', 'boq', 'reports'].includes(tabFromUrl)
    ? tabFromUrl
    : 'overview'

  const [activeTab, setActiveTab] = useState(initialTab)
  const [openTaskId, setOpenTaskId] = useState<string | null>(taskIdFromUrl)
  const [showAddTask, setShowAddTask] = useState(false)
  const [showTeamModal, setShowTeamModal] = useState(false)
  const [showClientPortalModal, setShowClientPortalModal] = useState(false)
  const [showPortalSettingsModal, setShowPortalSettingsModal] = useState(false)
  const [showPortalDropdown, setShowPortalDropdown] = useState(false)
  const [clientAccessData, setClientAccessData] = useState<any>(null)
  const [isGeneratingAccess, setIsGeneratingAccess] = useState(false)
  const [unreadMessageCount, setUnreadMessageCount] = useState(0)
  const [showEditModal, setShowEditModal] = useState(false)
  const [copiedToClipboard, setCopiedToClipboard] = useState(false)

  useEffect(() => {
    const tabFromUrl = searchParams.get('tab')
    const taskIdFromUrl = searchParams.get('taskId')

    if (tabFromUrl && ['overview', 'tasks', 'timeline', 'calendar', 'files', 'messages', 'bids', 'vendors', 'milestones', 'boq', 'reports'].includes(tabFromUrl)) {
      setActiveTab(tabFromUrl)
    }

    // If there's a taskId, switch to tasks tab and set openTaskId
    if (taskIdFromUrl) {
      setActiveTab('tasks')
      setOpenTaskId(taskIdFromUrl)
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
      setCopiedToClipboard(true)
      setTimeout(() => setCopiedToClipboard(false), 2000)
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
    { id: 'overview', name: 'Overview', icon: Layers },
    { id: 'milestones', name: 'Milestones', icon: Target },
    { id: 'tasks', name: 'Tasks', icon: CheckSquare },
    { id: 'timeline', name: 'Timeline', icon: BarChart3 },
    { id: 'calendar', name: 'Calendar', icon: Calendar },
    { id: 'boq', name: 'BOQ', icon: Calculator },
    { id: 'financial', name: 'Financial', icon: DollarSign },
    { id: 'files', name: 'Files', icon: FileText },
    { id: 'messages', name: 'Messages', icon: MessageSquare, count: unreadMessageCount },
    { id: 'vendors', name: 'Vendors', icon: Truck },
    { id: 'reports', name: 'Reports', icon: TrendingUp },
  ]

  // Loading State
  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="flex flex-col items-center gap-6"
        >
          {/* Animated construction icon */}
          <div className="relative">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/25">
              <Building2 className="w-8 h-8 text-white" />
            </div>
            <motion.div
              className="absolute inset-0 rounded-2xl border-2 border-amber-500/50"
              animate={{ scale: [1, 1.2, 1], opacity: [1, 0, 1] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>
          <div className="text-center">
            <p className="text-slate-600 font-medium">Loading project...</p>
            <p className="text-slate-400 text-sm mt-1">Fetching the latest data</p>
          </div>
        </motion.div>
      </div>
    )
  }

  // Not Found State
  if (!project) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <AlertCircle className="h-10 w-10 text-slate-400" />
          </div>
          <h2 className="text-2xl font-bold text-slate-900 mb-3">Project Not Found</h2>
          <p className="text-slate-500 mb-8 leading-relaxed">
            The project you're looking for doesn't exist or you don't have access to it.
          </p>
          <Link
            href="/dashboard/projects"
            className="inline-flex items-center gap-2 bg-slate-900 text-white px-6 py-3 rounded-xl font-semibold hover:bg-slate-800 transition-all hover:shadow-lg hover:shadow-slate-900/20 hover:-translate-y-0.5"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Projects
          </Link>
        </motion.div>
      </div>
    )
  }

  const progress = project.metrics?.progress || 0
  const totalTasks = project.metrics?.totalTasks || 0
  const completedTasks = project.metrics?.completedTasks || 0
  const inProgressTasks = totalTasks - completedTasks

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'ACTIVE': return {
        bg: 'bg-emerald-500',
        text: 'text-emerald-700',
        light: 'bg-emerald-50',
        ring: 'ring-emerald-500/20',
        label: 'Active',
        icon: Clock
      }
      case 'COMPLETED': return {
        bg: 'bg-blue-500',
        text: 'text-blue-700',
        light: 'bg-blue-50',
        ring: 'ring-blue-500/20',
        label: 'Completed',
        icon: Check
      }
      case 'ON_HOLD': return {
        bg: 'bg-amber-500',
        text: 'text-amber-700',
        light: 'bg-amber-50',
        ring: 'ring-amber-500/20',
        label: 'On Hold',
        icon: Clock
      }
      case 'CANCELLED': return {
        bg: 'bg-red-500',
        text: 'text-red-700',
        light: 'bg-red-50',
        ring: 'ring-red-500/20',
        label: 'Cancelled',
        icon: X
      }
      default: return {
        bg: 'bg-slate-500',
        text: 'text-slate-700',
        light: 'bg-slate-50',
        ring: 'ring-slate-500/20',
        label: status,
        icon: Clock
      }
    }
  }

  const getPriorityConfig = (priority: string) => {
    switch (priority) {
      case 'URGENT': return { color: 'text-red-500', bg: 'bg-red-500', label: 'Urgent' }
      case 'HIGH': return { color: 'text-orange-500', bg: 'bg-orange-500', label: 'High' }
      case 'MEDIUM': return { color: 'text-amber-500', bg: 'bg-amber-500', label: 'Medium' }
      default: return { color: 'text-slate-400', bg: 'bg-slate-400', label: 'Low' }
    }
  }

  const statusConfig = getStatusConfig(project.status)
  const priorityConfig = getPriorityConfig(project.priority)
  const StatusIcon = statusConfig.icon

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Compact Header */}
      <header className="relative bg-slate-900">
        {/* Subtle background */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900" />
        <div className="absolute inset-0 opacity-[0.02]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '24px 24px'
        }} />

        {/* Top accent */}
        <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-amber-500 to-transparent" />

        <div className="relative px-4 sm:px-6 lg:px-8">
          {/* Main Header Row */}
          <div className="py-4 flex items-center gap-4">
            {/* Back Button */}
            <Link
              href="/dashboard/projects"
              className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all flex-shrink-0"
            >
              <ArrowLeft className="h-4 w-4" />
            </Link>

            {/* Title & Meta - Flexible */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 mb-1">
                <motion.h1
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="text-lg sm:text-xl font-bold text-white truncate"
                >
                  {project.title}
                </motion.h1>

                {/* Status Badge */}
                <span className={`hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${statusConfig.light} ${statusConfig.text} flex-shrink-0`}>
                  <StatusIcon className="w-2.5 h-2.5" />
                  {statusConfig.label}
                </span>

                {/* Priority Dot */}
                <span className={`w-2 h-2 rounded-full ${priorityConfig.bg} flex-shrink-0`} title={`${priorityConfig.label} Priority`} />
              </div>

              {/* Compact Meta Row */}
              <div className="flex items-center gap-4 text-xs text-slate-400">
                {project.contactName && (
                  <span className="flex items-center gap-1.5 truncate">
                    <Building2 className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{project.contactName}</span>
                  </span>
                )}
                {(project.projectCity || project.projectAddress) && (
                  <span className="hidden md:flex items-center gap-1.5 truncate">
                    <MapPin className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span className="truncate">{project.projectCity || project.projectAddress}</span>
                  </span>
                )}
                {project.startDate && (
                  <span className="hidden lg:flex items-center gap-1.5">
                    <Calendar className="h-3 w-3 text-slate-500 flex-shrink-0" />
                    <span>
                      {new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      {project.endDate && ` - ${new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Quick Stats - Desktop */}
            <div className="hidden lg:flex items-center gap-6 px-6 border-l border-white/10">
              {/* Progress */}
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-2xl font-bold text-white tabular-nums">{progress}</span>
                  <span className="text-sm text-slate-400">%</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Progress</span>
              </div>

              {/* Tasks */}
              <div className="text-center">
                <div className="flex items-baseline justify-center gap-0.5">
                  <span className="text-2xl font-bold text-white tabular-nums">{completedTasks}</span>
                  <span className="text-sm text-slate-400">/{totalTasks}</span>
                </div>
                <span className="text-[10px] uppercase tracking-wider text-slate-500">Tasks</span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setShowEditModal(true)}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                title="Edit project"
              >
                <Edit3 className="h-4 w-4" />
              </motion.button>

              <div className="relative portal-dropdown">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setShowPortalDropdown(!showPortalDropdown)}
                  disabled={isGeneratingAccess}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-white font-semibold text-sm transition-all"
                >
                  {isGeneratingAccess ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                    />
                  ) : (
                    <Settings className="h-4 w-4" />
                  )}
                  <ChevronDown className={`h-3 w-3 transition-transform ${showPortalDropdown ? 'rotate-180' : ''}`} />
                </motion.button>

                <AnimatePresence>
                  {showPortalDropdown && (
                    <motion.div
                      initial={{ opacity: 0, y: 8, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-48 bg-white rounded-xl shadow-2xl ring-1 ring-black/5 z-50 overflow-hidden"
                    >
                      <div className="p-1">
                        {[
                          { icon: Users, label: 'Manage Team', onClick: () => { setShowPortalDropdown(false); handleTeamClick() } },
                          { icon: ExternalLink, label: 'Client Portal', onClick: () => { setShowPortalDropdown(false); handleClientPortal() } },
                          { icon: Settings, label: 'Portal Settings', onClick: () => { setShowPortalDropdown(false); setShowPortalSettingsModal(true) } },
                        ].map((item, idx) => (
                          <button
                            key={idx}
                            onClick={item.onClick}
                            className="w-full text-left px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 rounded-lg flex items-center gap-2.5 transition-colors"
                          >
                            <item.icon className="h-4 w-4 text-slate-400" />
                            <span>{item.label}</span>
                          </button>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <nav className="flex gap-1 overflow-x-auto scrollbar-hide border-t border-white/5 -mb-px">
            {tabs.map((tab) => {
              const Icon = tab.icon
              const isActive = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`relative flex items-center gap-1.5 px-3 py-2.5 text-sm font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Icon className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">{tab.name}</span>
                  {tab.count && tab.count > 0 && (
                    <span className="bg-red-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full min-w-[16px] text-center">
                      {tab.count}
                    </span>
                  )}
                  {isActive && (
                    <motion.div
                      layoutId="activeTab"
                      className="absolute bottom-0 left-0 right-0 h-0.5 bg-amber-500"
                    />
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative">
        <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 pb-24 lg:pb-8">
          <div className="max-w-6xl mx-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeTab}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
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
                {activeTab === 'tasks' && <ProjectTasks projectId={projectId} shouldOpenAddModal={showAddTask} openTaskId={openTaskId} />}
                {activeTab === 'timeline' && <ProjectTimeline projectId={projectId} />}
                {activeTab === 'calendar' && <ProjectCalendar projectId={projectId} />}
                {activeTab === 'files' && <ProjectFiles projectId={projectId} />}
                {activeTab === 'messages' && <ProjectMessages projectId={projectId} />}
                {activeTab === 'vendors' && <ProjectVendors projectId={projectId} />}
                {activeTab === 'milestones' && <ProjectMilestones projectId={projectId} />}
                {activeTab === 'boq' && <ProjectBOQ projectId={projectId} />}
                {activeTab === 'financial' && <ProjectFinancial projectId={projectId} project={project} />}
                {activeTab === 'reports' && <ProgressReport projectId={projectId} />}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      {/* Client Portal Modal */}
      <AnimatePresence>
        {showClientPortalModal && clientAccessData && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
                onClick={() => setShowClientPortalModal(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-md w-full overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                        <ExternalLink className="w-5 h-5 text-white" />
                      </div>
                      <h3 className="text-lg font-semibold text-white">Client Portal Access</h3>
                    </div>
                    <button
                      onClick={() => setShowClientPortalModal(false)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6 space-y-5">
                  <div>
                    <p className="text-sm text-slate-600 mb-3">
                      Share this link with your client to give them access to project updates:
                    </p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 font-mono text-xs text-slate-600 truncate">
                        {clientAccessData.clientUrl}
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => copyToClipboard(clientAccessData.clientUrl)}
                        className={`p-3 rounded-xl transition-all ${
                          copiedToClipboard
                            ? 'bg-emerald-100 text-emerald-600'
                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
                        }`}
                        title="Copy link"
                      >
                        {copiedToClipboard ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      </motion.button>
                      <motion.a
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        href={clientAccessData.clientUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-3 bg-amber-500 hover:bg-amber-400 rounded-xl transition-colors shadow-lg shadow-amber-500/20"
                        title="Open client portal"
                      >
                        <ExternalLink className="h-4 w-4 text-white" />
                      </motion.a>
                    </div>
                  </div>

                  {/* Info box */}
                  <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <Eye className="h-4 w-4 text-blue-600" />
                      </div>
                      <div className="text-sm">
                        <p className="font-semibold text-blue-900 mb-2">What clients can see:</p>
                        <ul className="space-y-1.5 text-blue-700">
                          {['Project overview and progress', 'Task status and completion', 'Photos and documents', 'Milestones'].map((item, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-1 h-1 bg-blue-500 rounded-full" />
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex gap-3 pt-2">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={disableClientAccess}
                      className="flex-1 bg-red-50 text-red-600 border border-red-200 px-4 py-3 rounded-xl hover:bg-red-100 text-sm font-semibold transition-colors"
                    >
                      Disable Access
                    </motion.button>
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => setShowClientPortalModal(false)}
                      className="flex-1 bg-slate-900 text-white px-4 py-3 rounded-xl hover:bg-slate-800 text-sm font-semibold transition-colors shadow-lg shadow-slate-900/20"
                    >
                      Done
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

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
