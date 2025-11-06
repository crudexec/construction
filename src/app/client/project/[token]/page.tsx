'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { 
  Building,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  Mail,
  User,
  AlertCircle,
  TrendingUp,
  Activity,
  ChevronRight,
  Home,
  ListTodo,
  Camera,
  FolderOpen,
  MessageSquare,
  DollarSign,
  Target,
  Users,
  Briefcase
} from 'lucide-react'

interface ClientProjectData {
  project: {
    id: string
    title: string
    description?: string
    status: string
    priority: string
    stage: {
      name: string
      color: string
    }
    contactName?: string
    contactEmail?: string
    contactPhone?: string
    projectAddress?: string
    projectCity?: string
    projectState?: string
    projectZipCode?: string
    budget?: number
    startDate?: string
    endDate?: string
    createdAt: string
    updatedAt: string
  }
  company: {
    name: string
    logo?: string
    website?: string
    phone?: string
    email?: string
  }
  projectManager?: {
    firstName: string
    lastName: string
    email: string
    phone?: string
  }
  metrics: {
    totalTasks: number
    completedTasks: number
    overdueTasks: number
    progressPercentage: number
    totalDocuments: number
    totalImages: number
    totalEstimates: number
  }
  tasksByCategory: Array<{
    name: string
    color: string
    tasks: Array<{
      id: string
      title: string
      description?: string
      status: string
      priority: string
      dueDate?: string
      completedAt?: string
      assignee?: {
        firstName: string
        lastName: string
      }
    }>
  }>
  images: Array<{
    id: string
    name: string
    url: string
    createdAt: string
  }>
  documents: Array<{
    id: string
    name: string
    fileName: string
    fileSize: number
    mimeType: string
    url: string
    createdAt: string
  }>
  activities: Array<{
    id: string
    type: string
    description: string
    createdAt: string
    user: {
      firstName: string
      lastName: string
    }
  }>
  estimates: Array<{
    id: string
    estimateNumber: string
    title: string
    total: number
    status: string
    createdAt: string
  }>
}

