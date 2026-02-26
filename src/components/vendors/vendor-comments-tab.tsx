'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  Send,
  Edit2,
  Trash2,
  X,
  MoreVertical,
  Reply,
  AtSign,
  Pin,
  PinOff,
  Lock,
  Eye,
  Paperclip,
  FileText,
  Image,
  File,
  Download
} from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import toast from 'react-hot-toast'
import { useModal } from '@/components/ui/modal-provider'
import { useAuthStore } from '@/store/auth'

interface User {
  id: string
  firstName: string
  lastName: string
  email: string
  avatar?: string | null
}

interface Mention {
  id: string
  mentionedUser: User
  isRead: boolean
}

interface PinnedByUser {
  id: string
  firstName: string
  lastName: string
}

interface Attachment {
  id: string
  fileName: string
  fileSize: number
  mimeType: string
  url: string
  uploaderId: string
  createdAt: string
  uploader: {
    id: string
    firstName: string
    lastName: string
  }
}

interface Comment {
  id: string
  content: string
  vendorId: string
  authorId: string
  parentId?: string | null
  isEdited: boolean
  editedAt?: string | null
  createdAt: string
  updatedAt: string
  author: User
  mentions?: Mention[]
  replies?: Comment[]
  // Pin feature
  isPinned?: boolean
  pinnedAt?: string | null
  pinnedById?: string | null
  pinnedBy?: PinnedByUser | null
  // Private comments
  isPrivate?: boolean
  // Attachments
  attachments?: Attachment[]
}

interface VendorCommentsTabProps {
  vendorId: string
}

async function fetchVendorComments(vendorId: string): Promise<Comment[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/comments`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to fetch comments')
  return response.json()
}

async function fetchTeamMembers(): Promise<User[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/users', {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to fetch team members')
  return response.json()
}

async function createComment(vendorId: string, data: { content: string, parentId?: string, isPrivate?: boolean }) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify(data),
  })
  if (!response.ok) throw new Error('Failed to create comment')
  return response.json()
}

async function togglePinComment(commentId: string, action: 'pin' | 'unpin') {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/comments/${commentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ action }),
  })
  if (!response.ok) throw new Error(`Failed to ${action} comment`)
  return response.json()
}

async function updateComment(commentId: string, content: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/comments/${commentId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error('Failed to update comment')
  return response.json()
}

async function deleteComment(commentId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to delete comment')
  return response.json()
}

async function uploadAttachment(commentId: string, file: File) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const formData = new FormData()
  formData.append('file', file)

  const response = await fetch(`/api/vendors/comments/${commentId}/attachments`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`
    },
    body: formData
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(error.error || 'Failed to upload attachment')
  }
  return response.json()
}

