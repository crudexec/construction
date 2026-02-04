'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  X,
  Calendar,
  User,
  Tag,
  Clock,
  CheckCircle2,
  Circle,
  AlertCircle,
  PlayCircle,
  Paperclip,
  Upload,
  Trash2,
  FileText,
  Image,
  File,
  Download,
  MessageCircle,
  Send,
  Target,
  Building2
} from 'lucide-react'
import toast from 'react-hot-toast'
import { useVendorAuthStore } from '@/store/vendor-auth'

interface VendorTaskDetailModalProps {
  taskId: string | null
  isOpen: boolean
  onClose: () => void
  onStatusUpdate?: () => void
}

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  uploader?: {
    id: string
    firstName: string
    lastName: string
  }
  createdAt: string
}

interface Comment {
  id: string
  content: string
  authorId: string
  parentId?: string
  isEdited: boolean
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    email?: string
    avatar?: string
  }
  replies?: Comment[]
}

interface TaskDetail {
  id: string
  title: string
  description?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  dueDate?: string
  completedAt?: string
  createdAt: string
  category?: {
    name: string
    color: string
  }
  card?: {
    id: string
    title: string
    status: string
  }
  milestone?: {
    id: string
    title: string
    status: string
    targetDate?: string
  }
  assignee?: {
    id: string
    firstName: string
    lastName: string
    email: string
  }
  creator?: {
    id: string
    firstName: string
    lastName: string
  }
  vendor?: {
    id: string
    name: string
    companyName: string
  }
  attachments: Attachment[]
  dependsOn?: { id: string; title: string; status: string }[]
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes'
  const k = 1024
  const sizes = ['Bytes', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) {
    return <Image className="h-4 w-4 text-blue-500" />
  }
  if (mimeType.includes('pdf')) {
    return <FileText className="h-4 w-4 text-red-500" />
  }
  return <File className="h-4 w-4 text-gray-500" />
}

