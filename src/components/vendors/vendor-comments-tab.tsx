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
  AtSign
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

async function createComment(vendorId: string, data: { content: string, parentId?: string }) {
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
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const editInputRef = useRef<HTMLTextAreaElement>(null)
  const replyInputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()
  const { user: currentUser } = useAuthStore()

  const currentUserId = currentUser?.id || ''

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
    mutationFn: (data: { content: string, parentId?: string }) => createComment(vendorId, data),
    onSuccess: () => {
      toast.success('Comment added!')
      queryClient.invalidateQueries({ queryKey: ['vendor-comments', vendorId] })
      setNewComment('')
      setReplyContent('')
      setReplyingToId(null)
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
      createMutation.mutate({ content: newComment })
    }
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
    <div key={comment.id} className={`${isReply ? 'ml-10' : ''} mb-4`}>
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
                </div>

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

              {!isReply && (
                <button
                  onClick={() => setReplyingToId(comment.id)}
                  className="mt-2 text-xs text-gray-500 hover:text-gray-700 flex items-center space-x-1"
                >
                  <Reply className="h-3 w-3" />
                  <span>Reply</span>
                </button>
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
      <div className="bg-gray-50 p-4 rounded-lg relative">
        <div className="flex space-x-2">
          <textarea
            ref={commentInputRef}
            value={newComment}
            onChange={(e) => handleInputChange(e, setNewComment, 'new')}
            placeholder="Add a note about this vendor... Use @ to mention someone"
            className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
            rows={3}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey) {
                handleSubmitComment()
              }
            }}
          />
          <button
            onClick={handleSubmitComment}
            disabled={createMutation.isPending || !newComment.trim()}
            className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed self-end"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
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
        <div className="mt-2 text-xs text-gray-500">
          Press Ctrl+Enter to submit. Use @ to mention team members.
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