async function deleteAttachment(commentId: string, attachmentId: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/comments/${commentId}/attachments?attachmentId=${attachmentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to delete attachment')
  return response.json()
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return bytes + ' B'
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB'
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB'
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return Image
  if (mimeType === 'application/pdf') return FileText
  return File
}

export function VendorCommentsTab({ vendorId }: VendorCommentsTabProps) {
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const [replyingToId, setReplyingToId] = useState<string | null>(null)
  const [replyContent, setReplyContent] = useState('')
  const [showMentions, setShowMentions] = useState(false)
  const [mentionSearch, setMentionSearch] = useState('')
  const [cursorPosition, setCursorPosition] = useState(0)
  const [activeInput, setActiveInput] = useState<'new' | 'edit' | 'reply'>('new')
  const [isPrivateComment, setIsPrivateComment] = useState(false)
  const [pendingFiles, setPendingFiles] = useState<File[]>([])
  const [uploadingCommentId, setUploadingCommentId] = useState<string | null>(null)
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()
  const { user: currentUser } = useAuthStore()

  const currentUserId = currentUser?.id || ''
  const isAdmin = currentUser?.role === 'ADMIN'

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['vendor-comments', vendorId],
    queryFn: () => fetchVendorComments(vendorId),
    enabled: !!vendorId
  })

  const { data: teamMembers = [] } = useQuery({
    queryKey: ['team-members'],
    queryFn: fetchTeamMembers
  })

  const createMutation = useMutation({
    mutationFn: (data: { content: string, parentId?: string, isPrivate?: boolean }) => createComment(vendorId, data),
    onSuccess: async (comment) => {
      // Upload any pending files to the new comment
      if (pendingFiles.length > 0) {
        for (const file of pendingFiles) {
          try {
            await uploadAttachment(comment.id, file)
          } catch (err) {
            console.error('Failed to upload attachment:', err)
          }
        }
        setPendingFiles([])
      }
      toast.success('Comment added!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
      setNewComment('')
      setReplyContent('')
      setReplyingToId(null)
      setIsPrivateComment(false)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string, content: string }) => updateComment(id, content),
    onSuccess: () => {
      toast.success('Comment updated!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
      setEditingCommentId(null)
      setEditingContent('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update comment')
    }
  })

  const deleteMutation = useMutation({
    mutationFn: deleteComment,
    onSuccess: () => {
      toast.success('Comment deleted!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
    }
  })

  const pinMutation = useMutation({
    mutationFn: ({ commentId, action }: { commentId: string, action: 'pin' | 'unpin' }) =>
      togglePinComment(commentId, action),
    onSuccess: (_, { action }) => {
      toast.success(action === 'pin' ? 'Comment pinned!' : 'Comment unpinned!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to update comment')
    }
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: ({ commentId, file }: { commentId: string, file: File }) =>
      uploadAttachment(commentId, file),
    onSuccess: () => {
      toast.success('File uploaded!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
      setUploadingCommentId(null)
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to upload file')
      setUploadingCommentId(null)
    }
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: ({ commentId, attachmentId }: { commentId: string, attachmentId: string }) =>
      deleteAttachment(commentId, attachmentId),
    onSuccess: () => {
      toast.success('Attachment deleted!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete attachment')
    }
  })

  const handleMention = (user: User) => {
    const mention = `@[${user.firstName} ${user.lastName}](${user.id})`
    let content = ''
    let setContent: (val: string) => void
    let inputRef: React.RefObject<HTMLTextAreaElement | null>

    if (activeInput === 'new') {
      content = newComment
      setContent = setNewComment
      inputRef = commentInputRef
    } else if (activeInput === 'edit') {
      content = editingContent
      setContent = setEditingContent
      inputRef = editInputRef
    } else {
      content = replyContent
      setContent = setReplyContent
      inputRef = replyInputRef
    }

    // Find the @ symbol position
    const lastAtSymbol = content.lastIndexOf('@', cursorPosition - 1)
    if (lastAtSymbol !== -1) {
      const beforeMention = content.substring(0, lastAtSymbol)
      const afterMention = content.substring(cursorPosition)
      const newContent = beforeMention + mention + ' ' + afterMention
      setContent(newContent)

      // Reset mention state
      setShowMentions(false)
      setMentionSearch('')

      // Focus back to input
      setTimeout(() => {
        inputRef.current?.focus()
        const newPosition = beforeMention.length + mention.length + 1
        inputRef.current?.setSelectionRange(newPosition, newPosition)
      }, 0)
    }
  }

  const handleInputChange = (
    e: React.ChangeEvent<HTMLTextAreaElement>,
    setContent: (val: string) => void,
    inputType: 'new' | 'edit' | 'reply'
  ) => {
    const value = e.target.value
    setContent(value)
    setActiveInput(inputType)

    const cursorPos = e.target.selectionStart
    setCursorPosition(cursorPos)

    // Check for @ symbol
    const lastAtSymbol = value.lastIndexOf('@', cursorPos - 1)
    if (lastAtSymbol !== -1 && cursorPos > lastAtSymbol) {
      const searchTerm = value.substring(lastAtSymbol + 1, cursorPos).toLowerCase()
      // Don't show if there's a space after @, unless it's the start of typing
      if (!searchTerm.includes(' ') && !searchTerm.includes('[')) {
        setMentionSearch(searchTerm)
        setShowMentions(true)
      } else {
        setShowMentions(false)
      }
    } else {
      setShowMentions(false)
    }
  }

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      createMutation.mutate({
        content: newComment,
        isPrivate: isAdmin && isPrivateComment
      })
    }
  }

  const handleTogglePin = (comment: Comment) => {
    pinMutation.mutate({
      commentId: comment.id,
      action: comment.isPinned ? 'unpin' : 'pin'
    })
  }

  const handleSubmitReply = () => {
    if (replyContent.trim() && replyingToId) {
      createMutation.mutate({ content: replyContent, parentId: replyingToId })
    }
  }

  const handleEditComment = (comment: Comment) => {
    setEditingCommentId(comment.id)
    setEditingContent(comment.content)
  }

  const handleUpdateComment = () => {
    if (editingContent.trim() && editingCommentId) {
      updateMutation.mutate({ id: editingCommentId, content: editingContent })
    }
  }

  const handleDeleteComment = async (commentId: string) => {
    try {
      const confirmed = await showConfirm(
        'Are you sure you want to delete this comment? This action cannot be undone.',
        'Delete Comment'
      )

      if (confirmed) {
        deleteMutation.mutate(commentId)
      }
    } catch {
      // User cancelled
    }
  }

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    const maxSize = 10 * 1024 * 1024 // 10MB

    const validFiles = files.filter(file => {
      if (file.size > maxSize) {
        toast.error(`${file.name} exceeds 10MB limit`)
        return false
      }
      return true
    })

    setPendingFiles(prev => [...prev, ...validFiles])
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const removePendingFile = (index: number) => {
    setPendingFiles(prev => prev.filter((_, i) => i !== index))
  }

  const handleUploadToComment = (commentId: string, file: File) => {
    setUploadingCommentId(commentId)
    uploadAttachmentMutation.mutate({ commentId, file })
  }

  const handleDeleteAttachment = async (commentId: string, attachmentId: string) => {
    try {
      const confirmed = await showConfirm(
        'Are you sure you want to delete this attachment?',
        'Delete Attachment'
      )
      if (confirmed) {
        deleteAttachmentMutation.mutate({ commentId, attachmentId })
      }
    } catch {
      // User cancelled
    }
  }

  const renderFormattedContent = (content: string) => {
    // Replace mentions with styled spans
    return content.replace(/@\[([^\]]+)\]\(([^)]+)\)/g, (_, name) => {
      return `<span class="text-blue-600 font-medium">@${name}</span>`
    })
  }

  const filteredMembers = teamMembers.filter((member: User) => {
    const fullName = `${member.firstName} ${member.lastName}`.toLowerCase()
    return fullName.includes(mentionSearch.toLowerCase())
  })

  const renderComment = (comment: Comment, isReply = false) => (
    <div
      key={comment.id}
      className={`${isReply ? 'ml-10' : ''} mb-4 ${
        comment.isPinned ? 'bg-amber-50 border-l-4 border-amber-400 pl-3 py-2 rounded-r-lg' : ''
      } ${comment.isPrivate ? 'bg-purple-50 border-l-4 border-purple-400 pl-3 py-2 rounded-r-lg' : ''}`}
    >
      {/* Pinned indicator */}
      {comment.isPinned && !isReply && (
        <div className="flex items-center space-x-1 text-xs text-amber-600 mb-2">
          <Pin className="h-3 w-3" />
          <span>
            Pinned{comment.pinnedBy ? ` by ${comment.pinnedBy.firstName} ${comment.pinnedBy.lastName}` : ''}
          </span>
        </div>
      )}

      {/* Private indicator */}
      {comment.isPrivate && (
        <div className="flex items-center space-x-1 text-xs text-purple-600 mb-2">
          <Lock className="h-3 w-3" />
          <span>Admin only - Private comment</span>
        </div>
      )}

      <div className="flex space-x-3">
        <div className="flex-shrink-0">
          {comment.author.avatar ? (
            <img
              src={comment.author.avatar}
              alt={`${comment.author.firstName} ${comment.author.lastName}`}
              className="h-8 w-8 rounded-full object-cover"
            />
          ) : (
            <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center">
              <span className="text-xs font-medium text-primary-600">
                {comment.author.firstName[0]}{comment.author.lastName[0]}
              </span>
            </div>
          )}
        </div>

        <div className="flex-1">
          {editingCommentId === comment.id ? (
            <div className="space-y-2 relative">
              <textarea
                ref={editInputRef}
                value={editingContent}
                onChange={(e) => handleInputChange(e, setEditingContent, 'edit')}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
              />
              {showMentions && activeInput === 'edit' && filteredMembers.length > 0 && (
                <div className="absolute bottom-full mb-2 left-0 w-64 max-h-48 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200 z-10">
                  <div className="py-2">
                    {filteredMembers.map((member: User) => (
                      <button
                        key={member.id}
                        onClick={() => handleMention(member)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2"
                      >
                        <AtSign className="h-4 w-4 text-gray-400" />
                        <span className="text-sm">
                          {member.firstName} {member.lastName}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <div className="flex space-x-2">
                <button
                  onClick={handleUpdateComment}
                  disabled={updateMutation.isPending}
                  className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700 text-sm"
                >
                  Update
                </button>
                <button
                  onClick={() => {
                    setEditingCommentId(null)
                    setEditingContent('')
                    setShowMentions(false)
                  }}
                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="font-medium text-sm text-gray-900">
                      {comment.author.firstName} {comment.author.lastName}
                    </span>
                    <span className="text-xs text-gray-500">
                      {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                    </span>
                    {comment.isEdited && (
                      <span className="text-xs text-gray-400">(edited)</span>
                    )}
                  </div>
                  <div
                    className="mt-1 text-sm text-gray-700 whitespace-pre-wrap"
                    dangerouslySetInnerHTML={{ __html: renderFormattedContent(comment.content) }}
                  />

                  {/* Attachments */}
                  {comment.attachments && comment.attachments.length > 0 && (
                    <div className="mt-2 space-y-1">
                      {comment.attachments.map((attachment) => {
                        const FileIcon = getFileIcon(attachment.mimeType)
                        const isImage = attachment.mimeType.startsWith('image/')
                        return (
                          <div
                            key={attachment.id}
                            className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md group"
                          >
                            {isImage ? (
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-shrink-0"
                              >
                                <img
                                  src={attachment.url}
                                  alt={attachment.fileName}
                                  className="h-12 w-12 object-cover rounded"
                                />
                              </a>
                            ) : (
                              <FileIcon className="h-5 w-5 text-gray-400 flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <a
                                href={attachment.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs font-medium text-primary-600 hover:text-primary-700 truncate block"
                              >
                                {attachment.fileName}
                              </a>
                              <span className="text-xs text-gray-400">
                                {formatFileSize(attachment.fileSize)}
                              </span>
                            </div>
                            <div className="flex items-center space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={attachment.url}
                                download={attachment.fileName}
                                className="p-1 text-gray-400 hover:text-gray-600 rounded"
                                title="Download"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                              {(attachment.uploaderId === currentUserId || isAdmin) && (
                                <button
                                  onClick={() => handleDeleteAttachment(comment.id, attachment.id)}
                                  className="p-1 text-gray-400 hover:text-red-600 rounded"
                                  title="Delete"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )}
                </div>

                <div className="flex items-center space-x-1">
                  {/* Pin/Unpin button - visible for top-level comments only */}
                  {!isReply && (
                    <button
                      onClick={() => handleTogglePin(comment)}
                      disabled={pinMutation.isPending}
                      className={`p-1.5 rounded hover:bg-gray-100 ${
                        comment.isPinned ? 'text-amber-500' : 'text-gray-400 hover:text-gray-600'
                      }`}
                      title={comment.isPinned ? 'Unpin comment' : 'Pin comment'}
                    >
                      {comment.isPinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
                    </button>
                  )}

                  {/* Edit/Delete dropdown - only for author */}
                  {comment.authorId === currentUserId && (
                    <div className="relative group">
                      <button className="p-1 rounded hover:bg-gray-100">
                        <MoreVertical className="h-4 w-4 text-gray-400" />
                      </button>
                      <div className="absolute right-0 mt-1 w-32 bg-white rounded-md shadow-lg border border-gray-200 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
                        <button
                          onClick={() => handleEditComment(comment)}
                          className="block w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                        >
                          <Edit2 className="inline h-3 w-3 mr-2" />
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteComment(comment.id)}
                          className="block w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-gray-50"
                        >
                          <Trash2 className="inline h-3 w-3 mr-2" />
                          Delete
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {!isReply && (
                <div className="mt-2 flex items-center space-x-3">
                  <button
                    onClick={() => setReplyingToId(comment.id)}
                    className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                  >
                    <Reply className="h-3 w-3" />
                    <span>Reply</span>
                  </button>

                  {/* Attach file to existing comment */}
                  <label className="text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1 cursor-pointer">
                    <Paperclip className="h-3 w-3" />
                    <span>Attach</span>
                    <input
                      type="file"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0]
                        if (file) {
                          if (file.size > 10 * 1024 * 1024) {
                            toast.error('File exceeds 10MB limit')
                            return
                          }
                          handleUploadToComment(comment.id, file)
                        }
                        e.target.value = ''
                      }}
                      disabled={uploadingCommentId === comment.id}
                    />
                  </label>

                  {uploadingCommentId === comment.id && (
                    <span className="text-xs text-gray-400">Uploading...</span>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Reply input */}
      {replyingToId === comment.id && (
        <div className="ml-11 mt-3 relative">
          <div className="flex space-x-2">
            <textarea
              ref={replyInputRef}
              value={replyContent}
              onChange={(e) => handleInputChange(e, setReplyContent, 'reply')}
              placeholder="Write a reply... Use @ to mention someone"
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
              rows={2}
            />
            <div className="flex flex-col space-y-2">
              <button
                onClick={handleSubmitReply}
                disabled={createMutation.isPending}
                className="px-3 py-1 bg-primary-600 text-white rounded-md hover:bg-primary-700"
              >
                <Send className="h-4 w-4" />
              </button>
              <button
                onClick={() => {
                  setReplyingToId(null)
                  setReplyContent('')
                  setShowMentions(false)
                }}
                className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md hover:bg-gray-300"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          {showMentions && activeInput === 'reply' && filteredMembers.length > 0 && (
            <div className="absolute bottom-full mb-2 left-0 w-64 max-h-48 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200 z-10">
              <div className="py-2">
                {filteredMembers.map((member: User) => (
                  <button
                    key={member.id}
                    onClick={() => handleMention(member)}
                    className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2"
                  >
                    <AtSign className="h-4 w-4 text-gray-400" />
                    <span className="text-sm">
                      {member.firstName} {member.lastName}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Render replies */}
      {comment.replies && comment.replies.length > 0 && (
        <div className="ml-11 mt-3 space-y-3">
          {comment.replies.map(reply => renderComment(reply, true))}
        </div>
      )}
    </div>
  )

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <MessageCircle className="h-5 w-5 text-gray-500" />
          <h3 className="text-lg font-medium text-gray-900">
            Internal Comments ({comments.length})
          </h3>
        </div>
        <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
          Only visible to your team
        </span>
      </div>

      {/* New comment input */}
      <div className={`p-4 rounded-lg relative ${isPrivateComment ? 'bg-purple-50 border border-purple-200' : 'bg-gray-50'}`}>
        <div className="flex space-x-2">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => handleInputChange(e, setNewComment, 'new')}
            placeholder={isPrivateComment
              ? "Add a private admin-only note..."
              : "Add a note about this vendor... Use @ to mention someone"
            }
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmitComment()
              }
            }}
          />
          <div className="flex flex-col space-y-2">
            <button
              onClick={handleSubmitComment}
              disabled={createMutation.isPending || !newComment.trim()}
              className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
            <label className="px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-100 cursor-pointer flex items-center justify-center">
              <Paperclip className="h-4 w-4" />
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={handleFileSelect}
              />
            </label>
          </div>
        </div>

        {/* Pending files preview */}
        {pendingFiles.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {pendingFiles.map((file, index) => {
              const FileIcon = getFileIcon(file.type)
              return (
                <div
                  key={index}
                  className="flex items-center space-x-2 px-2 py-1 bg-white border border-gray-200 rounded-md text-xs"
                >
                  <FileIcon className="h-4 w-4 text-gray-400" />
                  <span className="max-w-[150px] truncate">{file.name}</span>
                  <span className="text-gray-400">{formatFileSize(file.size)}</span>
                  <button
                    onClick={() => removePendingFile(index)}
                    className="text-gray-400 hover:text-red-500"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
              )
            })}
          </div>
        )}
        {showMentions && activeInput === 'new' && filteredMembers.length > 0 && (
          <div className="absolute bottom-full mb-2 left-4 w-64 max-h-48 overflow-y-auto bg-white rounded-md shadow-lg border border-gray-200 z-10">
            <div className="py-2">
              {filteredMembers.map((member: User) => (
                <button
                  key={member.id}
                  onClick={() => handleMention(member)}
                  className="w-full text-left px-3 py-2 hover:bg-gray-50 flex items-center space-x-2"
                >
                  <AtSign className="h-4 w-4 text-gray-400" />
                  <span className="text-sm">
                    {member.firstName} {member.lastName}
                  </span>
                  <span className="text-xs text-gray-500">
                    {member.email}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        <div className="mt-2 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            Press Ctrl+Enter to submit. Use @ to mention team members.
          </div>

          {/* Private comment toggle - Admin only */}
          {isAdmin && (
            <button
              onClick={() => setIsPrivateComment(!isPrivateComment)}
              className={`flex items-center space-x-1.5 px-2 py-1 rounded text-xs transition-colors ${
                isPrivateComment
                  ? 'bg-purple-100 text-purple-700 border border-purple-300'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
              title={isPrivateComment ? 'Make visible to all team members' : 'Make private (admin only)'}
            >
              {isPrivateComment ? (
                <>
                  <Lock className="h-3 w-3" />
                  <span>Private</span>
                </>
              ) : (
                <>
                  <Eye className="h-3 w-3" />
                  <span>Visible to team</span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Comments list */}
      <div className="space-y-4 max-h-[500px] overflow-y-auto">
        {comments.map((comment: Comment) => renderComment(comment))}

        {comments.length === 0 && (
          <div className="text-center py-12 bg-gray-50 rounded-lg">
            <MessageCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
            <p className="text-sm text-gray-500">No comments yet.</p>
            <p className="text-xs text-gray-400 mt-1">Add notes about this vendor for your team.</p>
          </div>
        )}
      </div>
    </div>
  )
}
