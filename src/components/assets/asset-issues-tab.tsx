'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, AlertCircle, MessageSquare, ChevronDown, ChevronUp, Upload, FileText, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { AssetIssueDialog } from './asset-issue-dialog'

interface Issue {
  id: string
  title: string
  description: string | null
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
  resolvedAt: string | null
  reportedBy: { id: string; firstName: string; lastName: string } | null
  reporterName: string | null
  resolvedBy: { id: string; firstName: string; lastName: string } | null
  meterReading: { id: string; readingType: 'HOURS' | 'MILES'; value: number; recordedAt: string } | null
  _count: { comments: number }
}

interface IssueDetail extends Issue {
  comments: { id: string; content: string; createdAt: string; author: { id: string; firstName: string; lastName: string } }[]
  attachments: {
    id: string
    fileName: string
    fileSize: number
    url: string
    createdAt: string
    uploadedBy: { id: string; firstName: string; lastName: string } | null
  }[]
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchIssues(assetId: string): Promise<Issue[]> {
  const response = await fetch(`/api/assets/${assetId}/issues`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch issues')
  return response.json()
}

async function fetchIssueDetail(issueId: string): Promise<IssueDetail> {
  const response = await fetch(`/api/assets/issues/${issueId}`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch issue')
  return response.json()
}

const STATUS_STYLES: Record<string, string> = {
  OPEN: 'bg-red-100 text-red-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  RESOLVED: 'bg-green-100 text-green-800',
  CLOSED: 'bg-gray-100 text-gray-800'
}

const URGENCY_STYLES: Record<string, string> = {
  LOW: 'bg-gray-100 text-gray-700',
  MEDIUM: 'bg-blue-100 text-blue-700',
  HIGH: 'bg-orange-100 text-orange-700',
  URGENT: 'bg-red-100 text-red-700'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function AssetIssuesTab({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [commentDraft, setCommentDraft] = useState('')
  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['asset-issues', assetId],
    queryFn: () => fetchIssues(assetId)
  })

  const { data: detail } = useQuery({
    queryKey: ['asset-issue-detail', expandedId],
    queryFn: () => fetchIssueDetail(expandedId as string),
    enabled: !!expandedId
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ issueId, status }: { issueId: string; status: string }) => {
      const response = await fetch(`/api/assets/issues/${issueId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ status })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update issue')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-issues', assetId] })
      queryClient.invalidateQueries({ queryKey: ['asset-issue-detail', expandedId] })
      queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const commentMutation = useMutation({
    mutationFn: async ({ issueId, content }: { issueId: string; content: string }) => {
      const response = await fetch(`/api/assets/issues/${issueId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ content })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to add comment')
      return result
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['asset-issue-detail', expandedId] })
      queryClient.invalidateQueries({ queryKey: ['asset-issues', assetId] })
      setCommentDraft('')
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const uploadAttachmentMutation = useMutation({
    mutationFn: async ({ issueId, file }: { issueId: string; file: File }) => {
      const formData = new FormData()
      formData.append('file', file)

      const response = await fetch(`/api/assets/issues/${issueId}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to upload attachment')
      return result
    },
    onSuccess: (_, variables) => {
      toast.success('Attachment uploaded')
      queryClient.invalidateQueries({ queryKey: ['asset-issue-detail', variables.issueId] })
      queryClient.invalidateQueries({ queryKey: ['asset-issues', assetId] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const deleteAttachmentMutation = useMutation({
    mutationFn: async ({ issueId, attachmentId }: { issueId: string; attachmentId: string }) => {
      const response = await fetch(`/api/assets/issues/${issueId}/attachments?attachmentId=${attachmentId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to delete attachment')
      return result
    },
    onSuccess: (_, variables) => {
      toast.success('Attachment deleted')
      queryClient.invalidateQueries({ queryKey: ['asset-issue-detail', variables.issueId] })
      queryClient.invalidateQueries({ queryKey: ['asset-issues', assetId] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border">
      <div className="px-6 py-4 border-b flex justify-between items-center">
        <h3 className="text-lg font-medium text-gray-900">Issues</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Log Issue
        </button>
      </div>

      {issues.length === 0 ? (
        <div className="text-center py-12">
          <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">No issues logged yet</p>
        </div>
      ) : (
        <div className="divide-y divide-gray-100">
          {issues.map((issue) => {
            const isExpanded = expandedId === issue.id
            return (
              <div key={issue.id}>
                <button
                  onClick={() => setExpandedId(isExpanded ? null : issue.id)}
                  className="w-full text-left px-6 py-4 hover:bg-gray-50 flex items-center justify-between gap-4"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900 truncate">{issue.title}</p>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${URGENCY_STYLES[issue.urgency]}`}>{issue.urgency}</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {issue.reportedBy ? `${issue.reportedBy.firstName} ${issue.reportedBy.lastName}` : issue.reporterName || 'Unknown'}
                      {' · '}{new Date(issue.createdAt).toLocaleDateString()}
                      {issue.meterReading && ` · ${issue.meterReading.value} ${issue.meterReading.readingType.toLowerCase()} at time of report`}
                      {issue._count.comments > 0 && (
                        <span className="inline-flex items-center gap-1 ml-2"><MessageSquare className="h-3 w-3" />{issue._count.comments}</span>
                      )}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[issue.status]}`}>{issue.status.replace('_', ' ')}</span>
                    {isExpanded ? <ChevronUp className="h-4 w-4 text-gray-400" /> : <ChevronDown className="h-4 w-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && (
                  <div className="px-6 pb-6 bg-gray-50 space-y-4">
                    {issue.description && <p className="text-sm text-gray-700">{issue.description}</p>}

                    <div className="flex items-center gap-2">
                      <span className="text-xs text-gray-500">Status:</span>
                      <select
                        value={issue.status}
                        onChange={(e) => updateStatusMutation.mutate({ issueId: issue.id, status: e.target.value })}
                        disabled={updateStatusMutation.isPending}
                        className="text-sm border border-gray-300 rounded-md px-2 py-1"
                      >
                        <option value="OPEN">Open</option>
                        <option value="IN_PROGRESS">In Progress</option>
                        <option value="RESOLVED">Resolved</option>
                        <option value="CLOSED">Closed</option>
                      </select>
                      {issue.resolvedBy && (
                        <span className="text-xs text-gray-400">
                          Resolved by {issue.resolvedBy.firstName} {issue.resolvedBy.lastName}
                        </span>
                      )}
                    </div>

                    <div>
                      <h4 className="text-xs font-semibold text-gray-500 uppercase mb-2">Comments</h4>
                      <div className="space-y-2 mb-3">
                        {detail?.id === issue.id && detail.comments.length > 0 ? (
                          detail.comments.map((c) => (
                            <div key={c.id} className="bg-white rounded-md border p-2 text-sm">
                              <p className="text-gray-800">{c.content}</p>
                              <p className="text-xs text-gray-400 mt-1">{c.author.firstName} {c.author.lastName} · {new Date(c.createdAt).toLocaleString()}</p>
                            </div>
                          ))
                        ) : (
                          <p className="text-xs text-gray-400">No comments yet</p>
                        )}
                      </div>
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={commentDraft}
                          onChange={(e) => setCommentDraft(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-1.5"
                        />
                        <button
                          onClick={() => commentDraft.trim() && commentMutation.mutate({ issueId: issue.id, content: commentDraft.trim() })}
                          disabled={commentMutation.isPending || !commentDraft.trim()}
                          className="text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-100 disabled:opacity-50"
                        >
                          Post
                        </button>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <h4 className="text-xs font-semibold text-gray-500 uppercase">Attachments</h4>
                        <label className="inline-flex items-center gap-1 text-xs bg-white border border-gray-300 text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100 cursor-pointer">
                          <Upload className="h-3 w-3" />
                          Upload
                          <input
                            type="file"
                            className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0]
                              if (file) uploadAttachmentMutation.mutate({ issueId: issue.id, file })
                              e.target.value = ''
                            }}
                          />
                        </label>
                      </div>
                      {detail?.id === issue.id && detail.attachments.length > 0 ? (
                        <div className="space-y-1">
                          {detail.attachments.map((attachment) => (
                            <div key={attachment.id} className="flex items-center justify-between bg-white rounded-md border px-2 py-1.5 text-sm">
                              <a href={attachment.url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-primary-600 hover:text-primary-800 min-w-0">
                                <FileText className="h-4 w-4 flex-shrink-0" />
                                <span className="truncate">{attachment.fileName}</span>
                              </a>
                              <div className="flex items-center gap-2 flex-shrink-0">
                                <span className="text-xs text-gray-400">{formatFileSize(attachment.fileSize)}</span>
                                <button
                                  onClick={() => deleteAttachmentMutation.mutate({ issueId: issue.id, attachmentId: attachment.id })}
                                  disabled={deleteAttachmentMutation.isPending}
                                  className="text-gray-400 hover:text-red-600"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-gray-400">No attachments yet</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      {showForm && <AssetIssueDialog assetId={assetId} close={() => setShowForm(false)} />}
    </div>
  )
}
