'use client'

import { Calendar, DollarSign, MapPin, Phone, Mail, Users, Clock, Activity, Plus, FileText, CheckSquare, MessageSquare, Upload, UserPlus, Edit3, Target, TrendingUp, AlertCircle } from 'lucide-react'

interface ProjectOverviewProps {
  project: any
  onAddTask?: () => void
}

export function ProjectOverview({ project, onAddTask }: ProjectOverviewProps) {
  return (
    <div className="space-y-3">
      {/* Compact Project Information - Mobile Responsive */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Combined Project & Client Details */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-3">
            <h3 className="text-sm font-semibold text-gray-900">Project & Client Details</h3>
            {project.contactEmail && (
              <div className="flex gap-2">
                <a href={`mailto:${project.contactEmail}`} className="bg-blue-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold hover:bg-blue-700 flex items-center space-x-1">
                  <Mail className="h-3 w-3" />
                  <span>Email</span>
                </a>
                {project.contactPhone && (
                  <a href={`tel:${project.contactPhone}`} className="bg-green-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold hover:bg-green-700 flex items-center space-x-1">
                    <Phone className="h-3 w-3" />
                    <span>Call</span>
                  </a>
                )}
              </div>
            )}
          </div>
          <div className="space-y-3">
            {project.description && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                <p className="text-sm text-gray-900">{project.description}</p>
              </div>
            )}
            
            {project.projectAddress && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Location</label>
                <div className="flex items-center text-sm text-gray-900">
                  <MapPin className="h-3 w-3 mr-1 text-gray-500" />
                  <span>
                    {project.projectAddress}
                    {project.projectCity && `, ${project.projectCity}`}
                    {project.projectState && `, ${project.projectState}`}
                    {project.projectZipCode && ` ${project.projectZipCode}`}
                  </span>
                </div>
              </div>
            )}

            {(project.startDate || project.endDate) && (
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">Timeline</label>
                <div className="flex items-center text-sm text-gray-900">
                  <Calendar className="h-3 w-3 mr-1 text-gray-500" />
                  <span>
                    {project.startDate && new Date(project.startDate).toLocaleDateString()}
                    {project.startDate && project.endDate && ' - '}
                    {project.endDate && new Date(project.endDate).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            {/* Client Info Section */}
            <div className="pt-2 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {project.contactName && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Client</label>
                    <p className="text-sm text-gray-900">{project.contactName}</p>
                  </div>
                )}
                
                {project.contactEmail && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Email</label>
                    <p className="text-sm text-gray-900 truncate">{project.contactEmail}</p>
                  </div>
                )}
                
                {project.contactPhone && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Phone</label>
                    <p className="text-sm text-gray-900">{project.contactPhone}</p>
                  </div>
                )}
                
                {project.budget && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700">Budget</label>
                    <p className="text-sm text-gray-900 font-semibold">${(project.budget || 0).toLocaleString()}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Task Summary Widget */}
        <div className="bg-white rounded-lg shadow p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-900 flex items-center">
              <CheckSquare className="h-4 w-4 mr-2" />
              Task Summary
            </h3>
            <button 
              onClick={onAddTask || (() => alert('Add task functionality would navigate to tasks tab'))}
              className="bg-primary-600 text-white px-2 sm:px-3 py-1 rounded text-xs font-semibold hover:bg-primary-700 flex items-center space-x-1">
              <Plus className="h-3 w-3" />
              <span>Add Task</span>
            </button>
          </div>

          {/* Task Stats */}
          <div className="grid grid-cols-2 gap-3 mb-3">
            <div className="text-center p-2 bg-blue-50 rounded">
              <Target className="h-4 w-4 text-blue-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Total Tasks</p>
              <p className="text-lg font-semibold text-gray-900">{project.metrics?.totalTasks || 0}</p>
            </div>
            
            <div className="text-center p-2 bg-green-50 rounded">
              <CheckSquare className="h-4 w-4 text-green-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Completed</p>
              <p className="text-lg font-semibold text-gray-900">{project.metrics?.completedTasks || 0}</p>
            </div>
            
            <div className="text-center p-2 bg-yellow-50 rounded">
              <Clock className="h-4 w-4 text-yellow-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">In Progress</p>
              <p className="text-lg font-semibold text-gray-900">
                {(project.metrics?.totalTasks || 0) - (project.metrics?.completedTasks || 0)}
              </p>
            </div>
            
            <div className="text-center p-2 bg-purple-50 rounded">
              <TrendingUp className="h-4 w-4 text-purple-500 mx-auto mb-1" />
              <p className="text-xs text-gray-600">Progress</p>
              <p className="text-lg font-semibold text-gray-900">{project.metrics?.progress || 0}%</p>
            </div>
          </div>

          {/* Progress Bar */}
          <div className="mb-3">
            <div className="flex justify-between text-xs text-gray-600 mb-1">
              <span>Overall Progress</span>
              <span>{project.metrics?.progress || 0}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${
                  (project.metrics?.progress || 0) >= 90 ? 'bg-green-500' :
                  (project.metrics?.progress || 0) >= 70 ? 'bg-blue-500' :
                  (project.metrics?.progress || 0) >= 50 ? 'bg-yellow-500' :
                  'bg-red-500'
                }`}
                style={{ width: `${project.metrics?.progress || 0}%` }}
              />
            </div>
          </div>

          {/* Overdue Tasks Alert */}
          {project.overdueTasks > 0 && (
            <div className="p-2 bg-red-50 rounded flex items-center space-x-2">
              <AlertCircle className="h-4 w-4 text-red-500" />
              <span className="text-xs text-red-700">
                {project.overdueTasks} task{project.overdueTasks > 1 ? 's' : ''} overdue
              </span>
            </div>
          )}
        </div>
      </div>


      {/* Compact Team Members - Mobile Responsive */}
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