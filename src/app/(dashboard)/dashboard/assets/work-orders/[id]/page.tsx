'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { ArrowLeft, AlertCircle, Trash2, Upload, FileText, Link2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useCurrency } from '@/hooks/useCurrency'
import { DatePicker } from '@/components/ui/date-picker'
import { ImportSourceDetails } from '@/components/assets/import-source-details'

interface WorkOrderDetail {
  asset?: { id: string; name: string } | null
  sourceData?: unknown
  sourceCreatedByName?: string | null
  id: string
  title: string
  description: string | null
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string | null
  estimatedDuration: number | null
  actualDuration: number | null
  estimatedCost: number | null
  actualCost: number | null
  assignedTo: { id: string; firstName: string; lastName: string } | null
  createdBy: { id: string; firstName: string; lastName: string }
  issues: { issue: { id: string; title: string; status: string; asset: { id: string; name: string } } }[]
  comments: { id: string; content: string; createdAt: string; author: { id: string; firstName: string; lastName: string } }[]
  attachments: { id: string; fileName: string; fileSize: number; url: string; createdAt: string }[]
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchWorkOrder(id: string): Promise<WorkOrderDetail> {
  const response = await fetch(`/api/work-orders/${id}`, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  if (!response.ok) throw new Error('Failed to fetch work order')
  return response.json()
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export default function WorkOrderDetailPage() {
  const params = useParams()
  const router = useRouter()
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const id = params.id as string
  const [commentDraft, setCommentDraft] = useState('')
  const [actualCostDraft, setActualCostDraft] = useState('')
  const [actualDurationDraft, setActualDurationDraft] = useState('')

  const { data: wo, isLoading, refetch } = useQuery({
    queryKey: ['work-order', id],
    queryFn: () => fetchWorkOrder(id)
  })

  const updateMutation = useMutation({
    mutationFn: async (data: Record<string, unknown>) => {
      const response = await fetch(`/api/work-orders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify(data)
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to update work order')
      return result
    },
    onSuccess: () => {
      toast.success('Updated')
      refetch()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const commentMutation = useMutation({
    mutationFn: async (content: string) => {
      const response = await fetch(`/api/work-orders/${id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({ content })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to add comment')
      return result
    },
    onSuccess: () => {
      setCommentDraft('')
      refetch()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData()
      formData.append('file', file)
      const response = await fetch(`/api/work-orders/${id}/attachments`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${getToken()}` },
        body: formData
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to upload')
      return result
    },
    onSuccess: () => { toast.success('Uploaded'); refetch() },
    onError: (error: Error) => toast.error(error.message)
  })

  const unlinkIssueMutation = useMutation({
    mutationFn: async (issueId: string) => {
      const response = await fetch(`/api/work-orders/${id}/issues?issueId=${issueId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      if (!response.ok) throw new Error('Failed to remove issue')
    },
    onSuccess: () => refetch()
  })

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  if (!wo) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-semibold text-gray-900 mb-2">Work Order Not Found</h2>
        <Link href="/dashboard/assets/work-orders" className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700">Back to Work Orders</Link>
      </div>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-center space-x-4">
        <button onClick={() => router.back()} className="text-gray-600 hover:text-gray-900">
          <ArrowLeft className="h-6 w-6" />
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">{wo.title}</h1>
          {wo.description && <p className="text-gray-600 mt-1">{wo.description}</p>}
          {wo.asset && <Link className="text-sm text-primary-700" href={`/dashboard/assets/${wo.asset.id}`}>{wo.asset.name}</Link>}
          <ImportSourceDetails value={wo.sourceData} />
        </div>
        <span className={`text-sm px-3 py-1 rounded-full font-medium ${STATUS_STYLES[wo.status]}`}>{wo.status.replace('_', ' ')}</span>
      </div>

      <div className="bg-white rounded-lg shadow border p-6 grid grid-cols-2 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
          <select
            value={wo.status}
            onChange={(e) => updateMutation.mutate({ status: e.target.value })}
            className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
          >
            <option value="SCHEDULED">Scheduled</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Scheduled Date</label>
          <p className="text-sm text-gray-900 py-1.5">{wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Assigned To</label>
          <p className="text-sm text-gray-900 py-1.5">{wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Created By</label>
          <p className="text-sm text-gray-900 py-1.5">{wo.sourceData ? wo.sourceCreatedByName || 'Not recorded in source' : `${wo.createdBy.firstName} ${wo.createdBy.lastName}`}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Duration</label>
          <p className="text-sm text-gray-900 py-1.5">{wo.estimatedDuration != null ? `${wo.estimatedDuration} hrs` : '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Actual Duration (hrs)</label>
          <div className="flex gap-1">
            <input type="number" step="0.5" value={actualDurationDraft} onChange={(e) => setActualDurationDraft(e.target.value)} placeholder={wo.actualDuration != null ? String(wo.actualDuration) : '—'} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm" />
            <button onClick={() => actualDurationDraft && updateMutation.mutate({ actualDuration: parseFloat(actualDurationDraft) })} className="text-xs bg-gray-100 px-2 rounded-md hover:bg-gray-200">Set</button>
          </div>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Estimated Cost</label>
          <p className="text-sm text-gray-900 py-1.5">{wo.estimatedCost != null ? formatCurrency(wo.estimatedCost) : '—'}</p>
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-500 mb-1">Actual Cost</label>
          <div className="flex gap-1">
            <input type="number" step="0.01" value={actualCostDraft} onChange={(e) => setActualCostDraft(e.target.value)} placeholder={wo.actualCost != null ? String(wo.actualCost) : '—'} className="w-full border border-gray-300 rounded-md px-2 py-1 text-sm" />
            <button onClick={() => actualCostDraft && updateMutation.mutate({ actualCost: parseFloat(actualCostDraft) })} className="text-xs bg-gray-100 px-2 rounded-md hover:bg-gray-200">Set</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2"><Link2 className="h-4 w-4" /> Bundled Issues</h3>
        {wo.issues.length === 0 ? (
          <p className="text-sm text-gray-400">No issues bundled</p>
        ) : (
          <div className="space-y-2">
            {wo.issues.map(({ issue }) => (
              <div key={issue.id} className="flex items-center justify-between border rounded-md p-3">
                <div>
                  <Link href={`/dashboard/assets/${issue.asset.id}?tab=issues`} className="text-sm font-medium text-primary-600 hover:text-primary-800">{issue.title}</Link>
                  <p className="text-xs text-gray-400">{issue.asset.name} · {issue.status.replace('_', ' ')}</p>
                </div>
                <button onClick={() => unlinkIssueMutation.mutate(issue.id)} className="text-gray-400 hover:text-red-600">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3 flex items-center gap-2"><FileText className="h-4 w-4" /> Attachments</h3>
        <label className="inline-flex items-center gap-2 text-sm bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded-md hover:bg-gray-50 cursor-pointer mb-3">
          <Upload className="h-4 w-4" /> Upload File
          <input type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadMutation.mutate(f); e.target.value = '' }} />
        </label>
        {wo.attachments.length === 0 ? (
          <p className="text-sm text-gray-400">No attachments</p>
        ) : (
          <div className="space-y-1">
            {wo.attachments.map((a) => (
              <a key={a.id} href={a.url} target="_blank" rel="noreferrer" className="flex items-center justify-between text-sm hover:bg-gray-50 rounded-md px-2 py-1.5">
                <span className="text-primary-600">{a.fileName}</span>
                <span className="text-xs text-gray-400">{formatFileSize(a.fileSize)}</span>
              </a>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-lg shadow border p-6">
        <h3 className="text-lg font-medium text-gray-900 mb-3">Comments</h3>
        <div className="space-y-2 mb-3">
          {wo.comments.length === 0 ? (
            <p className="text-sm text-gray-400">No comments yet</p>
          ) : wo.comments.map((c) => (
            <div key={c.id} className="bg-gray-50 rounded-md border p-3 text-sm">
              <p className="text-gray-800">{c.content}</p>
              <p className="text-xs text-gray-400 mt-1">{c.author.firstName} {c.author.lastName} · {new Date(c.createdAt).toLocaleString()}</p>
            </div>
          ))}
        </div>
        <div className="flex gap-2">
          <input type="text" value={commentDraft} onChange={(e) => setCommentDraft(e.target.value)} placeholder="Add a comment..." className="flex-1 text-sm border border-gray-300 rounded-md px-3 py-2" />
          <button
            onClick={() => commentDraft.trim() && commentMutation.mutate(commentDraft.trim())}
            disabled={commentMutation.isPending || !commentDraft.trim()}
            className="text-sm bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 disabled:opacity-50"
          >
            Post
          </button>
        </div>
      </div>
    </div>
  )
}
