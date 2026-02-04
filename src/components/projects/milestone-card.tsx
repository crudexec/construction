'use client'

import { Calendar, CheckCircle2, DollarSign, Target, Edit2 } from 'lucide-react'
import { format } from 'date-fns'
import { useCurrency } from '@/hooks/useCurrency'

interface MilestoneCardProps {
  milestone: {
    id: string
    title: string
    description?: string | null
    status: string
    targetDate?: Date | string | null
    completedDate?: Date | string | null
    amount?: number | null
    order: number
    completedTasksCount?: number
    totalTasksCount?: number
    progress?: number
  }
  onEdit?: (milestone: any) => void
  onViewTasks?: (milestoneId: string) => void
}

export function MilestoneCard({ milestone, onEdit, onViewTasks }: MilestoneCardProps) {
  const { format: formatCurrency } = useCurrency()

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-700'
      case 'IN_PROGRESS':
        return 'bg-blue-100 text-blue-700'
      case 'PENDING':
        return 'bg-gray-100 text-gray-700'
      case 'OVERDUE':
        return 'bg-red-100 text-red-700'
      default:
        return 'bg-gray-100 text-gray-700'
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return 'Completed'
      case 'IN_PROGRESS':
        return 'In Progress'
      case 'PENDING':
        return 'Not Started'
      case 'OVERDUE':
        return 'Overdue'
      default:
        return status
    }
  }

  const progress = milestone.progress ?? 0
  const completedCount = milestone.completedTasksCount ?? 0
  const totalCount = milestone.totalTasksCount ?? 0

  return (
    <div
      className="bg-white rounded-lg border border-slate-200 p-4 hover:shadow-md transition-all cursor-pointer group"
      onClick={() => onViewTasks && onViewTasks(milestone.id)}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <h4 className="text-sm font-semibold text-slate-900 truncate mb-1">
            {milestone.title}
          </h4>
          <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${getStatusColor(milestone.status)}`}>
            {getStatusLabel(milestone.status)}
          </span>
        </div>
        {onEdit && (
          <button
            onClick={(e) => {
              e.stopPropagation()
              onEdit(milestone)
            }}
            className="p-1 hover:bg-slate-100 rounded opacity-0 group-hover:opacity-100 transition-opacity"
            title="Edit milestone"
          >
            <Edit2 className="h-4 w-4 text-slate-600" />
          </button>
        )}
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
          <span>Progress</span>
          <span className="font-medium">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-blue-400 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        {/* Tasks */}
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-blue-50 rounded">
            <CheckCircle2 className="h-3.5 w-3.5 text-blue-600" />
          </div>
          <div>
            <p className="text-xs text-slate-500">Tasks</p>
            <p className="text-sm font-semibold text-slate-900">{completedCount}/{totalCount}</p>
          </div>
        </div>

        {/* Budget */}
        {milestone.amount !== null && milestone.amount !== undefined && (
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 rounded">
              <DollarSign className="h-3.5 w-3.5 text-emerald-600" />
            </div>
            <div>
              <p className="text-xs text-slate-500">Budget</p>
              <p className="text-sm font-semibold text-slate-900">{formatCurrency(milestone.amount)}</p>
            </div>
          </div>
        )}
      </div>

      {/* Dates */}
      {milestone.targetDate && (
        <div className="flex items-center gap-2 text-xs text-slate-600">
          <Calendar className="h-3.5 w-3.5" />
          <span>
            {milestone.completedDate
              ? `Completed ${format(new Date(milestone.completedDate), 'MMM d, yyyy')}`
              : `Due ${format(new Date(milestone.targetDate), 'MMM d, yyyy')}`}
          </span>
        </div>
      )}
    </div>
  )
}
