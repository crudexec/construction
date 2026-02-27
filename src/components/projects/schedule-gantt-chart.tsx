'use client'

import { useMemo, useRef, useEffect, useState } from 'react'
import { format, differenceInDays, addDays, startOfDay } from 'date-fns'
import { ChevronLeft, ChevronRight, ZoomIn, ZoomOut } from 'lucide-react'

interface GanttActivity {
  id: string
  activityId: string
  name: string
  status: 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED'
  percentComplete: number
  plannedStart: string | null
  plannedFinish: string | null
  actualStart: string | null
  actualFinish: string | null
  plannedDuration: number | null
  remainingDuration: number | null
  totalFloat: number | null
  isCritical: boolean
  wbs: { id: string; code: string; name: string; parentId: string | null; sortOrder: number; isExpanded: boolean } | null
  predecessors: Array<{
    id: string
    type: string
    predecessor: {
      id: string
      activityId: string
      name: string
    }
  }>
  linkedTask: { id: string; title: string; status: string } | null
  linkedMilestone: { id: string; title: string; status: string } | null
}

interface ScheduleGanttChartProps {
  activities: GanttActivity[]
  onActivityClick?: (activity: GanttActivity, clickPosition: { x: number; y: number }) => void
  selectedActivityId?: string | null
}

type ZoomLevel = 'day' | 'week' | 'month'

export function ScheduleGanttChart({
  activities,
  onActivityClick,
  selectedActivityId,
}: ScheduleGanttChartProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [zoomLevel, setZoomLevel] = useState<ZoomLevel>('week')
  const [scrollLeft, setScrollLeft] = useState(0)

  // Filter activities that have dates
  const validActivities = useMemo(() => {
    return activities.filter((a) => a.plannedStart && a.plannedFinish)
  }, [activities])

  // Calculate date range
  const { minDate, maxDate, totalDays } = useMemo(() => {
    if (validActivities.length === 0) {
      const today = new Date()
      return {
        minDate: today,
        maxDate: addDays(today, 30),
        totalDays: 30,
      }
    }

    let min = new Date(validActivities[0].plannedStart!)
    let max = new Date(validActivities[0].plannedFinish!)

    validActivities.forEach((activity) => {
      const start = new Date(activity.actualStart || activity.plannedStart!)
      const end = new Date(activity.actualFinish || activity.plannedFinish!)
      if (start < min) min = start
      if (end > max) max = end
    })

    // Add padding
    min = addDays(startOfDay(min), -7)
    max = addDays(startOfDay(max), 14)

    return {
      minDate: min,
      maxDate: max,
      totalDays: differenceInDays(max, min) + 1,
    }
  }, [validActivities])

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
  const getBarStyle = (activity: GanttActivity) => {
    const start = new Date(activity.actualStart || activity.plannedStart!)
    const end = new Date(activity.actualFinish || activity.plannedFinish!)

    const startOffset = differenceInDays(start, minDate)
    const duration = differenceInDays(end, start) + 1

    const left = startOffset * columnWidth
    const width = Math.max(duration * columnWidth - 4, 8)

    return { left, width }
  }

  // Get status color
  const getStatusColor = (activity: GanttActivity) => {
    if (activity.isCritical) {
      return {
        bg: 'bg-red-200',
        progress: 'bg-red-500',
        border: 'border-red-300',
      }
    }
    switch (activity.status) {
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
      default:
        return {
          bg: 'bg-gray-200',
          progress: 'bg-gray-400',
          border: 'border-gray-300',
        }
    }
  }

  // Scroll to first activity on mount
  useEffect(() => {
    if (containerRef.current && validActivities.length > 0) {
      const firstActivity = validActivities[0]
      const start = new Date(firstActivity.actualStart || firstActivity.plannedStart!)
      const startOffset = differenceInDays(start, minDate)
      const scrollTo = Math.max(0, startOffset * columnWidth - 100)
      containerRef.current.scrollLeft = scrollTo
    }
  }, [validActivities, minDate, columnWidth])

  // Scroll to selected activity
  useEffect(() => {
    if (containerRef.current && selectedActivityId) {
      const activity = validActivities.find((a) => a.id === selectedActivityId)
      if (activity) {
        const start = new Date(activity.actualStart || activity.plannedStart!)
        const startOffset = differenceInDays(start, minDate)
        const scrollTo = Math.max(0, startOffset * columnWidth - 200)
        containerRef.current.scrollTo({ left: scrollTo, behavior: 'smooth' })
      }
    }
  }, [selectedActivityId, validActivities, minDate, columnWidth])

  if (validActivities.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-500">
        No activities with dates to display
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
        {/* Activity Names Column */}
        <div className="flex-shrink-0 w-64 border-r border-gray-200 bg-white z-10">
          {/* Header */}
          <div
            className="sticky top-0 bg-gray-50 border-b border-gray-200 px-3 flex items-center font-medium text-sm text-gray-700"
            style={{ height: headerHeight }}
          >
            Activity
          </div>

          {/* Activity List */}
          <div className="overflow-y-auto" style={{ maxHeight: `calc(100% - ${headerHeight}px)` }}>
            {validActivities.map((activity) => (
              <div
                key={activity.id}
                onClick={(e) => {
                  const rect = e.currentTarget.getBoundingClientRect()
                  onActivityClick?.(activity, { x: rect.right, y: rect.top })
                }}
                className={`flex items-center px-3 border-b border-gray-100 cursor-pointer hover:bg-gray-50 transition-colors ${
                  selectedActivityId === activity.id ? 'bg-primary-50' : ''
                }`}
                style={{ height: rowHeight }}
              >
                <div className="flex-1 min-w-0">
                  <div className="text-sm truncate" title={activity.name}>
                    {activity.isCritical && (
                      <span className="inline-block w-2 h-2 rounded-full bg-red-500 mr-1.5" />
                    )}
                    {activity.name}
                  </div>
                  <div className="text-xs text-gray-400 truncate">{activity.activityId}</div>
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
                    style={{ width: columnWidth, height: validActivities.length * rowHeight }}
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
                        height: validActivities.length * rowHeight,
                      }}
                    />
                  )
                }
                return null
              })()}

              {/* Activity Bars */}
              {validActivities.map((activity, index) => {
                const { left, width } = getBarStyle(activity)
                const colors = getStatusColor(activity)

                return (
                  <div
                    key={activity.id}
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
                        onActivityClick?.(activity, { x: rect.left, y: rect.top })
                      }}
                      className={`h-full rounded cursor-pointer border ${colors.bg} ${colors.border} ${
                        selectedActivityId === activity.id ? 'ring-2 ring-primary-500' : ''
                      } hover:opacity-90 transition-opacity relative overflow-hidden`}
                      style={{ width }}
                      title={`${activity.name}\n${format(
                        new Date(activity.plannedStart!),
                        'MMM d, yyyy'
                      )} - ${format(new Date(activity.plannedFinish!), 'MMM d, yyyy')}\nProgress: ${
                        activity.percentComplete
                      }%`}
                    >
                      {/* Progress bar */}
                      <div
                        className={`absolute inset-y-0 left-0 ${colors.progress} opacity-60`}
                        style={{ width: `${activity.percentComplete}%` }}
                      />

                      {/* Label */}
                      {width > 60 && (
                        <span className="absolute inset-0 flex items-center px-2 text-xs text-gray-700 font-medium truncate z-10">
                          {activity.percentComplete > 0 && `${activity.percentComplete}%`}
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
