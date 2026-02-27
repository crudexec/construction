'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format, differenceInDays, addDays, startOfDay } from 'date-fns'

interface GanttTask {
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
}

interface TaskGanttChartProps {
  tasks: GanttTask[]
  projectStart: Date
  projectEnd: Date
  onTaskClick?: (task: GanttTask, clickPosition: { x: number; y: number }) => void
  selectedTaskId?: string | null
}

type ZoomLevel = 'day' | 'week' | 'month'

export function TaskGanttChart({
  tasks,
  projectStart,
  projectEnd,
  onTaskClick,
  selectedTaskId,
}: TaskGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week')

  // Filter tasks that have dates
  const validTasks = useMemo(() => {
    return tasks.filter((t) => t.startDate && t.endDate)
  }, [tasks])

  // Calculate date range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (validTasks.length === 0) {
      return {
        minDate: addDays(startOfDay(projectStart), -7),
        maxDate: addDays(startOfDay(projectEnd), 14),
        totalDays: differenceInDays(projectEnd, projectStart) + 21,
      }
    }

    let min = new Date(projectStart)
    let max = new Date(projectEnd)

    validTasks.forEach((task) => {
      if (task.startDate < min) min = task.startDate
      if (task.endDate > max) max = task.endDate
    })

    // Add padding
    min = addDays(startOfDay(min), -7)
    max = addDays(startOfDay(max), 14)

    return {
      minDate: min,
      maxDate: max,
      totalDays: differenceInDays(max, min) + 1,
    }
  }, [validTasks, projectStart, projectEnd])

  // Column width based on zoom level
  const columnWidth = useMemo(() => {
    switch (zoomLevel) {
      case 'day':
        return 40
      case 'week':
        return 20
      case 'month':
        return 6
    }
  }, [zoomLevel])

  const chartWidth = totalDays * columnWidth
  const rowHeight = 36
  const headerHeight = 50

  // Generate date columns for header
  const dateColumns = useMemo(() => {
    const columns: { date: Date; label: string; isWeekend: boolean }[] = []
    for (let i = 0; i < totalDays; i++) {
      const date = addDays(minDate, i)
      const dayOfWeek = date.getDay()
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6

      let label = ''
      if (zoomLevel === 'day') {
        label = format(date, 'd')
      } else if (zoomLevel === 'week') {
        if (date.getDate() === 1 || i === 0) {
          label = format(date, 'MMM d')
        } else if (dayOfWeek === 1) {
          label = format(date, 'd')
        }
      } else {
        if (date.getDate() === 1) {
          label = format(date, 'MMM')
        }
      }

      columns.push({ date, label, isWeekend })
    }
    return columns
  }, [minDate, totalDays, zoomLevel])

  // Calculate bar position and width
  const getBarStyle = (task: GanttTask) => {
    const start = task.startDate
    const end = task.endDate

    const startOffset = differenceInDays(start, minDate)
    const duration = differenceInDays(end, start) + 1

    const left = startOffset * columnWidth
    const width = Math.max(duration * columnWidth - 4, 8)

    return { left, width }
  }

  // Get status color
  const getStatusColor = (task: GanttTask) => {
    if (task.isBlocked) {
      return {
        bg: 'bg-orange-200',
        progress: 'bg-orange-500',
        border: 'border-orange-300',
      }
    }
    switch (task.status) {
      case 'COMPLETED':
        return {
          bg: 'bg-green-200',
          progress: 'bg-green-500',
          border: 'border-green-300',
        }
      case 'IN_PROGRESS':
        return {
          bg: 'bg-blue-200',
          progress: 'bg-blue-500',
          border: 'border-blue-300',
        }
      case 'OVERDUE':
        return {
          bg: 'bg-red-200',
          progress: 'bg-red-500',
          border: 'border-red-300',
        }
      default:
        return {
          bg: 'bg-gray-200',
          progress: 'bg-gray-400',
          border: 'border-gray-300',
        }
    }
  }

  // Scroll to first task on mount
  useEffect(() => {
    if (containerRef.current && validTasks.length > 0) {
      const firstTask = validTasks[0]
      const startOffset = differenceInDays(firstTask.startDate, minDate)
      const scrollTo = Math.max(0, startOffset * columnWidth - 100)
      containerRef.current.scrollLeft = scrollTo
    }
  }, [validTasks, minDate, columnWidth])

  // Scroll to selected task
  useEffect(() => {
    if (containerRef.current && selectedTaskId) {
      const task = validTasks.find((t) => t.id === selectedTaskId)
      if (task) {
        const startOffset = differenceInDays(task.startDate, minDate)
        const scrollTo = Math.max(0, startOffset * columnWidth - 200)
        containerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
      }
    }
  }, [selectedTaskId, validTasks, minDate, columnWidth])

  if (validTasks.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No tasks with dates to display
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      {/* Zoom Controls */}
      <div className="flex items-center justify-end gap-2 p-2 border-b border-gray-200 bg-gray-50">
        <span className="text-xs text-gray-500 mr-2">Zoom:</span>
        <button
          onClick={() => setZoomLevel('month')}
          className={`px-2 py-1 text-xs rounded ${
            zoomLevel === 'month'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Month
        </button>
        <button
          onClick={() => setZoomLevel('week')}
          className={`px-2 py-1 text-xs rounded ${
            zoomLevel === 'week'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Week
        </button>
        <button
          onClick={() => setZoomLevel('day')}
          className={`px-2 py-1 text-xs rounded ${
            zoomLevel === 'day'
              ? 'bg-primary-100 text-primary-700'
              : 'bg-white text-gray-600 hover:bg-gray-100'
          }`}
        >
          Day
        </button>
      </div>

      {/* Gantt Chart */}
      <div className="flex flex-1 overflow-hidden">
        {/* Task Names Column */}
        <div className="flex-shrink-0 w-64 border-r border-gray-200 bg-white z-10">
          {/* Header */}
          <div
            className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 flex items-center font-medium text-sm text-gray-700"
            style={{ height: headerHeight }}
          >
            Task
          </div>

          {/* Task List */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100% - ${headerHeight}px)` }}>
            {validTasks.map((task) => (
              <div
                key={task.id}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  onTaskClick?.(task, { x: rect.right, y: rect.top })
                }}
                className={`flex items-center px-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedTaskId === task.id ? 'bg-primary-50' : ''
                }`}
                style={{ height: rowHeight }}
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: task.categoryColor }}
                    />
                    <span className="text-sm truncate" title={task.title}>
                      {task.title}
                    </span>
                  </div>
                  {task.assignee && (
                    <div className="text-xs text-gray-400 truncate">{task.assignee}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Chart Area */}
        <div ref={containerRef} className="flex-1 overflow-auto">
          <div style={{ width: chartWidth, minHeight: '100%' }}>
            {/* Date Header */}
            <div
              className="sticky top-0 bg-gray-50 border-b border-gray-200 flex z-10"
              style={{ height: headerHeight }}
            >
              {dateColumns.map((col, i) => (
                <div
                  key={i}
                  className={`flex-shrink-0 border-r border-gray-200 flex items-end justify-center pb-1 text-xs ${
                    col.isWeekend ? 'bg-gray-100' : ''
                  }`}
                  style={{ width: columnWidth }}
                >
                  {col.label && (
                    <span className="text-gray-600 truncate px-0.5">{col.label}</span>
                  )}
                </div>
              ))}
            </div>

            {/* Rows */}
            <div className="relative">
              {/* Grid lines */}
              <div className="absolute inset-0 flex pointer-events-none">
                {dateColumns.map((col, i) => (
                  <div
                    key={i}
                    className={`flex-shrink-0 border-r ${
                      col.isWeekend ? 'bg-gray-50' : 'bg-white'
                    } ${col.date.getDay() === 1 ? 'border-gray-300' : 'border-gray-100'}`}
                    style={{ width: columnWidth, height: validTasks.length * rowHeight }}
                  />
                ))}
              </div>

              {/* Today line */}
              {(() => {
                const today = startOfDay(new Date())
                const todayOffset = differenceInDays(today, minDate)
                if (todayOffset >= 0 && todayOffset < totalDays) {
                  return (
                    <div
                      className="absolute top-0 bottom-0 w-0.5 bg-red-500 z-20"
                      style={{
                        left: todayOffset * columnWidth + columnWidth / 2,
                        height: validTasks.length * rowHeight,
                      }}
                    />
                  )
                }
                return null
              })()}

              {/* Task Bars */}
              {validTasks.map((task, index) => {
                const { left, width } = getBarStyle(task)
                const colors = getStatusColor(task)

                return (
                  <div
                    key={task.id}
                    className="absolute"
                    style={{
                      top: index * rowHeight + 6,
                      left: left + 2,
                      height: rowHeight - 12,
                    }}
                  >
                    {/* Bar background */}
                    <div
                      onClick={(e) => {
                        const rect = e.currentTarget.getBoundingClientRect()
                        onTaskClick?.(task, { x: rect.left, y: rect.top })
                      }}
                      className={`h-full rounded cursor-pointer border ${colors.bg} ${colors.border} ${
                        selectedTaskId === task.id ? 'ring-2 ring-primary-500' : ''
                      } hover:opacity-90 transition-opacity relative overflow-hidden`}
                      style={{ width }}
                      title={`${task.title}\n${format(task.startDate, 'MMM d, yyyy')} - ${format(
                        task.endDate,
                        'MMM d, yyyy'
                      )}\nProgress: ${task.progress}%`}
                    >
                      {/* Progress bar */}
                      <div
                        className={`absolute inset-y-0 left-0 ${colors.progress} opacity-60`}
                        style={{ width: `${task.progress}%` }}
                      />

                      {/* Label */}
                      {width > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-700 font-medium truncate z-10">
                          {task.progress > 0 && `${task.progress}%`}
                        </span>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
