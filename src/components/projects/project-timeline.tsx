'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format } from 'date-fns'
import { BarChart3, ListTodo, GanttChart } from 'lucide-react'
import { TaskDetailModal } from './task-detail-modal'
import { ScheduleGantt } from './schedule-gantt'
import { TaskGanttChart } from './task-gantt-chart'

interface TimelineTask {
  id: string
  title: string
  startDate: Date
  endDate: Date
  progress: number
  category: string
  categoryColor: string
  assignee?: string
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'OVERDUE'
  isBlocked?: boolean
  dependencies?: Array<{
    id: string
    title: string
    status: string
    isCompleted: boolean
  }>
  dependents?: Array<{
    id: string
    title: string
    status: string
  }>
}

interface TimelineData {
  project: {
    id: string
    title: string
    startDate: Date
    endDate: Date
    progress: number
    status: string
  }
  tasks: TimelineTask[]
}

interface ProjectTimelineProps {
  projectId: string
}

type TimelineViewMode = 'tasks' | 'schedule'

async function fetchTimelineData(projectId: string): Promise<TimelineData> {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]
  
  const response = await fetch(`/api/project/${projectId}/timeline`, {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  
  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.error || 'Failed to fetch timeline data')
  }
  
  const data = await response.json()
  
  // Convert date strings to Date objects
  return {
    project: {
      ...data.project,
      startDate: new Date(data.project.startDate),
      endDate: new Date(data.project.endDate)
    },
    tasks: data.tasks.map((task: any) => ({
      ...task,
      startDate: new Date(task.startDate),
      endDate: new Date(task.endDate)
    }))
  }
}

export function ProjectTimeline({ projectId }: ProjectTimelineProps) {
  const [timelineView, setTimelineView] = useState<TimelineViewMode>('tasks')
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null)
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false)

  const handleTaskClick = (taskId: string) => {
    setSelectedTaskId(taskId)
    setIsTaskModalOpen(true)
  }

  const handleTaskModalClose = () => {
    setSelectedTaskId(null)
    setIsTaskModalOpen(false)
  }

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-timeline', projectId],
    queryFn: () => fetchTimelineData(projectId)
  })

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  // If showing schedule view, render the ScheduleGantt component
  if (timelineView === 'schedule') {
    return (
      <div className="space-y-4">
        {/* View Toggle Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimelineView('tasks')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
              >
                <ListTodo className="h-4 w-4" />
                Tasks
              </button>
              <button
                onClick={() => setTimelineView('schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-primary-600 shadow-sm"
              >
                <GanttChart className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>
        </div>

        <ScheduleGantt projectId={projectId} />
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        {/* View Toggle Header */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <BarChart3 className="h-5 w-5 text-primary-600" />
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
            </div>

            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimelineView('tasks')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-primary-600 shadow-sm"
              >
                <ListTodo className="h-4 w-4" />
                Tasks
              </button>
              <button
                onClick={() => setTimelineView('schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
              >
                <GanttChart className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="text-center text-gray-500">
            <BarChart3 className="h-12 w-12 mx-auto mb-3 text-gray-400" />
            <div className="space-y-2">
              <p className="font-medium">Timeline Not Available</p>
              <p className="text-sm">
                This project needs start and end dates to display a timeline view.
              </p>
              <p className="text-xs text-gray-400">
                Edit the project to add dates and try again.
              </p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const handleGanttTaskClick = (task: { id: string }, clickPosition: { x: number; y: number }) => {
    handleTaskClick(task.id)
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-5 w-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Timeline</h2>
              <p className="text-xs text-gray-500">
                {data.tasks.length} tasks • {format(data.project.startDate, 'MMM dd')} - {format(data.project.endDate, 'MMM dd, yyyy')}
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Stats badges */}
            <div className="hidden md:flex items-center space-x-2 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {data.tasks.length} tasks
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                {data.project.progress}% complete
              </span>
            </div>

            {/* Timeline View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setTimelineView('tasks')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors bg-white text-primary-600 shadow-sm"
              >
                <ListTodo className="h-4 w-4" />
                Tasks
              </button>
              <button
                onClick={() => setTimelineView('schedule')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors text-gray-600 hover:text-gray-900"
              >
                <GanttChart className="h-4 w-4" />
                Schedule
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Task Gantt Chart */}
      <div style={{ height: '600px' }}>
        <TaskGanttChart
          tasks={data.tasks}
          projectStart={data.project.startDate}
          projectEnd={data.project.endDate}
          onTaskClick={handleGanttTaskClick}
          selectedTaskId={selectedTaskId}
        />
      </div>

      {/* Legend */}
      <div className="p-3 border-t border-gray-200 bg-gray-50">
        <div className="flex flex-wrap items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-gray-300" />
            <span>Not Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-blue-400" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-green-400" />
            <span>Completed</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-red-400" />
            <span>Overdue</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded bg-orange-400" />
            <span>Blocked</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>Today</span>
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      <TaskDetailModal
        taskId={selectedTaskId}
        projectId={projectId}
        isOpen={isTaskModalOpen}
        onClose={handleTaskModalClose}
      />
    </div>
  )
}