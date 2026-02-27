'use client'

import { useState, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, formatDistanceToNow } from 'date-fns'
import {
  Calendar,
  AlertTriangle,
  Link2,
  RefreshCw,
  X,
  List,
  LayoutGrid,
  MessageSquare,
  Send,
  Loader2,
} from 'lucide-react'
import { ScheduleGanttChart } from './schedule-gantt-chart'

// Types for schedule data
interface ScheduleWBS {
  id: string
  code: string
  name: string
  parentId: string | null
  sortOrder: number
  isExpanded: boolean
}

interface ScheduleActivity {
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
  wbs: ScheduleWBS | null
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

interface ScheduleData {
  activities: ScheduleActivity[]
  wbs: ScheduleWBS[]
  stats: {
    totalActivities: number
    completedActivities: number
    inProgressActivities: number
    notStartedActivities: number
    criticalActivities: number
    overallProgress: number
  }
  dateRange: {
    minDate: string | null
    maxDate: string | null
  }
  latestImport: {
    id: string
    fileName: string
    importedAt: string
    activitiesCount: number
    xerProjectName: string | null
  } | null
}

interface ScheduleGanttProps {
  projectId: string
}

interface ActivityComment {
  id: string
  content: string
  createdAt: string
  author: {
    id: string
    firstName: string
    lastName: string
    email: string
    avatar: string | null
  }
}

async function fetchScheduleData(projectId: string): Promise<ScheduleData> {
  const token = document.cookie
    .split('; ')
    .find((row) => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch(`/api/project/${projectId}/schedule`, {
    headers: {
      Authorization: `Bearer ${token}`,
      Cookie: document.cookie,
    },
  })

  if (!response.ok) {
    throw new Error('Failed to fetch schedule data')
  }

  return response.json()
}

export function ScheduleGantt({ projectId }: ScheduleGanttProps) {
  const [selectedActivity, setSelectedActivity] = useState<ScheduleActivity | null>(null)
  const [showDetailPanel, setShowDetailPanel] = useState(false)
  const [isClosing, setIsClosing] = useState(false)
  const [panelPosition, setPanelPosition] = useState({ x: 0, y: 0 })
  const [showActivityList, setShowActivityList] = useState(false)
  const [activityFilter, setActivityFilter] = useState('')
  const [newComment, setNewComment] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const queryClient = useQueryClient()

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['project-schedule', projectId],
    queryFn: () => fetchScheduleData(projectId),
  })

  // Fetch comments for selected activity
  const { data: comments, isLoading: commentsLoading } = useQuery({
    queryKey: ['activity-comments', selectedActivity?.id],
    queryFn: async () => {
      if (!selectedActivity) return []
      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/schedule-activity/${selectedActivity.id}/comments`, {
        headers: {
          Authorization: `Bearer ${token}`,
          Cookie: document.cookie,
        },
      })

      if (!response.ok) {
        throw new Error('Failed to fetch comments')
      }

      return response.json() as Promise<ActivityComment[]>
    },
    enabled: !!selectedActivity,
  })

  // Mutation to add a comment
  const addCommentMutation = useMutation({
    mutationFn: async (content: string) => {
      if (!selectedActivity) throw new Error('No activity selected')

      const token = document.cookie
        .split('; ')
        .find((row) => row.startsWith('auth-token='))
        ?.split('=')[1]

      const response = await fetch(`/api/schedule-activity/${selectedActivity.id}/comments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
          Cookie: document.cookie,
        },
        body: JSON.stringify({ content }),
      })

      if (!response.ok) {
        throw new Error('Failed to add comment')
      }

