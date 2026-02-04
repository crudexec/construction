'use client'

import { Calendar, Users, Activity, Plus, FileText, CheckSquare, MessageSquare, Upload, UserPlus, Edit3, TrendingUp, DollarSign, Target } from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'
import { MilestoneCard } from './milestone-card'

interface ProjectOverviewProps {
  project: any
  onAddTask?: () => void
  onTeamClick?: () => void
  progress?: number
  totalTasks?: number
  completedTasks?: number
  inProgressTasks?: number
  milestones?: any[]
  onAddMilestone?: () => void
  onEditMilestone?: (milestone: any) => void
  onViewMilestoneTasks?: (milestoneId: string) => void
}

export function ProjectOverview({
  project,
  onAddTask,
  onTeamClick,
  progress = 0,
  totalTasks = 0,
  completedTasks = 0,
  inProgressTasks = 0,
  milestones = [],
  onAddMilestone,
  onEditMilestone,
  onViewMilestoneTasks
}: ProjectOverviewProps) {
  const { format: formatCurrency } = useCurrency()
  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
        {/* Progress Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Progress</span>
            <TrendingUp className="h-4 w-4 text-emerald-500" />
          </div>
          <div className="flex items-end gap-2 mb-3">
            <span className="text-3xl font-bold text-slate-900">{progress}</span>
            <span className="text-lg text-slate-500 mb-1">%</span>
          </div>
          <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-400 rounded-full transition-all duration-1000 ease-out"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>

        {/* Tasks Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Tasks</span>
            <CheckSquare className="h-4 w-4 text-blue-500" />
          </div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-bold text-slate-900">{completedTasks}</span>
            <span className="text-lg text-slate-500 mb-1">/ {totalTasks}</span>
          </div>
          <p className="text-xs text-slate-500">{inProgressTasks} in progress</p>
        </div>

        {/* Budget Card */}
        <div className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Budget</span>
            <DollarSign className="h-4 w-4 text-amber-500" />
          </div>
          <div className="flex items-end gap-1">
            <span className="text-3xl font-bold text-slate-900">
              {formatCurrency(project.budget, { compact: true })}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">Total budget</p>
        </div>

        {/* Team Card */}
        <div
          className="bg-white rounded-xl p-4 border border-slate-200 hover:shadow-md transition-all group cursor-pointer"
          onClick={onTeamClick}
        >
          <div className="flex items-center justify-between mb-3">
            <span className="text-xs font-medium text-slate-600 uppercase tracking-wider">Team</span>
            <Users className="h-4 w-4 text-purple-500" />
          </div>
          <div className="flex items-end gap-2 mb-1">
            <span className="text-3xl font-bold text-slate-900">{project.team?.length || 1}</span>
          </div>
          <p className="text-xs text-slate-500">Team members</p>
        </div>
      </div>
      {/* Team Members - Mobile Responsive */}
      {project.assignedUsers?.length > 0 && (
        <div id="team-members" className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <Users className="h-4 w-4 mr-2" />
              <span className="hidden sm:inline">Team Members ({project.assignedUsers.length})</span>
              <span className="sm:hidden">Team ({project.assignedUsers.length})</span>
            </h3>
            <button 
              onClick={() => alert('Add team member functionality would open a modal here')}
              className="bg-indigo-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold hover:bg-indigo-700 flex items-center space-x-1">
              <Plus className="h-3 w-3" />
              <span className="hidden sm:inline">Add Member</span>
              <span className="sm:hidden">Add</span>
            </button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
            {project.assignedUsers.map((user: any) => (
              <div key={user.id} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <div className="w-6 h-6 bg-primary-600 rounded-full flex items-center justify-center text-white text-xs font-semibold">
                  {user.firstName[0]}{user.lastName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-medium text-gray-900 truncate">{user.firstName} {user.lastName}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Milestones Section */}
      {milestones && milestones.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <Target className="h-4 w-4 mr-2" />
              <span>Milestones ({milestones.length})</span>
            </h3>
            {onAddMilestone && (
              <button
                onClick={onAddMilestone}
                className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700 flex items-center space-x-1"
              >
                <Plus className="h-3 w-3" />
                <span className="hidden sm:inline">Add Milestone</span>
                <span className="sm:hidden">Add</span>
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {milestones.map((milestone) => (
              <MilestoneCard
                key={milestone.id}
                milestone={milestone}
                onEdit={onEditMilestone}
                onViewTasks={onViewMilestoneTasks}
              />
            ))}
          </div>
        </div>
      )}

      {/* Compact Recent Activity - Mobile Responsive */}
      {project.activities?.length > 0 && (
        <div className="bg-white rounded-lg shadow p-3 sm:p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3 flex items-center">
            <Activity className="h-4 w-4 mr-2" />
            <span className="hidden sm:inline">Recent Activity</span>
            <span className="sm:hidden">Activity</span>
          </h3>
          <div className="space-y-2">
            {project.activities.slice(0, 5).map((activity: any) => {
              // Function to get activity icon and color based on activity type
              const getActivityIcon = (activityType: string, description: string) => {
                const type = activityType?.toLowerCase() || description?.toLowerCase() || ''
                
                if (type.includes('task') || type.includes('complete')) {
                  return { icon: CheckSquare, color: 'text-green-500', bg: 'bg-green-100' }
                } else if (type.includes('file') || type.includes('upload') || type.includes('document')) {
                  return { icon: Upload, color: 'text-blue-500', bg: 'bg-blue-100' }
                } else if (type.includes('comment') || type.includes('message') || type.includes('note')) {
                  return { icon: MessageSquare, color: 'text-purple-500', bg: 'bg-purple-100' }
                } else if (type.includes('user') || type.includes('assign') || type.includes('team')) {
                  return { icon: UserPlus, color: 'text-indigo-500', bg: 'bg-indigo-100' }
                } else if (type.includes('edit') || type.includes('update') || type.includes('change')) {
                  return { icon: Edit3, color: 'text-orange-500', bg: 'bg-orange-100' }
                } else if (type.includes('estimate') || type.includes('budget') || type.includes('invoice')) {
                  return { icon: FileText, color: 'text-emerald-500', bg: 'bg-emerald-100' }
                } else if (type.includes('schedule') || type.includes('deadline') || type.includes('date')) {
                  return { icon: Calendar, color: 'text-pink-500', bg: 'bg-pink-100' }
                } else {
                  return { icon: Activity, color: 'text-gray-500', bg: 'bg-gray-100' }
                }
              }
              
              const { icon: IconComponent, color, bg } = getActivityIcon(activity.type, activity.description)
              
              return (
                <div key={activity.id} className="flex items-start space-x-2 p-2 bg-gray-50 rounded">
                  <div className={`w-5 h-5 ${bg} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <IconComponent className={`h-3 w-3 ${color}`} />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-gray-900">{activity.description}</p>
                    <div className="flex items-center space-x-2 text-xs text-gray-500 mt-1">
                      <span>{activity.user.firstName} {activity.user.lastName}</span>
                      <span>•</span>
                      <span>{new Date(activity.createdAt).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}