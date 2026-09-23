'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Plus, UserRound, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface PersonAssignment {
  id: string
  assignedAt: string
  removedAt: string | null
  notes: string | null
  assignee: { id: string; firstName: string; lastName: string; email: string }
  createdBy: { id: string; firstName: string; lastName: string }
}

interface UserOption {
  id: string
  firstName: string
  lastName: string
  email: string
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchPersonAssignments(assetId: string): Promise<PersonAssignment[]> {
  const response = await fetch(`/api/assets/${assetId}/person-assignments`, {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) throw new Error('Failed to fetch person assignments')
  return response.json()
}

async function fetchUsers(): Promise<UserOption[]> {
  const response = await fetch('/api/users', {
    headers: { 'Authorization': `Bearer ${getToken()}` }
  })
  if (!response.ok) return []
  return response.json()
}

export function AssetPersonAssignmentsTab({ assetId }: { assetId: string }) {
  const queryClient = useQueryClient()
  const [showForm, setShowForm] = useState(false)
  const [form, setForm] = useState({
    assigneeId: '',
    assignedAt: '',
    removedAt: '',
    notes: ''
  })

  const { data: assignments = [], isLoading } = useQuery({
    queryKey: ['asset-person-assignments', assetId],
    queryFn: () => fetchPersonAssignments(assetId)
  })

  const { data: users = [] } = useQuery({
    queryKey: ['company-users'],
    queryFn: fetchUsers,
    enabled: showForm
  })

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['asset-person-assignments', assetId] })
    queryClient.invalidateQueries({ queryKey: ['asset', assetId] })
    queryClient.invalidateQueries({ queryKey: ['assets'] })
  }

  const assignMutation = useMutation({
    mutationFn: async (data: typeof form) => {
      const response = await fetch(`/api/assets/${assetId}/person-assignments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getToken()}` },
        body: JSON.stringify({
          assigneeId: data.assigneeId,
          assignedAt: data.assignedAt || undefined,
          removedAt: data.removedAt || undefined,
          notes: data.notes || undefined
        })
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to assign to person')
      return result
    },
    onSuccess: () => {
      toast.success('Assigned to person')
      invalidate()
      setShowForm(false)
      setForm({ assigneeId: '', assignedAt: '', removedAt: '', notes: '' })
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const removeMutation = useMutation({
    mutationFn: async (assignmentId: string) => {
      const response = await fetch(`/api/assets/person-assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Authorization': `Bearer ${getToken()}` }
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to remove person assignment')
      return result
    },
    onSuccess: () => {
      toast.success('Removed from person')
      invalidate()
    },
    onError: (error: Error) => toast.error(error.message)
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.assigneeId) {
      toast.error('Select a person')
      return
    }
    assignMutation.mutate(form)
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-32">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-medium text-gray-900">Person Assignment History</h3>
        <button
          onClick={() => setShowForm(true)}
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <Plus className="h-4 w-4" />
          Assign to Person
        </button>
      </div>

      {assignments.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <UserRound className="h-12 w-12 mx-auto text-gray-300 mb-2" />
          <p>No person assignment history yet</p>
        </div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-xs text-gray-500 uppercase">
              <th className="py-2">Person</th>
              <th className="py-2">Assigned</th>
              <th className="py-2">Removed</th>
              <th className="py-2">Notes</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {assignments.map((assignment) => (
              <tr key={assignment.id} className="border-b border-gray-100">
                <td className="py-2">
                  <div className="font-medium text-gray-900">{assignment.assignee.firstName} {assignment.assignee.lastName}</div>
                  <div className="text-xs text-gray-400">{assignment.assignee.email}</div>
                </td>
                <td className="py-2 text-gray-500">{new Date(assignment.assignedAt).toLocaleDateString()}</td>
                <td className="py-2">
                  {assignment.removedAt ? (
                    <span className="text-gray-500">{new Date(assignment.removedAt).toLocaleDateString()}</span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-800">Current</span>
                  )}
                </td>
                <td className="py-2 text-gray-500">{assignment.notes || '-'}</td>
                <td className="py-2 text-right">
                  {!assignment.removedAt && (
                    <button
                      onClick={() => removeMutation.mutate(assignment.id)}
                      disabled={removeMutation.isPending}
                      className="text-red-600 hover:text-red-800 text-xs font-medium"
                    >
                      Remove
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {showForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="px-6 py-4 border-b flex justify-between items-center">
              <h3 className="text-lg font-medium text-gray-900">Assign to Person</h3>
              <button onClick={() => setShowForm(false)} className="text-gray-400 hover:text-gray-500">
                <X className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Person *</label>
                <select value={form.assigneeId} onChange={(e) => setForm({ ...form, assigneeId: e.target.value })} className="w-full border border-gray-300 rounded-md px-3 py-2" required>
                  <option value="">Select a person</option>
                  {users.map((user) => (
                    <option key={user.id} value={user.id}>{user.firstName} {user.lastName}</option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Assigned Date (blank = now)</label>
                  <input
                    type="date"
                    value={form.assignedAt}
                    onChange={(e) => setForm({ ...form, assignedAt: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Removed Date</label>
                  <input
                    type="date"
                    value={form.removedAt}
                    onChange={(e) => setForm({ ...form, removedAt: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} rows={2} className="w-full border border-gray-300 rounded-md px-3 py-2" />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <button type="button" onClick={() => setShowForm(false)} className="px-4 py-2 text-gray-700 border border-gray-300 rounded-md hover:bg-gray-50">Cancel</button>
                <button type="submit" disabled={assignMutation.isPending} className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50">
                  {assignMutation.isPending ? 'Assigning...' : 'Assign'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
