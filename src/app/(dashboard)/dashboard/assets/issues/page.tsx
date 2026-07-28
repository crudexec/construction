'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { AlertCircle, Wrench, CheckCircle, ClipboardList, MessageSquare } from 'lucide-react'

interface Issue {
  id: string
  title: string
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED'
  urgency: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT'
  createdAt: string
  asset: { id: string; name: string; type: string }
  reportedBy: { id: string; firstName: string; lastName: string } | null
  _count: { comments: number }
}

function getToken() {
  return document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
}

async function fetchIssues(status: string): Promise<Issue[]> {
  const url = status === 'ALL' ? '/api/assets/issues' : `/api/assets/issues?status=${status}`
  const response = await fetch(url, { headers: { 'Authorization': `Bearer ${getToken()}` } })
  if (!response.ok) throw new Error('Failed to fetch issues')
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

const TABS = [
  { id: 'ALL', label: 'All' },
  { id: 'OPEN', label: 'Open' },
  { id: 'IN_PROGRESS', label: 'In Progress' },
  { id: 'RESOLVED', label: 'Resolved' },
  { id: 'CLOSED', label: 'Closed' }
]

export default function AssetIssuesDashboardPage() {
  const [statusFilter, setStatusFilter] = useState('OPEN')

  const { data: issues = [], isLoading } = useQuery({
    queryKey: ['all-asset-issues', statusFilter],
    queryFn: () => fetchIssues(statusFilter)
  })

  const openCount = issues.filter(i => i.status === 'OPEN').length
  const inProgressCount = issues.filter(i => i.status === 'IN_PROGRESS').length

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Equipment Issues</h1>
          <p className="text-sm text-gray-600">All reported issues across your fleet</p>
        </div>
        <Link
          href="/dashboard/assets/work-orders"
          className="bg-primary-600 text-white px-4 py-2 rounded-md hover:bg-primary-700 flex items-center gap-2"
        >
          <ClipboardList className="h-4 w-4" />
          Work Orders
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <AlertCircle className="h-8 w-8 text-red-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{statusFilter === 'ALL' ? openCount : (statusFilter === 'OPEN' ? issues.length : openCount)}</div>
              <div className="text-sm text-gray-500">Open</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <Wrench className="h-8 w-8 text-orange-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{statusFilter === 'ALL' ? inProgressCount : (statusFilter === 'IN_PROGRESS' ? issues.length : inProgressCount)}</div>
              <div className="text-sm text-gray-500">In Progress</div>
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-lg shadow border">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-500" />
            <div className="ml-4">
              <div className="text-2xl font-bold text-gray-900">{issues.filter(i => i.status === 'RESOLVED' || i.status === 'CLOSED').length}</div>
              <div className="text-sm text-gray-500">{statusFilter === 'ALL' ? 'Resolved/Closed' : 'Matching resolved/closed'}</div>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStatusFilter(tab.id)}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                statusFilter === tab.id ? 'border-primary-500 text-primary-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow border overflow-hidden">
        {isLoading ? (
          <div className="flex justify-center items-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : issues.length === 0 ? (
          <div className="text-center py-12">
            <AlertCircle className="h-12 w-12 mx-auto text-gray-300 mb-3" />
            <p className="text-gray-500">No issues in this view</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Issue</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Asset</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Urgency</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Reported</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {issues.map((issue) => (
                  <tr key={issue.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <Link href={`/dashboard/assets/${issue.asset.id}?tab=issues`} className="text-sm font-medium text-primary-600 hover:text-primary-800">
                        {issue.title}
                      </Link>
                      {issue._count.comments > 0 && (
                        <span className="inline-flex items-center gap-1 text-xs text-gray-400 ml-2">
                          <MessageSquare className="h-3 w-3" />{issue._count.comments}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">
                      <Link href={`/dashboard/assets/${issue.asset.id}`} className="hover:text-primary-600">{issue.asset.name}</Link>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${URGENCY_STYLES[issue.urgency]}`}>{issue.urgency}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`text-xs px-2 py-1 rounded-full font-medium ${STATUS_STYLES[issue.status]}`}>{issue.status.replace('_', ' ')}</span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500">
                      {issue.reportedBy ? `${issue.reportedBy.firstName} ${issue.reportedBy.lastName}` : 'QR report'}
                      <div className="text-xs text-gray-400">{new Date(issue.createdAt).toLocaleDateString()}</div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
