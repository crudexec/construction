'use client'

import { KanbanBoard } from '@/components/kanban/board'

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-gray-900">Dashboard</h1>
        <p className="mt-1 text-sm text-gray-500">
          Manage your leads and projects in one place
        </p>
      </div>
      
      <KanbanBoard />
    </div>
  )
}