export default function ClientPortalPage() {
  const params = useParams()
  const token = params.token as string
  const [projectData, setProjectData] = useState<ClientProjectData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState('overview')
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [isLoadingMessages, setIsLoadingMessages] = useState(false)

  useEffect(() => {
    fetchProjectData()
  }, [token])

  // Fetch messages when switching to messages tab
  useEffect(() => {
    if (activeTab === 'messages' && projectData) {
      fetchMessages()
    }
  }, [activeTab, projectData])

  const fetchProjectData = async () => {
    try {
      const response = await fetch(`/api/client/project/${token}`)
      if (!response.ok) {
        throw new Error('Project not found or access denied')
      }
      const data = await response.json()
      setProjectData(data)
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to load project')
    } finally {
      setLoading(false)
    }
  }

  const fetchMessages = async () => {
    setIsLoadingMessages(true)
    try {
      const response = await fetch(`/api/client/project/${token}/messages`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Error fetching messages:', error)
    } finally {
      setIsLoadingMessages(false)
    }
  }

  const sendMessage = async () => {
    if (!newMessage.trim() || isSending) return

    setIsSending(true)
    try {
      const response = await fetch(`/api/client/project/${token}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          content: newMessage,
          clientName: projectData?.project?.contactName,
          clientEmail: projectData?.project?.contactEmail
        })
      })

      if (response.ok) {
        setNewMessage('')
        fetchMessages() // Refresh messages
      } else {
        alert('Failed to send message')
      }
    } catch (error) {
      console.error('Error sending message:', error)
      alert('Failed to send message')
    } finally {
      setIsSending(false)
    }
  }

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'TODO': return 'bg-gray-100 text-gray-800'
      case 'IN_PROGRESS': return 'bg-yellow-100 text-yellow-800'
      case 'COMPLETED': return 'bg-green-100 text-green-800'
      case 'OVERDUE': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'LOW': return 'bg-gray-100 text-gray-800'
      case 'MEDIUM': return 'bg-blue-100 text-blue-800'
      case 'HIGH': return 'bg-orange-100 text-orange-800'
      case 'URGENT': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Loading your project...</p>
        </div>
      </div>
    )
  }

  if (error || !projectData) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-red-50 to-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto px-4">
          <AlertCircle className="h-20 w-20 text-red-500 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Access Denied</h1>
          <p className="text-gray-600 mb-4">
            {error || 'The project link may have expired or been disabled. Please contact your contractor for assistance.'}
          </p>
        </div>
      </div>
    )
  }

  const { project, company, projectManager, metrics, tasksByCategory, images, documents, activities, estimates } = projectData

  const tabs = [
    { id: 'overview', name: 'Overview', icon: Home },
    { id: 'tasks', name: 'Tasks', icon: ListTodo, count: metrics.totalTasks },
    { id: 'images', name: 'Photos', icon: Camera, count: metrics.totalImages },
    { id: 'documents', name: 'Documents', icon: FolderOpen, count: metrics.totalDocuments },
    { id: 'estimates', name: 'Estimates', icon: DollarSign, count: metrics.totalEstimates },
    { id: 'messages', name: 'Messages', icon: MessageSquare }
  ]

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                {company.logo ? (
                  <img src={company.logo} alt={company.name} className="h-12 w-12 rounded-lg object-cover" />
                ) : (
                  <div className="h-12 w-12 bg-blue-600 rounded-lg flex items-center justify-center">
                    <Building className="h-7 w-7 text-white" />
                  </div>
                )}
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{company.name}</h1>
                  <p className="text-sm text-gray-600">Project Portal</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-sm text-gray-500">Welcome,</p>
                <p className="font-semibold text-gray-900">{project.contactName || 'Client'}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Project Header */}
      <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-4 lg:mb-0">
              <h2 className="text-3xl font-bold mb-2">{project.title}</h2>
              {project.description && (
                <p className="text-blue-100 mb-4">{project.description}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 text-sm">
                {project.projectAddress && (
                  <div className="flex items-center">
                    <MapPin className="h-4 w-4 mr-1" />
                    <span>
                      {[project.projectAddress, project.projectCity, project.projectState].filter(Boolean).join(', ')}
                    </span>
                  </div>
                )}
                {project.startDate && (
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-1" />
                    <span>
                      Started: {new Date(project.startDate).toLocaleDateString()}
                      {project.endDate && ` • Due: ${new Date(project.endDate).toLocaleDateString()}`}
                    </span>
                  </div>
                )}
              </div>
            </div>
            
            {/* Progress Circle */}
            <div className="flex items-center space-x-6">
              <div className="relative">
                <svg className="w-24 h-24 transform -rotate-90">
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="rgba(255, 255, 255, 0.3)"
                    strokeWidth="8"
                    fill="none"
                  />
                  <circle
                    cx="48"
                    cy="48"
                    r="36"
                    stroke="white"
                    strokeWidth="8"
                    fill="none"
                    strokeDasharray={`${2 * Math.PI * 36}`}
                    strokeDashoffset={`${2 * Math.PI * 36 * (1 - metrics.progressPercentage / 100)}`}
                    className="transition-all duration-500"
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="text-center">
                    <span className="text-2xl font-bold">{metrics.progressPercentage}%</span>
                    <p className="text-xs text-blue-100">Complete</p>
                  </div>
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="text-sm">
                  <span className="text-blue-100">Total Tasks:</span>
                  <span className="ml-2 font-semibold">{metrics.totalTasks}</span>
                </div>
                <div className="text-sm">
                  <span className="text-blue-100">Completed:</span>
                  <span className="ml-2 font-semibold">{metrics.completedTasks}</span>
                </div>
                {metrics.overdueTasks > 0 && (
                  <div className="text-sm">
                    <span className="text-yellow-300">Overdue:</span>
                    <span className="ml-2 font-semibold">{metrics.overdueTasks}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex space-x-8 overflow-x-auto">
            {tabs.map((tab) => {
              const Icon = tab.icon
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap flex items-center space-x-2 ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-5 w-5" />
                  <span>{tab.name}</span>
                  {tab.count !== undefined && tab.count > 0 && (
                    <span className="ml-1 bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">
                      {tab.count}
                    </span>
                  )}
                </button>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Content Area */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Project Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Quick Stats */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <Target className="h-10 w-10 text-blue-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">Stage</p>
                      <p className="font-semibold" style={{ color: project.stage.color }}>
                        {project.stage.name}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <DollarSign className="h-10 w-10 text-green-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">Budget</p>
                      <p className="font-semibold">
                        ${project.budget?.toLocaleString() || 'TBD'}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <CheckCircle className="h-10 w-10 text-emerald-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">Completed</p>
                      <p className="font-semibold">{metrics.completedTasks} tasks</p>
                    </div>
                  </div>
                </div>
                
                <div className="bg-white rounded-lg shadow p-4">
                  <div className="flex items-center">
                    <FileText className="h-10 w-10 text-purple-500" />
                    <div className="ml-3">
                      <p className="text-sm text-gray-500">Documents</p>
                      <p className="font-semibold">{metrics.totalDocuments}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Activity */}
              <div className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                    <Activity className="h-5 w-5 mr-2" />
                    Recent Activity
                  </h3>
                </div>
                <div className="p-6">
                  <div className="space-y-4">
                    {activities.slice(0, 5).map((activity) => (
                      <div key={activity.id} className="flex items-start">
                        <div className="flex-shrink-0">
                          <div className="h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center">
                            <Activity className="h-4 w-4 text-blue-600" />
                          </div>
                        </div>
                        <div className="ml-3 flex-1">
                          <p className="text-sm text-gray-900">{activity.description}</p>
                          <div className="mt-1 flex items-center text-xs text-gray-500">
                            <span>{activity.user.firstName} {activity.user.lastName}</span>
                            <span className="mx-2">•</span>
                            <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div className="space-y-6">
              {/* Project Manager */}
              {projectManager && (
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Briefcase className="h-5 w-5 mr-2" />
                    Project Manager
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <p className="font-semibold text-gray-900">
                        {projectManager.firstName} {projectManager.lastName}
                      </p>
                    </div>
                    {projectManager.email && (
                      <a 
                        href={`mailto:${projectManager.email}`}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Mail className="h-4 w-4 mr-2" />
                        {projectManager.email}
                      </a>
                    )}
                    {projectManager.phone && (
                      <a 
                        href={`tel:${projectManager.phone}`}
                        className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                      >
                        <Phone className="h-4 w-4 mr-2" />
                        {projectManager.phone}
                      </a>
                    )}
                  </div>
                </div>
              )}

              {/* Company Contact */}
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                  <Building className="h-5 w-5 mr-2" />
                  Company Contact
                </h3>
                <div className="space-y-3">
                  {company.email && (
                    <a 
                      href={`mailto:${company.email}`}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Mail className="h-4 w-4 mr-2" />
                      {company.email}
                    </a>
                  )}
                  {company.phone && (
                    <a 
                      href={`tel:${company.phone}`}
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Phone className="h-4 w-4 mr-2" />
                      {company.phone}
                    </a>
                  )}
                  {company.website && (
                    <a 
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center text-sm text-blue-600 hover:text-blue-700"
                    >
                      <Building className="h-4 w-4 mr-2" />
                      Visit Website
                    </a>
                  )}
                </div>
              </div>

              {/* Need Help? */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
                <h4 className="font-semibold text-blue-900 mb-2">Need Help?</h4>
                <p className="text-sm text-blue-700 mb-3">
                  If you have any questions about your project, don't hesitate to reach out to your project manager.
                </p>
                <button className="w-full bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center justify-center">
                  <MessageSquare className="h-4 w-4 mr-2" />
                  Contact Support
                </button>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'tasks' && (
          <div className="space-y-6">
            {tasksByCategory.map((category) => (
              <div key={category.name} className="bg-white rounded-lg shadow">
                <div className="px-6 py-4 border-b border-gray-200">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                      <div 
                        className="w-4 h-4 rounded mr-2" 
                        style={{ backgroundColor: category.color }}
                      />
                      {category.name}
                    </h3>
                    <span className="text-sm text-gray-500">
                      {category.tasks.filter(t => t.status === 'COMPLETED').length}/{category.tasks.length} completed
                    </span>
                  </div>
                </div>
                <div className="p-6">
                  <div className="space-y-3">
                    {category.tasks.map((task) => (
                      <div key={task.id} className="flex items-start p-3 bg-gray-50 rounded-lg">
                        <div className="flex-shrink-0 mt-1">
                          {task.status === 'COMPLETED' ? (
                            <CheckCircle className="h-5 w-5 text-green-500" />
                          ) : task.status === 'IN_PROGRESS' ? (
                            <Clock className="h-5 w-5 text-yellow-500" />
                          ) : (
                            <div className="h-5 w-5 rounded-full border-2 border-gray-300" />
                          )}
                        </div>
                        <div className="ml-3 flex-1">
                          <div className="flex items-start justify-between">
                            <div>
                              <p className={`font-medium ${task.status === 'COMPLETED' ? 'line-through text-gray-500' : 'text-gray-900'}`}>
                                {task.title}
                              </p>
                              {task.description && (
                                <p className="text-sm text-gray-600 mt-1">{task.description}</p>
                              )}
                              <div className="flex items-center space-x-4 mt-2">
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(task.status)}`}>
                                  {task.status.replace('_', ' ')}
                                </span>
                                <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getPriorityColor(task.priority)}`}>
                                  {task.priority}
                                </span>
                                {task.assignee && (
                                  <span className="text-xs text-gray-500">
                                    Assigned to {task.assignee.firstName} {task.assignee.lastName}
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
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === 'images' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Camera className="h-5 w-5 mr-2" />
                Project Photos
              </h3>
            </div>
            <div className="p-6">
              {images.length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {images.map((image) => (
                    <div key={image.id} className="relative group">
                      <img 
                        src={image.url} 
                        alt={image.name}
                        className="w-full h-48 object-cover rounded-lg"
                      />
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-50 transition-all duration-200 rounded-lg flex items-center justify-center">
                        <a 
                          href={image.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="opacity-0 group-hover:opacity-100 bg-white text-gray-900 px-3 py-1 rounded-md text-sm font-medium"
                        >
                          View Full Size
                        </a>
                      </div>
                      <p className="mt-2 text-sm text-gray-600 truncate">{image.name}</p>
                      <p className="text-xs text-gray-500">
                        {new Date(image.createdAt).toLocaleDateString()}
                      </p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ImageIcon className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No images uploaded yet</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'documents' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <FolderOpen className="h-5 w-5 mr-2" />
                Project Documents
              </h3>
            </div>
            <div className="p-6">
              {documents.length > 0 ? (
                <div className="space-y-3">
                  {documents.map((doc) => (
                    <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center">
                        <FileText className="h-10 w-10 text-gray-400" />
                        <div className="ml-3">
                          <p className="font-medium text-gray-900">{doc.name}</p>
                          <p className="text-sm text-gray-500">
                            {formatFileSize(doc.fileSize)} • {new Date(doc.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                      </div>
                      <a 
                        href={doc.url}
                        download={doc.fileName}
                        className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 flex items-center text-sm"
                      >
                        <Download className="h-4 w-4 mr-1" />
                        Download
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <FileText className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No documents available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'estimates' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Project Estimates
              </h3>
            </div>
            <div className="p-6">
              {estimates.length > 0 ? (
                <div className="space-y-4">
                  {estimates.map((estimate) => (
                    <div key={estimate.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-semibold text-gray-900">{estimate.title}</h4>
                          <p className="text-sm text-gray-500">
                            Estimate #{estimate.estimateNumber} • {new Date(estimate.createdAt).toLocaleDateString()}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-gray-900">
                            ${estimate.total.toLocaleString()}
                          </p>
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            estimate.status === 'ACCEPTED' ? 'bg-green-100 text-green-800' :
                            estimate.status === 'SENT' ? 'bg-blue-100 text-blue-800' :
                            'bg-gray-100 text-gray-800'
                          }`}>
                            {estimate.status}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No estimates available</p>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <MessageSquare className="h-5 w-5 mr-2" />
                Project Messages
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Communicate with your project team
              </p>
            </div>
            
            {/* Messages List */}
            <div className="p-6">
              {isLoadingMessages ? (
                <div className="text-center py-8">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-2"></div>
                  <p className="text-gray-500">Loading messages...</p>
                </div>
              ) : messages.length > 0 ? (
                <div className="space-y-4 mb-6 max-h-96 overflow-y-auto">
                  {messages.map((message) => (
                    <div key={message.id} className={`flex ${message.isFromClient ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
                        message.isFromClient 
                          ? 'bg-blue-600 text-white' 
                          : 'bg-gray-100 text-gray-900'
                      }`}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs font-medium">
                            {message.isFromClient 
                              ? (message.clientName || 'You') 
                              : `${message.sender?.firstName} ${message.sender?.lastName}`
                            }
                          </span>
                          <span className={`text-xs ${message.isFromClient ? 'text-blue-100' : 'text-gray-500'}`}>
                            {new Date(message.createdAt).toLocaleDateString()} {new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-sm">{message.content}</p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 mb-6">
                  <MessageSquare className="h-12 w-12 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-500">No messages yet. Start a conversation!</p>
                </div>
              )}

              {/* Message Input */}
              <div className="border-t border-gray-200 pt-4">
                <div className="flex space-x-3">
                  <div className="flex-1">
                    <textarea
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type your message..."
                      className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                      rows={3}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          sendMessage()
                        }
                      }}
                    />
                  </div>
                  <div className="flex-shrink-0">
                    <button
                      onClick={sendMessage}
                      disabled={!newMessage.trim() || isSending}
                      className="h-full bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:bg-blue-400 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      {isSending ? (
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      ) : (
                        <span>Send</span>
                      )}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Press Enter to send, Shift+Enter for new line
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}