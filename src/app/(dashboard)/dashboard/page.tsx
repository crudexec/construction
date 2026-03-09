'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  Building2,
  CheckSquare,
  Users,
  AlertTriangle,
  Clock,
  Calendar,
  Package,
  Truck,
  Activity,
  Plus,
  Target,
  BarChart3,
  Zap,
  ChevronRight,
  AlertCircle,
  X,
  Bell
} from 'lucide-react'
import { useState } from 'react'

async function fetchDashboardData() {
  const token = document.cookie
    .split('; ')
    .find(row => row.startsWith('auth-token='))
    ?.split('=')[1]

  const response = await fetch('/api/dashboard', {
    headers: {
      'Authorization': `Bearer ${token}`,
      'Cookie': document.cookie
    }
  })
  if (!response.ok) throw new Error('Failed to fetch dashboard data')
  return response.json()
}

export default function DashboardPage() {
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    refetchInterval: 60000
  })

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId])
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center">
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          </div>
          <p className="text-slate-500 text-xs">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-10 h-10 text-red-400 mx-auto mb-2" />
          <p className="text-sm text-slate-600">Failed to load dashboard</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}
  const alerts = (data?.alerts || []).filter((a: any) => !dismissedAlerts.includes(a.id))

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  return (
    <div className="space-y-3 pb-6">
      {/* Alerts Banner - Compact */}
      {alerts.length > 0 && (
        <div className="space-y-1">
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between px-3 py-2 rounded border text-xs ${
                alert.type === 'danger'
                  ? 'bg-red-50 border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-2">
                {alert.type === 'danger' ? (
                  <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
                ) : alert.type === 'warning' ? (
                  <Clock className="w-4 h-4 text-amber-600 flex-shrink-0" />
                ) : (
                  <Bell className="w-4 h-4 text-blue-600 flex-shrink-0" />
                )}
                <span className={`font-medium ${
                  alert.type === 'danger' ? 'text-red-900' :
                  alert.type === 'warning' ? 'text-amber-900' : 'text-blue-900'
                }`}>
                  {alert.title}
                </span>
                <span className={`${
                  alert.type === 'danger' ? 'text-red-700' :
                  alert.type === 'warning' ? 'text-amber-700' : 'text-blue-700'
                }`}>
                  {alert.message}
                </span>
              </div>
              <div className="flex items-center gap-1">
                <Link
                  href={alert.link || '#'}
                  className={`px-2 py-0.5 rounded transition-colors ${
                    alert.type === 'danger' ? 'text-red-700 hover:bg-red-100' :
                    alert.type === 'warning' ? 'text-amber-700 hover:bg-amber-100' : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  View
                </Link>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-0.5 rounded hover:bg-white/50 transition-colors"
                >
                  <X className="w-3 h-3 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-3">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-3">
          {/* Active Projects Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="h-4 w-4 text-blue-600" />
                <span className="text-xs font-semibold text-gray-700">Active Projects</span>
                <span className="text-[10px] text-gray-500">{stats.activeProjects || 0} in progress</span>
              </div>
              <Link href="/dashboard/projects" className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>
            {data?.recentProjects?.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600 w-8">#</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Project</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Client</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-20">Tasks</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-24">Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentProjects.slice(0, 5).map((project: any, idx: number) => (
                    <tr
                      key={project.id}
                      className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                      onClick={() => window.location.href = `/dashboard/projects/${project.id}`}
                    >
                      <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                      <td className="px-3 py-1.5 font-medium text-gray-900 truncate max-w-[200px]">
                        {project.title}
                      </td>
                      <td className="px-3 py-1.5 text-gray-600 truncate max-w-[150px]">
                        {project.contactName || '-'}
                      </td>
                      <td className="px-3 py-1.5 text-center text-gray-600">
                        {project.completedTasks}/{project.taskCount}
                      </td>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className={`h-full rounded-full ${
                                project.progress >= 80 ? 'bg-emerald-500' :
                                project.progress >= 50 ? 'bg-blue-500' :
                                project.progress >= 25 ? 'bg-amber-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${project.progress}%` }}
                            />
                          </div>
                          <span className="text-gray-600 w-8 text-right">{project.progress}%</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center">
                <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No active projects</p>
                <Link href="/dashboard/projects?new=true" className="text-xs font-medium text-blue-600 hover:underline mt-1 inline-block">
                  Create your first project
                </Link>
              </div>
            )}
          </div>

          {/* Overdue Tasks Table */}
          {data?.overdueTasks?.length > 0 && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-600" />
                  <span className="text-xs font-semibold text-red-700">Overdue Tasks</span>
                  <span className="text-[10px] px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                    {data.overdueTasks.length}
                  </span>
                </div>
                <Link href="/dashboard/projects?tab=tasks&filter=overdue" className="text-[10px] text-red-600 hover:underline flex items-center gap-0.5">
                  View all <ChevronRight className="w-3 h-3" />
                </Link>
              </div>
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-red-50/50 border-b border-red-100">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600 w-8">#</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Task</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Project</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Priority</th>
                    <th className="px-3 py-1.5 text-right font-medium text-gray-600 w-20">Overdue</th>
                  </tr>
                </thead>
                <tbody>
                  {data.overdueTasks.slice(0, 5).map((task: any, idx: number) => {
                    const dueDate = new Date(task.dueDate)
                    const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <tr
                        key={task.id}
                        className={`border-b border-red-100 hover:bg-red-50/50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}`}
                        onClick={() => window.location.href = `/dashboard/projects/${task.card.id}?tab=tasks&taskId=${task.id}`}
                      >
                        <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-900 truncate max-w-[200px]">
                          {task.title}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600 truncate max-w-[150px]">
                          {task.card.title}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority?.[0] || 'N'}
                          </span>
                        </td>
                        <td className="px-3 py-1.5 text-right text-red-600 font-medium">
                          {daysOverdue === 0 ? 'Today' : `${daysOverdue}d`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Upcoming Tasks Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-700">Upcoming Tasks</span>
                <span className="text-[10px] text-gray-500">Next 7 days</span>
              </div>
            </div>
            {data?.upcomingTasks?.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600 w-8">#</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Task</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Project</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Priority</th>
                    <th className="px-3 py-1.5 text-right font-medium text-gray-600 w-20">Due</th>
                  </tr>
                </thead>
                <tbody>
                  {data.upcomingTasks.slice(0, 5).map((task: any, idx: number) => {
                    const dueDate = new Date(task.dueDate)
                    const isToday = dueDate.toDateString() === new Date().toDateString()
                    const isTomorrow = dueDate.toDateString() === new Date(Date.now() + 86400000).toDateString()
                    return (
                      <tr
                        key={task.id}
                        className={`border-b border-gray-100 hover:bg-blue-50/50 cursor-pointer transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}
                        onClick={() => window.location.href = `/dashboard/projects/${task.card.id}?tab=tasks&taskId=${task.id}`}
                      >
                        <td className="px-3 py-1.5 text-gray-400">{idx + 1}</td>
                        <td className="px-3 py-1.5 font-medium text-gray-900 truncate max-w-[200px]">
                          {task.title}
                        </td>
                        <td className="px-3 py-1.5 text-gray-600 truncate max-w-[150px]">
                          {task.card.title}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          <span className={`inline-flex px-1.5 py-0.5 rounded text-[10px] font-medium ${
                            task.priority === 'URGENT' ? 'bg-red-100 text-red-700' :
                            task.priority === 'HIGH' ? 'bg-orange-100 text-orange-700' :
                            task.priority === 'MEDIUM' ? 'bg-amber-100 text-amber-700' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {task.priority?.[0] || 'N'}
                          </span>
                        </td>
                        <td className={`px-3 py-1.5 text-right font-medium ${isToday ? 'text-amber-600' : 'text-gray-600'}`}>
                          {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : formatDate(task.dueDate)}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-6 text-center">
                <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-500">No upcoming tasks</p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-3">
          {/* Quick Actions - Compact */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Zap className="h-4 w-4 text-amber-600" />
              <span className="text-xs font-semibold text-gray-700">Quick Actions</span>
            </div>
            <div className="p-2 grid grid-cols-2 gap-1">
              <Link
                href="/dashboard/projects?new=true"
                className="flex items-center gap-2 px-3 py-2 rounded bg-blue-50 hover:bg-blue-100 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-blue-500 flex items-center justify-center">
                  <Plus className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">New Project</span>
              </Link>
              <Link
                href="/dashboard/leads?new=true"
                className="flex items-center gap-2 px-3 py-2 rounded bg-emerald-50 hover:bg-emerald-100 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-emerald-500 flex items-center justify-center">
                  <Target className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Add Lead</span>
              </Link>
              <Link
                href="/dashboard/reports"
                className="flex items-center gap-2 px-3 py-2 rounded bg-purple-50 hover:bg-purple-100 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-purple-500 flex items-center justify-center">
                  <BarChart3 className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Reports</span>
              </Link>
              <Link
                href="/dashboard/inventory"
                className="flex items-center gap-2 px-3 py-2 rounded bg-amber-50 hover:bg-amber-100 transition-colors"
              >
                <div className="w-6 h-6 rounded bg-amber-500 flex items-center justify-center">
                  <Package className="w-3 h-3 text-white" />
                </div>
                <span className="text-xs font-medium text-gray-700">Inventory</span>
              </Link>
            </div>
          </div>

          {/* Recent Activity Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="h-4 w-4 text-slate-600" />
                <span className="text-xs font-semibold text-gray-700">Recent Activity</span>
              </div>
              <Link href="/dashboard/activity" className="text-[10px] text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            <div className="max-h-64 overflow-y-auto">
              {data?.recentActivities?.length > 0 ? (
                <table className="w-full text-xs">
                  <tbody>
                    {data.recentActivities.slice(0, 8).map((activity: any, idx: number) => (
                      <tr key={activity.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50/50'}`}>
                        <td className="px-3 py-2">
                          <p className="text-gray-700 line-clamp-2">{activity.description}</p>
                          <div className="flex items-center gap-1 mt-0.5 text-[10px] text-gray-400">
                            <span>{activity.user?.firstName} {activity.user?.lastName?.[0]}.</span>
                            <span>&middot;</span>
                            <span>
                              {new Date(activity.createdAt).toLocaleDateString('en-US', {
                                month: 'short',
                                day: 'numeric',
                                hour: 'numeric',
                                minute: '2-digit'
                              })}
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="p-6 text-center">
                  <Activity className="w-6 h-6 text-slate-300 mx-auto mb-1" />
                  <p className="text-xs text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </div>

          {/* Resources Summary Table */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
              <Package className="h-4 w-4 text-purple-600" />
              <span className="text-xs font-semibold text-gray-700">Resources</span>
            </div>
            <table className="w-full text-xs">
              <tbody>
                <tr
                  className="border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = '/dashboard/vendors'}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-teal-100 flex items-center justify-center">
                        <Truck className="w-3 h-3 text-teal-600" />
                      </div>
                      <span className="font-medium text-gray-700">Vendors</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{stats.vendors || 0}</td>
                </tr>
                <tr
                  className="border-b border-gray-100 bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => window.location.href = '/dashboard/inventory'}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-purple-100 flex items-center justify-center">
                        <Package className="w-3 h-3 text-purple-600" />
                      </div>
                      <span className="font-medium text-gray-700">Inventory</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right">
                    {data?.lowStockItems?.length > 0 ? (
                      <span className="text-[10px] font-medium px-1.5 py-0.5 bg-red-100 text-red-700 rounded">
                        {data.lowStockItems.length} low
                      </span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                </tr>
                <tr
                  className="border-b border-gray-100 bg-white hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => window.location.href = '/dashboard/leads'}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-emerald-100 flex items-center justify-center">
                        <Target className="w-3 h-3 text-emerald-600" />
                      </div>
                      <span className="font-medium text-gray-700">Leads</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{stats.leads || 0}</td>
                </tr>
                <tr
                  className="bg-gray-50/50 hover:bg-gray-100 cursor-pointer transition-colors"
                  onClick={() => window.location.href = '/dashboard/settings?tab=team'}
                >
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-blue-100 flex items-center justify-center">
                        <Users className="w-3 h-3 text-blue-600" />
                      </div>
                      <span className="font-medium text-gray-700">Team Members</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 text-right font-semibold text-gray-900">{stats.teamMembers || 0}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}
