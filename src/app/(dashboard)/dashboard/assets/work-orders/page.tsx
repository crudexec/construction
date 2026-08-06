'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import Link from 'next/link'
import { Plus, X, ClipboardList, AlertCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { DatePicker } from '@/components/ui/date-picker'
import { useCurrency } from '@/hooks/useCurrency'

interface WorkOrder {
  id: string
  title: string
  status: 'SCHEDULED' | 'IN_PROGRESS' | 'COMPLETED' | 'CANCELLED'
  scheduledDate: string | null
  estimatedCost: number | null
  actualCost: number | null
  assignedTo: { id: string; firstName: string; lastName: string } | null
  issues: { issue: { id: string; title: string; asset: { id: string; name: string } } }[]
  _count: { comments: number; attachments: number }
}

interface OpenIssue {
  id: string
  title: string
  urgency: string
  asset: { id: string; name: string }
}

interface UserOption { id: string; firstName: string; lastName: string }

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchWorkOrders(): Promise<WorkOrder[]> {
  const response = await fetch('/api/work-orders', { headers: { 'Authorization': `Bearer ${getToken()}` } })
  if (!response.ok) throw new Error('Failed to fetch work orders')
  return response.json()
}

async function fetchOpenIssues(): Promise<OpenIssue[]> {
  const response = await fetch('/api/assets/issues?status=OPEN', { headers: { 'Authorization': `Bearer ${getToken()}` } })
  if (!response.ok) return []
  return response.json()
}

async function fetchUsers(): Promise<UserOption[]> {
  const response = await fetch('/api/users', { headers: { 'Authorization': `Bearer ${getToken()}` } })
  if (!response.ok) return []
  return response.json()
}

const STATUS_STYLES: Record<string, string> = {
  SCHEDULED: 'bg-blue-100 text-blue-800',
  IN_PROGRESS: 'bg-orange-100 text-orange-800',
  COMPLETED: 'bg-green-100 text-green-800',
  CANCELLED: 'bg-gray-100 text-gray-800'
}

export default function WorkOrdersPage() {
  const queryClient = useQueryClient()
  const { format: formatCurrency } = useCurrency()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    title: '', description: '', scheduledDate: '', estimatedDuration: '', actualDuration: '', estimatedCost: '', actualCost: '', assignedToId: '', issueIds: [] as string[]
  })

  const { data: workOrders = [], isLoading } = useQuery({ queryKey: ['work-orders'], queryFn: fetchWorkOrders })
  const { data: openIssues = [] } = useQuery({ queryKey: ['open-asset-issues'], queryFn: fetchOpenIssues, enabled: showForm })
  const { data: users = [] } = useQuery({ queryKey: ['company-users'], queryFn: fetchUsers, enabled: showForm })

  const createMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await fetch('/api/work-orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          title: data.title,
          description: data.description || undefined,
          scheduledDate: data.scheduledDate || undefined,
          estimatedDuration: data.estimatedDuration ? parseFloat(data.estimatedDuration) : undefined,
          actualDuration: data.actualDuration ? parseFloat(data.actualDuration) : undefined,
          estimatedCost: data.estimatedCost ? parseFloat(data.estimatedCost) : undefined,
          actualCost: data.actualCost ? parseFloat(data.actualCost) : undefined,
          assignedToId: data.assignedToId || undefined,
          issueIds: data.issueIds
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to create work order')
      return result
    },
    onSuccess: () => {
      toast.success('Work order created')
      queryClient.invalidateQueries({ queryKey: ['work-orders'] })
      setShowForm(false)
      setForm({ title: '', description: '', scheduledDate: '', estimatedDuration: '', actualDuration: '', estimatedCost: '', actualCost: '', assignedToId: '', issueIds: [] })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const toggleIssue = (issueId: string) => {
    setForm(prev => ({
      ...prev,
      issueIds: prev.issueIds.includes(issueId) ? prev.issueIds.filter(i => i !== issueId) : [...prev.issueIds, issueId]
    }))
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Work Orders</h1>
          <p className="text-sm text-gray-600">Scheduled repairs bundling one or more equipment issues</p>
        </div>
        <button onClick={() => setShowForm(true)} className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2">
          <Plus className="h-4 w-4" />
          New Work Order
        </button>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : workOrders.length === 0 ? (
          <div className="text-center py-12">
            <ClipboardList className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No work orders yet</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Title</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issues</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Scheduled</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Est. Cost</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {workOrders.map((wo) => (
                  <tr key={wo.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/assets/work-orders/${wo.id}`} className="text-sm font-medium text-primary-600 hover:text-primary-800">{wo.title}</Link>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wo.issues.length} issue{wo.issues.length !== 1 ? 's' : ''}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wo.scheduledDate ? new Date(wo.scheduledDate).toLocaleDateString() : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wo.estimatedCost != null ? formatCurrency(wo.estimatedCost) : '—'}</td>
                    <td className="px-6 py-4 text-sm text-gray-500">{wo.assignedTo ? `${wo.assignedTo.firstName} ${wo.assignedTo.lastName}` : '—'}</td>
                    <td className="px-6 py-4"><span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[wo.status]}`}>{wo.status.replace('_', ' ')}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 px-4">
          <div className="bg-white rounded-lg shadow-xl max-w-lg w-full max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">New Work Order</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(form) }} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Title *</label>
                <input type="text" required value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Scheduled Date</label>
                  <DatePicker value={form.scheduledDate} onChange={(date) => setForm({ ...form, scheduledDate: date })} placeholder="Select date" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned To</label>
                  <select value={form.assignedToId} onChange={(e) => setForm({ ...form, assignedToId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2">
                    <option value="">Unassigned</option>
                    {users.map((u) => <option key={u.id} value={u.id}>{u.firstName} {u.lastName}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Duration (hrs)</label>
                  <input type="number" step="0.5" value={form.estimatedDuration} onChange={(e) => setForm({ ...form, estimatedDuration: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Duration (hrs)</label>
                  <input type="number" step="0.5" value={form.actualDuration} onChange={(e) => setForm({ ...form, actualDuration: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Estimated Cost</label>
                  <input type="number" step="0.01" value={form.estimatedCost} onChange={(e) => setForm({ ...form, estimatedCost: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Actual Cost</label>
                  <input type="number" step="0.01" value={form.actualCost} onChange={(e) => setForm({ ...form, actualCost: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" />
                </div>
              </div>
              <div className="border-t pt-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">Bundle Open Issues</label>
                {openIssues.length === 0 ? (
                  <p className="text-xs text-gray-400">No open issues to bundle</p>
                ) : (
                  <div className="space-y-1 max-h-40 overflow-y-auto border rounded-md p-2">
                    {openIssues.map((issue) => (
                      <label key={issue.id} className="flex items-center gap-2 text-sm py-1 cursor-pointer">
                        <input type="checkbox" checked={form.issueIds.includes(issue.id)} onChange={() => toggleIssue(issue.id)} />
                        <span className="text-gray-900">{issue.title}</span>
                        <span className="text-xs text-gray-400">({issue.asset.name})</span>
                      </label>
                    ))}
                  </div>
                )}
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={createMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {createMutation.isPending ? 'Creating...' : 'Create Work Order'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
