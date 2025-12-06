'use client'

import { useState, useMemo } from 'react'
import { useQuery } from '@tanstack/react-query'
import { format, addDays, differenceInDays, isSameDay, startOfWeek, endOfWeek } from 'date-fns'
import { Calendar, ChevronLeft, ChevronRight, BarChart3 } from 'lucide-react'

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
  // TODO: Add back dependency fields when self-relation is working
  // isBlocked?: boolean
  // dependencies?: Array<{
  //   id: string
  //   title: string
  //   status: string
  //   isCompleted: boolean
  // }>
  // dependents?: Array<{
  //   id: string
  //   title: string
  //   status: string
  // }>
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
  const [viewMode, setViewMode] = useState<'week' | 'month' | 'quarter'>('month')

  const { data, isLoading, error } = useQuery({
    queryKey: ['project-timeline', projectId],
    queryFn: () => fetchTimelineData(projectId)
  })

  // Calculate date range based on project dates and view mode
  const { startDate, endDate, dateColumns } = useMemo(() => {
    if (!data?.project) {
      const today = new Date()
      return {
        startDate: today,
        endDate: addDays(today, 30),
        dateColumns: []
      }
    }

    const projectStart = data.project.startDate
    const projectEnd = data.project.endDate
    
    // Add padding for better visualization
    const paddingDays = viewMode === 'week' ? 7 : viewMode === 'month' ? 15 : 30
    const start = addDays(projectStart, -paddingDays)
    const end = addDays(projectEnd, paddingDays)
    
    const columns: Date[] = []
    
    switch (viewMode) {
      case 'week':
        for (let i = 0; i <= differenceInDays(end, start); i++) {
          columns.push(addDays(start, i))
        }
        break
      case 'month':
        for (let i = 0; i <= differenceInDays(end, start); i += 7) {
          columns.push(addDays(start, i))
        }
        break
      case 'quarter':
        for (let i = 0; i <= differenceInDays(end, start); i += 30) {
          columns.push(addDays(start, i))
        }
        break
    }

    return { startDate: start, endDate: end, dateColumns: columns }
  }, [data, viewMode])

  const getTaskPosition = (task: { startDate: Date; endDate: Date }) => {
    const totalDays = differenceInDays(endDate, startDate)
    const taskStart = Math.max(0, differenceInDays(task.startDate, startDate))
    const taskDuration = differenceInDays(task.endDate, task.startDate) + 1
    
    const left = (taskStart / totalDays) * 100
    const width = Math.max(1, (taskDuration / totalDays) * 100)
    
    return { left: `${left}%`, width: `${width}%` }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-500'
      case 'in_progress':
      case 'active':
        return 'bg-blue-500'
      case 'overdue':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

  const getTaskStatusColor = (status: TimelineTask['status']) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-500'
      case 'IN_PROGRESS':
        return 'bg-blue-500'
      case 'OVERDUE':
        return 'bg-red-500'
      default:
        return 'bg-gray-400'
    }
  }

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

  if (error || !data) {
    return (
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
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="p-6 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <BarChart3 className="h-6 w-6 text-primary-600" />
            <h2 className="text-xl font-semibold text-gray-900">Project Timeline</h2>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* View Mode Selector */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              {(['week', 'month', 'quarter'] as const).map((mode) => (
                <button
                  key={mode}
                  onClick={() => setViewMode(mode)}
                  className={`px-3 py-1 rounded-md text-sm font-medium capitalize transition-colors ${
                    viewMode === mode
                      ? 'bg-white text-primary-600 shadow-sm'
                      : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  {mode}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Gantt Chart */}
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Timeline Header */}
          <div className="grid grid-cols-12 gap-0 border-b border-gray-200 bg-gray-50">
            <div className="col-span-3 p-4 font-medium text-gray-900 border-r border-gray-200">
              Task
            </div>
            <div className="col-span-9 relative">
              <div className="flex h-12 items-center">
                {dateColumns.map((date, index) => (
                  <div
                    key={index}
                    className="flex-1 px-2 py-2 text-center border-r border-gray-200 last:border-r-0"
                  >
                    <div className="text-xs font-medium text-gray-600">
                      {viewMode === 'week' 
                        ? format(date, 'EEE')
                        : viewMode === 'month'
                        ? format(date, 'MMM dd')
                        : format(date, 'MMM')
                      }
                    </div>
                    {viewMode === 'week' && (
                      <div className="text-xs text-gray-400">{format(date, 'dd')}</div>
                    )}
                  </div>
                ))}
              </div>
              
              {/* Today indicator */}
              {(() => {
                const today = new Date()
                const todayDiff = differenceInDays(today, startDate)
                const totalDays = differenceInDays(endDate, startDate)
                
                // Show today line if today falls within the visible date range
                if (todayDiff >= 0 && todayDiff <= totalDays) {
                  const leftPosition = (todayDiff / totalDays) * 100
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-lg"
                      style={{
                        left: `${leftPosition}%`
                      }}
                      title={`Today: ${format(today, 'MMM dd, yyyy')}`}
                    />
                  )
                }
                return null
              })()}
            </div>
          </div>

          {/* Project Overview Row */}
          <div className="grid grid-cols-12 gap-0 border-b-2 border-gray-300 bg-gray-50 hover:bg-gray-100">
            <div className="col-span-3 p-4 border-r border-gray-200">
              <div className="flex items-center space-x-3">
                <div className={`w-3 h-3 rounded-full ${getStatusColor(data.project.status)}`} />
                <div>
                  <div className="font-semibold text-gray-900">Overall Project</div>
                  <div className="text-xs text-gray-500">
                    {format(data.project.startDate, 'MMM dd')} - {format(data.project.endDate, 'MMM dd')}
                  </div>
                </div>
              </div>
            </div>
            <div className="col-span-9 relative p-2">
              <div 
                className={`h-8 rounded-md ${getStatusColor(data.project.status)} opacity-80 flex items-center px-2`}
                style={getTaskPosition(data.project)}
              >
                <div className="text-xs text-white font-medium">
                  {data.project.progress}%
                </div>
              </div>
              
              {/* Today indicator for project row */}
              {(() => {
                const today = new Date()
                const todayDiff = differenceInDays(today, startDate)
                const totalDays = differenceInDays(endDate, startDate)
                
                if (todayDiff >= 0 && todayDiff <= totalDays) {
                  const leftPosition = (todayDiff / totalDays) * 100
                  return (
                    <div 
                      className="absolute top-0 bottom-0 w-0.5 bg-red-600 shadow-lg pointer-events-none"
                      style={{
                        left: `${leftPosition}%`,
                        zIndex: 9999
                      }}
                      title={`Today: ${format(today, 'MMM dd, yyyy')}`}
                    />
                  )
                }
                return null
              })()}
            </div>
          </div>

          {/* Task Rows */}
          <div className="divide-y divide-gray-200 relative">
            {/* Today indicator extends through tasks */}
            {(() => {
              const today = new Date()
              const todayDiff = differenceInDays(today, startDate)
              const totalDays = differenceInDays(endDate, startDate)
              
              if (todayDiff >= 0 && todayDiff <= totalDays) {
                const leftPosition = (todayDiff / totalDays) * 100
                const offsetLeft = (3/12) * 100 // 3 columns out of 12 for task names
                return (
                  <div 
                    className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-50 shadow-lg pointer-events-none"
                    style={{
                      left: `calc(${offsetLeft}% + ${leftPosition * (9/12)}%)` // Position within the 9-column timeline area
                    }}
                  />
                )
              }
              return null
            })()}

            {data.tasks.length === 0 ? (
              <div className="p-8 text-center text-gray-500 text-sm">
                No tasks with dates to display in timeline
              </div>
            ) : (
              data.tasks.map((task) => (
                <div key={task.id} className="grid grid-cols-12 gap-0 hover:bg-gray-50">
                  <div className="col-span-3 p-4 border-r border-gray-200">
                    <div className="flex items-center space-x-3">
                      <div 
                        className={`w-2 h-2 rounded-full`} 
                        style={{ backgroundColor: task.categoryColor }} 
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-sm text-gray-700 truncate">
                          {task.title}
                        </div>
                        <div className="text-xs text-gray-500">
                          {task.assignee || task.category}
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="col-span-9 relative p-2">
                    <div 
                      className={`h-5 rounded ${getTaskStatusColor(task.status)} opacity-70 flex items-center px-1`}
                      style={getTaskPosition(task)}
                    >
                      {task.progress > 0 && (
                        <div className="text-xs text-white font-medium">
                          {task.progress}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Legend */}
      <div className="p-4 border-t border-gray-200 bg-gray-50">
        <div className="flex items-center space-x-6 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-green-500" />
            <span>Completed</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-blue-500" />
            <span>In Progress</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-red-500" />
            <span>Overdue</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 rounded bg-gray-400" />
            <span>Not Started</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}