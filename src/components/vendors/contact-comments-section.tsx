'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  MessageCircle,
  Send,
  Edit2,
  Trash2,
  MoreVertical
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

interface ContactComment {
  id: string
  content: string
  contactId: string
  authorId: string
  isEdited: boolean
  editedAt?: string | null
  createdAt: string
  updatedAt: string
  author: User
}

interface ContactCommentsSectionProps {
  vendorId: string
  contactId: string
}

async function fetchContactComments(vendorId: string, contactId: string): Promise<ContactComment[]> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/contacts/${contactId}/comments`, {
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to fetch comments')
  return response.json()
}

async function createComment(vendorId: string, contactId: string, content: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/${vendorId}/contacts/${contactId}/comments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    body: JSON.stringify({ content }),
  })
  if (!response.ok) throw new Error('Failed to create comment')
  return response.json()
}

async function updateComment(commentId: string, content: string) {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/vendors/contacts/comments/${commentId}`, {
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

  const response = await fetch(`/api/vendors/contacts/comments/${commentId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${token}`
    }
  })
  if (!response.ok) throw new Error('Failed to delete comment')
  return response.json()
}

export function ContactCommentsSection({ vendorId, contactId }: ContactCommentsSectionProps) {
  const [newComment, setNewComment] = useState('')
  const [editingCommentId, setEditingCommentId] = useState<string | null>(null)
  const [editingContent, setEditingContent] = useState('')
  const commentInputRef = useRef<HTMLTextAreaElement>(null)
  const queryClient = useQueryClient()
  const { showConfirm } = useModal()
  const { user: currentUser } = useAuthStore()

  const currentUserId = currentUser?.id || ''

  const { data: comments = [], isLoading } = useQuery({
    queryKey: ['contact-comments', vendorId, contactId],
    queryFn: () => fetchContactComments(vendorId, contactId),
    enabled: !!vendorId && !!contactId
  })

  const createMutation = useMutation({
    mutationFn: (content: string) => createComment(vendorId, contactId, content),
    onSuccess: () => {
      toast.success('Comment added!')
      queryClient.invalidateQueries({ queryKey: ['contact-comments', vendorId, contactId] })
      setNewComment('')
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to add comment')
    }
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, content }: { id: string, content: string }) => updateComment(id, content),
    onSuccess: () => {
      toast.success('Comment updated!')
      queryClient.invalidateQueries({ queryKey: ['contact-comments', vendorId, contactId] })
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
      queryClient.invalidateQueries({ queryKey: ['contact-comments', vendorId, contactId] })
    },
    onError: (error) => {
      toast.error(error instanceof Error ? error.message : 'Failed to delete comment')
    }
  })

  const handleSubmitComment = () => {
    if (newComment.trim()) {
      createMutation.mutate(newComment)
    }
  }

  const handleEditComment = (comment: ContactComment) => {
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

  const renderComment = (comment: ContactComment) => (
    <div key={comment.id} className="mb-4">
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
            <div className="space-y-2">
              <textarea
                value={editingContent}
                onChange={(e) => setEditingContent(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500"
                rows={3}
              />
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
                  <p className="mt-1 text-sm text-gray-700 whitespace-pre-wrap">
                    {comment.content}
                  </p>
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
            </>
          )}
        </div>
      </div>
    </div>
  )

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow border">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Notes</h2>
        </div>
        <div className="p-6 flex justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <MessageCircle className="h-5 w-5 text-gray-500" />
            <h2 className="text-lg font-medium text-gray-900">
              Notes ({comments.length})
            </h2>
          </div>
          <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
            Only visible to your team
          </span>
        </div>
      </div>
      <div className="p-6">
        {/* New comment input */}
        <div className="bg-gray-50 p-4 rounded-lg mb-4">
          <div className="flex space-x-2">
            <textarea
              ref={commentInputRef}
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder="Add a note about this contact..."
              className="flex-1 px-3 py-2 border border-gray-300 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary-500 bg-white"
              rows={2}
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
          <div className="mt-2 text-xs text-gray-500">
            Press Ctrl+Enter to submit.
          </div>
        </div>

        {/* Comments list */}
        <div className="space-y-4 max-h-[400px] overflow-y-auto">
          {comments.map((comment) => renderComment(comment))}

          {comments.length === 0 && (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
              <MessageCircle className="h-10 w-10 text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">No notes yet.</p>
              <p className="text-xs text-gray-400 mt-1">Add internal notes about this contact.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