export function VendorTaskDetailModal({ taskId, isOpen, onClose, onStatusUpdate }: VendorTaskDetailModalProps) {
  const [activeTab, setActiveTab] = useState<'details' | 'attachments' | 'comments'>('details')
  const [isUploading, setIsUploading] = useState(false)
  const [newComment, setNewComment] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { token, vendor } = useVendorAuthStore()

  // Fetch task details
  const { data: task, isLoading, refetch } = useQuery({
    queryKey: ['vendor-task-detail', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/vendor-portal/tasks/${taskId}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch task')
      return response.json() as Promise<TaskDetail>
    },
    enabled: !!taskId && !!token && isOpen
  })

  // Fetch comments
  const { data: comments = [], refetch: refetchComments } = useQuery({
    queryKey: ['vendor-task-comments', taskId],
    queryFn: async () => {
      const response = await fetch(`/api/vendor-portal/tasks/${taskId}/comments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (!response.ok) throw new Error('Failed to fetch comments')
      return response.json() as Promise<Comment[]>
    },
    enabled: !!taskId && !!token && isOpen
  })

  // Update status mutation
  const statusMutation = useMutation({
    mutationFn: async (status: string) => {
      const response = await fetch(`/api/vendor-portal/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ status })
      })
      if (!response.ok) throw new Error('Failed to update task')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Task status updated')
      refetch()
      queryClient.invalidateQueries({ queryKey: ['vendor-tasks'] })
      queryClient.invalidateQueries({ queryKey: ['vendor-milestones'] })
      onStatusUpdate?.()
    },
    onError: () => {
      toast.error('Failed to update task status')
    }
  })

  // Upload attachment mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`/api/vendor-portal/tasks/${taskId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
        body: formData
      })
      if (!response.ok) {
        const result = await response.json()
        throw new Error(result.error || 'Failed to upload file')
      }
      return response.json()
    },
    onSuccess: () => {
      toast.success('File uploaded successfully')
      setIsUploading(false)
      refetch()
    },
    onError: (error: Error) => {
      toast.error(error.message)
      setIsUploading(false)
    }
  })

  // Create comment mutation
  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/vendor-portal/tasks/${taskId}/comments`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content })
      })
      if (!response.ok) throw new Error('Failed to create comment')
      return response.json()
    },
    onSuccess: () => {
      toast.success('Comment added')
      setNewComment('')
      refetchComments()
    },
    onError: () => {
      toast.error('Failed to add comment')
    }
  })

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be less than 10MB')
      return
    }

    setIsUploading(true)
    uploadMutation.mutate(file)

    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      commentMutation.mutate(newComment)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle2 className="h-5 w-5 text-green-600" />
      case 'IN_PROGRESS':
        return <PlayCircle className="h-5 w-5 text-blue-600" />
      case 'OVERDUE':
        return <AlertCircle className="h-5 w-5 text-red-600" />
      default:
        return <Circle className="h-5 w-5 text-gray-400" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-800'
      case 'OVERDUE':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'URGENT':
        return 'bg-red-100 text-red-800'
      case 'HIGH':
        return 'bg-orange-100 text-orange-800'
      case 'MEDIUM':
        return 'bg-blue-100 text-blue-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const renderFormattedContent = (content: string) => {
    return content.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (match, name) => {
      return `<span class="text-blue-600 font-medium">@${name}</span>`
    })
  }

  if (!isOpen || !taskId) return null

  if (isLoading) {
    return (
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="animate-pulse">
              <div className="h-6 bg-gray-200 rounded w-1/3 mb-4"></div>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!task) {
    return (
      <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
        <div className="flex min-h-screen items-center justify-center p-4">
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
          <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full p-6">
            <div className="text-center text-gray-500">
              <AlertCircle className="h-12 w-12 mx-auto mb-3" />
              <p>Task not found or access denied.</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="fixed inset-0 overflow-y-auto" style={{ zIndex: 10000 }}>
      <div className="flex min-h-screen items-center justify-center p-4">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />

        <div className="relative bg-white rounded-lg shadow-xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              {getStatusIcon(task.status)}
              <h3 className="text-lg font-semibold text-gray-900">{task.title}</h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
              <X className="h-6 w-6" />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-gray-200 px-6">
            <nav className="-mb-px flex space-x-6">
              <button
                onClick={() => setActiveTab('details')}
                className={`py-3 border-b-2 font-medium text-sm ${
                  activeTab === 'details'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                Details
              </button>
              <button
                onClick={() => setActiveTab('attachments')}
                className={`py-3 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'attachments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Paperclip className="h-4 w-4" />
                Attachments
                {(task.attachments?.length || 0) > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {task.attachments.length}
                  </span>
                )}
              </button>
              <button
                onClick={() => setActiveTab('comments')}
                className={`py-3 border-b-2 font-medium text-sm flex items-center gap-1 ${
                  activeTab === 'comments'
                    ? 'border-indigo-500 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <MessageCircle className="h-4 w-4" />
                Comments
                {comments.length > 0 && (
                  <span className="ml-1 px-1.5 py-0.5 bg-gray-100 text-gray-600 text-xs rounded-full">
                    {comments.length}
                  </span>
                )}
              </button>
            </nav>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1">
            {activeTab === 'details' && (
              <div className="space-y-6">
                {/* Status and Priority */}
                <div className="flex items-center space-x-4">
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(task.status)}`}>
                      {task.status.replace('_', ' ')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-medium text-gray-700">Priority:</span>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getPriorityColor(task.priority)}`}>
                      {task.priority}
                    </span>
                  </div>
                </div>

                {/* Description */}
                {task.description && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Description</h4>
                    <p className="text-gray-600 text-sm whitespace-pre-wrap">{task.description}</p>
                  </div>
                )}

                {/* Details Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Project */}
                  {task.card && (
                    <div className="flex items-center space-x-3">
                      <Building2 className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Project</div>
                        <div className="text-sm text-gray-600">{task.card.title}</div>
                      </div>
                    </div>
                  )}

                  {/* Milestone */}
                  {task.milestone && (
                    <div className="flex items-center space-x-3">
                      <Target className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Milestone</div>
                        <div className="text-sm text-gray-600">{task.milestone.title}</div>
                      </div>
                    </div>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="flex items-center space-x-3">
                      <Calendar className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Due Date</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(task.dueDate), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category */}
                  {task.category && (
                    <div className="flex items-center space-x-3">
                      <Tag className="h-5 w-5 text-gray-400" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Category</div>
                        <div className="flex items-center space-x-2">
                          <div
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: task.category.color }}
                          />
                          <span className="text-sm text-gray-600">{task.category.name}</span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Created Date */}
                  <div className="flex items-center space-x-3">
                    <Clock className="h-5 w-5 text-gray-400" />
                    <div>
                      <div className="text-sm font-medium text-gray-700">Created</div>
                      <div className="text-sm text-gray-600">
                        {format(new Date(task.createdAt), 'MMM dd, yyyy')}
                      </div>
                    </div>
                  </div>

                  {/* Completed Date */}
                  {task.completedAt && (
                    <div className="flex items-center space-x-3">
                      <CheckCircle2 className="h-5 w-5 text-green-500" />
                      <div>
                        <div className="text-sm font-medium text-gray-700">Completed</div>
                        <div className="text-sm text-gray-600">
                          {format(new Date(task.completedAt), 'MMM dd, yyyy')}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Dependencies */}
                {task.dependsOn && task.dependsOn.length > 0 && (
                  <div>
                    <h4 className="text-sm font-medium text-gray-700 mb-2">Dependencies</h4>
                    <div className="space-y-2">
                      {task.dependsOn.map((dep) => (
                        <div key={dep.id} className="flex items-center gap-2 p-2 bg-gray-50 rounded">
                          {dep.status === 'COMPLETED' ? (
                            <CheckCircle2 className="h-4 w-4 text-green-500" />
                          ) : (
                            <Circle className="h-4 w-4 text-gray-400" />
                          )}
                          <span className="text-sm text-gray-700">{dep.title}</span>
                          <span className={`text-xs px-2 py-0.5 rounded ${getStatusColor(dep.status)}`}>
                            {dep.status.replace('_', ' ')}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'attachments' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium text-gray-900 flex items-center gap-2">
                    <Paperclip className="h-4 w-4 text-purple-600" />
                    Attachments ({task.attachments?.length || 0})
                  </h4>
                  <label className="inline-flex items-center gap-1 px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 cursor-pointer">
                    <Upload className="h-4 w-4" />
                    Upload File
                    <input
                      ref={fileInputRef}
                      type="file"
                      className="hidden"
                      onChange={handleFileSelect}
                      disabled={isUploading}
                    />
                  </label>
                </div>

                {isUploading && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 rounded-lg">
                    <div className="animate-spin h-4 w-4 border-2 border-blue-600 border-t-transparent rounded-full" />
                    <span className="text-sm text-blue-700">Uploading...</span>
                  </div>
                )}

                {(!task.attachments || task.attachments.length === 0) && !isUploading ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg">
                    <Paperclip className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                    <p className="text-sm text-gray-500">No attachments yet</p>
                    <p className="text-xs text-gray-400 mt-1">Upload pictures or documents (max 10MB)</p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {task.attachments?.map((attachment) => (
                      <div
                        key={attachment.id}
                        className="flex items-center justify-between p-3 bg-gray-50 rounded-lg group"
                      >
                        <div className="flex items-center gap-3 min-w-0 flex-1">
                          {getFileIcon(attachment.mimeType)}
                          <div className="min-w-0 flex-1">
                            <a
                              href={attachment.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-sm font-medium text-gray-900 hover:text-indigo-600 truncate block"
                            >
                              {attachment.fileName}
                            </a>
                            <div className="flex items-center gap-2 text-xs text-gray-500">
                              <span>{formatFileSize(attachment.fileSize)}</span>
                              {attachment.uploader && (
                                <>
                                  <span>-</span>
                                  <span>{attachment.uploader.firstName} {attachment.uploader.lastName}</span>
                                </>
                              )}
                              <span>-</span>
                              <span>{format(new Date(attachment.createdAt), 'MMM dd')}</span>
                            </div>
                          </div>
                        </div>
                        <a
                          href={attachment.url}
                          download={attachment.fileName}
                          className="p-2 text-gray-400 hover:text-gray-600 opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'comments' && (
              <div className="space-y-4">
                <div className="flex items-center space-x-2 mb-4">
                  <MessageCircle className="h-5 w-5 text-gray-500" />
                  <h3 className="text-lg font-medium text-gray-900">
                    Comments ({comments.length})
                  </h3>
                </div>

                {/* Comments list */}
                <div className="space-y-4 max-h-64 overflow-y-auto">
                  {comments.map((comment) => (
                    <div key={comment.id} className="flex space-x-3">
                      <div className="flex-shrink-0">
                        <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center">
                          <span className="text-xs font-medium text-indigo-600">
                            {comment.author?.firstName?.[0] || 'V'}{comment.author?.lastName?.[0] || ''}
                          </span>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2">
                          <span className="font-medium text-sm text-gray-900">
                            {comment.author?.firstName} {comment.author?.lastName}
                          </span>
                          <span className="text-xs text-gray-500">
                            {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                          </span>
                          {comment.isEdited && (
                            <span className="text-xs text-gray-400">(edited)</span>
                          )}
                        </div>
                        <div
                          className="mt-1 text-sm text-gray-700"
                          dangerouslySetInnerHTML={{ __html: renderFormattedContent(comment.content) }}
                        />

                        {/* Replies */}
                        {comment.replies && comment.replies.length > 0 && (
                          <div className="ml-6 mt-3 space-y-3">
                            {comment.replies.map((reply) => (
                              <div key={reply.id} className="flex space-x-3">
                                <div className="flex-shrink-0">
                                  <div className="h-6 w-6 rounded-full bg-gray-100 flex items-center justify-center">
                                    <span className="text-xs font-medium text-gray-600">
                                      {reply.author?.firstName?.[0] || 'V'}{reply.author?.lastName?.[0] || ''}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex-1">
                                  <div className="flex items-center space-x-2">
                                    <span className="font-medium text-xs text-gray-900">
                                      {reply.author?.firstName} {reply.author?.lastName}
                                    </span>
                                    <span className="text-xs text-gray-500">
                                      {formatDistanceToNow(new Date(reply.createdAt), { addSuffix: true })}
                                    </span>
                                  </div>
                                  <div
                                    className="mt-1 text-sm text-gray-700"
                                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(reply.content) }}
                                  />
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}

                  {comments.length === 0 && (
                    <div className="text-center py-8">
                      <MessageCircle className="h-10 w-10 text-gray-400 mx-auto mb-3" />
                      <p className="text-sm text-gray-500">No comments yet. Be the first to comment!</p>
                    </div>
                  )}
                </div>

                {/* New comment input */}
                <div className="border-t pt-4">
                  <div className="flex space-x-2">
                    <textarea
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Write a comment..."
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      rows={3}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && e.ctrlKey) {
                          handleSubmitComment()
                        }
                      }}
                    />
                    <button
                      onClick={handleSubmitComment}
                      disabled={commentMutation.isPending || !newComment.trim()}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    Press Ctrl+Enter to submit
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
            <div className="flex items-center space-x-2">
              <span className="text-sm font-medium text-gray-700">Quick Actions:</span>
              {task.status !== 'COMPLETED' && (
                <button
                  onClick={() => statusMutation.mutate('COMPLETED')}
                  disabled={statusMutation.isPending}
                  className="inline-flex items-center px-3 py-1.5 border border-green-300 text-sm font-medium rounded-md text-green-700 bg-green-50 hover:bg-green-100 disabled:opacity-50"
                >
                  <CheckCircle2 className="h-4 w-4 mr-1" />
                  Mark Complete
                </button>
              )}
              {task.status === 'TODO' && (
                <button
                  onClick={() => statusMutation.mutate('IN_PROGRESS')}
                  disabled={statusMutation.isPending}
                  className="inline-flex items-center px-3 py-1.5 border border-blue-300 text-sm font-medium rounded-md text-blue-700 bg-blue-50 hover:bg-blue-100 disabled:opacity-50"
                >
                  <PlayCircle className="h-4 w-4 mr-1" />
                  Start Work
                </button>
              )}
            </div>

            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