      return response.json()
    },
    onSuccess: () => {
      setNewComment('')
      queryClient.invalidateQueries({ queryKey: ['activity-comments', selectedActivity?.id] })
    },
  })

  const handleAddComment = () => {
    if (newComment.trim()) {
      addCommentMutation.mutate(newComment.trim())
    }
  }

  const handleActivityClick = (activity: ScheduleActivity, clickPosition: { x: number; y: number }) => {
    // Calculate position relative to container
    if (containerRef.current) {
      const containerRect = containerRef.current.getBoundingClientRect()
      const relativeY = clickPosition.y - containerRect.top

      // Ensure panel doesn't go off screen
      const maxY = containerRect.height - 550 // approximate panel height with comments
      const adjustedY = Math.max(0, Math.min(relativeY, maxY))

      setPanelPosition({ x: clickPosition.x, y: adjustedY })
    }

    setSelectedActivity(activity)
    setNewComment('') // Reset comment input when switching activities
    setIsClosing(false)
    setShowDetailPanel(true)
  }

  const handleClosePanel = () => {
    setIsClosing(true)
    setTimeout(() => {
      setShowDetailPanel(false)
      setSelectedActivity(null)
      setIsClosing(false)
      setNewComment('')
    }, 200) // match animation duration
  }

  const handleListActivityClick = (activity: ScheduleActivity) => {
    setSelectedActivity(activity)
    setShowActivityList(false)
  }

  const getStatusBadge = (status: ScheduleActivity['status']) => {
    switch (status) {
      case 'COMPLETED':
        return <span className="px-2 py-0.5 text-xs bg-green-100 text-green-700 rounded-full">Completed</span>
      case 'IN_PROGRESS':
        return <span className="px-2 py-0.5 text-xs bg-blue-100 text-blue-700 rounded-full">In Progress</span>
      default:
        return <span className="px-2 py-0.5 text-xs bg-gray-100 text-gray-700 rounded-full">Not Started</span>
    }
  }

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="h-96 bg-gray-200 rounded"></div>
        </div>
      </div>
    )
  }

  if (error || !data) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No Schedule Data</p>
          <p className="text-sm mt-1">Import an XER file to view the schedule Gantt chart.</p>
        </div>
      </div>
    )
  }

  if (data.activities.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="text-center text-gray-500">
          <Calendar className="h-12 w-12 mx-auto mb-3 text-gray-400" />
          <p className="font-medium">No Schedule Activities</p>
          <p className="text-sm mt-1">Import an XER file from Project Settings to populate the schedule.</p>
        </div>
      </div>
    )
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <Calendar className="h-5 w-5 text-primary-600" />
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Project Schedule</h2>
              {data.latestImport && (
                <p className="text-xs text-gray-500">
                  {data.latestImport.xerProjectName || data.latestImport.fileName} - Imported{' '}
                  {format(new Date(data.latestImport.importedAt), 'MMM dd, yyyy')}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            {/* Stats badges */}
            <div className="hidden md:flex items-center space-x-2 text-xs">
              <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded">
                {data.stats.totalActivities} activities
              </span>
              <span className="px-2 py-1 bg-green-100 text-green-700 rounded">
                {data.stats.overallProgress}% complete
              </span>
              {data.stats.criticalActivities > 0 && (
                <span className="px-2 py-1 bg-red-100 text-red-700 rounded flex items-center gap-1">
                  <AlertTriangle className="h-3 w-3" />
                  {data.stats.criticalActivities} critical
                </span>
              )}
            </div>

            {/* View Toggle */}
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setShowActivityList(false)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  !showActivityList
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <LayoutGrid className="h-3.5 w-3.5" />
                Gantt
              </button>
              <button
                onClick={() => setShowActivityList(true)}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium transition-colors ${
                  showActivityList
                    ? 'bg-white text-primary-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <List className="h-3.5 w-3.5" />
                List
              </button>
            </div>

            {/* Refresh button */}
            <button
              onClick={() => refetch()}
              className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg"
              title="Refresh schedule"
            >
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Activity List View */}
      {showActivityList && (
        <div>
          {/* Search/Filter Bar */}
          <div className="p-3 border-b border-gray-200 bg-gray-50">
            <input
              type="text"
              placeholder="Search activities..."
              value={activityFilter}
              onChange={(e) => setActivityFilter(e.target.value)}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>

          {/* Activity Table */}
          <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
            <table className="w-full text-sm">
              <thead className="bg-gray-50 sticky top-0">
                <tr className="border-b border-gray-200">
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Activity ID</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Name</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Progress</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Start</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Finish</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Duration</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-700">Float</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {data.activities
                  .filter((activity) => {
                    if (!activityFilter) return true
                    const search = activityFilter.toLowerCase()
                    return (
                      activity.activityId.toLowerCase().includes(search) ||
                      activity.name.toLowerCase().includes(search) ||
                      activity.wbs?.name.toLowerCase().includes(search)
                    )
                  })
                  .map((activity) => (
                    <tr
                      key={activity.id}
                      onClick={() => handleListActivityClick(activity)}
                      className={`hover:bg-gray-50 cursor-pointer ${
                        activity.isCritical ? 'bg-red-50' : ''
                      }`}
                    >
                      <td className="px-4 py-3 font-mono text-xs">{activity.activityId}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          {activity.isCritical && (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-500 flex-shrink-0" />
                          )}
                          <span className="truncate max-w-xs">{activity.name}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">{getStatusBadge(activity.status)}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-16 bg-gray-200 rounded-full h-1.5">
                            <div
                              className={`h-1.5 rounded-full ${
                                activity.isCritical ? 'bg-red-500' : 'bg-primary-500'
                              }`}
                              style={{ width: `${activity.percentComplete}%` }}
                            />
                          </div>
                          <span className="text-xs text-gray-600">{activity.percentComplete}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {activity.plannedStart
                          ? format(new Date(activity.plannedStart), 'MMM dd, yyyy')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {activity.plannedFinish
                          ? format(new Date(activity.plannedFinish), 'MMM dd, yyyy')
                          : '-'}
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {activity.plannedDuration
                          ? `${Math.round(activity.plannedDuration / 8)}d`
                          : '-'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`${
                            activity.totalFloat !== null && activity.totalFloat <= 0
                              ? 'text-red-600 font-medium'
                              : 'text-gray-600'
                          }`}
                        >
                          {activity.totalFloat !== null
                            ? `${Math.round(activity.totalFloat / 8)}d`
                            : '-'}
                        </span>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Gantt Chart View */}
      {!showActivityList && (
        <div ref={containerRef} className="relative" style={{ height: '600px' }}>
          <ScheduleGanttChart
            activities={data.activities}
            onActivityClick={handleActivityClick}
            selectedActivityId={selectedActivity?.id}
          />

          {/* Activity Detail Panel - Positioned near click */}
          {showDetailPanel && selectedActivity && (
            <div
              className={`absolute w-80 bg-white border border-gray-200 rounded-lg shadow-2xl overflow-hidden z-30 transition-all duration-200 ease-out ${
                isClosing
                  ? 'opacity-0 scale-95 translate-x-2'
                  : 'opacity-100 scale-100 translate-x-0'
              }`}
              style={{
                top: panelPosition.y,
                right: 16,
                maxHeight: 'calc(100% - 32px)',
              }}
            >
              <div className="p-3 border-b border-gray-200 bg-gray-50 flex items-center justify-between">
                <h3 className="font-semibold text-gray-900 text-sm">Activity Details</h3>
                <button
                  onClick={handleClosePanel}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                >
                  <X className="h-4 w-4 text-gray-500" />
                </button>
              </div>

              <div className="p-4 space-y-4 overflow-y-auto" style={{ maxHeight: '500px' }}>
                {/* Activity ID and Name */}
                <div>
                  <p className="text-xs text-gray-500 mb-1">Activity ID</p>
                  <p className="font-mono text-sm">{selectedActivity.activityId}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-500 mb-1">Name</p>
                  <p className="text-sm font-medium">{selectedActivity.name}</p>
                </div>

                {/* Status and Progress */}
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Status</p>
                    {getStatusBadge(selectedActivity.status)}
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-500 mb-1">Progress</p>
                    <p className="text-lg font-semibold text-primary-600">
                      {selectedActivity.percentComplete}%
                    </p>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${
                      selectedActivity.isCritical ? 'bg-red-500' : 'bg-primary-500'
                    }`}
                    style={{ width: `${selectedActivity.percentComplete}%` }}
                  />
                </div>

                {/* Critical Path Indicator */}
                {selectedActivity.isCritical && (
                  <div className="flex items-center gap-2 p-2 bg-red-50 text-red-700 rounded text-sm">
                    <AlertTriangle className="h-4 w-4" />
                    <span>Critical Path Activity</span>
                  </div>
                )}

                {/* Dates */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Planned Start</p>
                    <p className="text-sm">
                      {selectedActivity.plannedStart
                        ? format(new Date(selectedActivity.plannedStart), 'MMM dd, yyyy')
                        : '-'}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Planned Finish</p>
                    <p className="text-sm">
                      {selectedActivity.plannedFinish
                        ? format(new Date(selectedActivity.plannedFinish), 'MMM dd, yyyy')
                        : '-'}
                    </p>
                  </div>
                  {selectedActivity.actualStart && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Actual Start</p>
                      <p className="text-sm">
                        {format(new Date(selectedActivity.actualStart), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                  {selectedActivity.actualFinish && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Actual Finish</p>
                      <p className="text-sm">
                        {format(new Date(selectedActivity.actualFinish), 'MMM dd, yyyy')}
                      </p>
                    </div>
                  )}
                </div>

                {/* Duration and Float */}
                <div className="grid grid-cols-2 gap-4">
                  {selectedActivity.plannedDuration && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Duration</p>
                      <p className="text-sm">{Math.round(selectedActivity.plannedDuration / 8)} days</p>
                    </div>
                  )}
                  {selectedActivity.remainingDuration !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Remaining</p>
                      <p className="text-sm">{Math.round(selectedActivity.remainingDuration / 8)} days</p>
                    </div>
                  )}
                  {selectedActivity.totalFloat !== null && (
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Total Float</p>
                      <p
                        className={`text-sm ${
                          selectedActivity.totalFloat <= 0 ? 'text-red-600 font-semibold' : ''
                        }`}
                      >
                        {Math.round(selectedActivity.totalFloat / 8)} days
                      </p>
                    </div>
                  )}
                </div>

                {/* WBS */}
                {selectedActivity.wbs && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">WBS</p>
                    <p className="text-sm">
                      {selectedActivity.wbs.code} - {selectedActivity.wbs.name}
                    </p>
                  </div>
                )}

                {/* Predecessors */}
                {selectedActivity.predecessors.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2">Predecessors</p>
                    <div className="space-y-1">
                      {selectedActivity.predecessors.map((pred) => (
                        <div
                          key={pred.id}
                          className="flex items-center justify-between text-xs bg-gray-50 p-2 rounded"
                        >
                          <span className="truncate flex-1">{pred.predecessor.name}</span>
                          <span className="ml-2 text-gray-500">{pred.type}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Linked Items */}
                {(selectedActivity.linkedTask || selectedActivity.linkedMilestone) && (
                  <div>
                    <p className="text-xs text-gray-500 mb-2 flex items-center gap-1">
                      <Link2 className="h-3 w-3" />
                      Linked Items
                    </p>
                    {selectedActivity.linkedTask && (
                      <div className="text-xs bg-blue-50 text-blue-700 p-2 rounded mb-1">
                        Task: {selectedActivity.linkedTask.title}
                      </div>
                    )}
                    {selectedActivity.linkedMilestone && (
                      <div className="text-xs bg-purple-50 text-purple-700 p-2 rounded">
                        Milestone: {selectedActivity.linkedMilestone.title}
                      </div>
                    )}
                  </div>
                )}

                {/* Comments Section */}
                <div className="border-t border-gray-200 pt-4 mt-4">
                  <p className="text-xs text-gray-500 mb-3 flex items-center gap-1">
                    <MessageSquare className="h-3 w-3" />
                    Comments
                    {comments && comments.length > 0 && (
                      <span className="ml-1 px-1.5 py-0.5 bg-gray-100 rounded-full text-xs">
                        {comments.length}
                      </span>
                    )}
                  </p>

                  {/* Add Comment Form */}
                  <div className="flex gap-2 mb-3">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="Add a comment..."
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault()
                          handleAddComment()
                        }
                      }}
                      disabled={addCommentMutation.isPending}
                    />
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || addCommentMutation.isPending}
                      className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      {addCommentMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>

                  {/* Comments List */}
                  {commentsLoading ? (
                    <div className="flex items-center justify-center py-4">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                    </div>
                  ) : comments && comments.length > 0 ? (
                    <div className="space-y-3 max-h-48 overflow-y-auto">
                      {comments.map((comment) => {
                        const authorName = `${comment.author.firstName} ${comment.author.lastName}`.trim()
                        return (
                          <div key={comment.id} className="bg-gray-50 rounded-lg p-3">
                            <div className="flex items-center gap-2 mb-1">
                              {comment.author.avatar ? (
                                <img
                                  src={comment.author.avatar}
                                  alt={authorName}
                                  className="w-5 h-5 rounded-full"
                                />
                              ) : (
                                <div className="w-5 h-5 rounded-full bg-primary-100 flex items-center justify-center text-xs font-medium text-primary-700">
                                  {comment.author.firstName?.charAt(0) || comment.author.email.charAt(0)}
                                </div>
                              )}
                              <span className="text-xs font-medium text-gray-700">
                                {authorName || comment.author.email}
                              </span>
                              <span className="text-xs text-gray-400">
                                {formatDistanceToNow(new Date(comment.createdAt), { addSuffix: true })}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600 whitespace-pre-wrap">{comment.content}</p>
                          </div>
                        )
                      })}
                    </div>
                  ) : (
                    <p className="text-xs text-gray-400 text-center py-2">No comments yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

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
            <span>Critical Path</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-0.5 h-4 bg-red-500" />
            <span>Today</span>
          </div>
        </div>
      </div>
    </div>
  )
}
