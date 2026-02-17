'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Building2,
  CheckSquare,
  Users,
  TrendingUp,
  AlertTriangle,
  Clock,
  ArrowUpRight,
  Calendar,
  DollarSign,
  Package,
  Truck,
  Activity,
  Plus,
  ChevronRight,
  AlertCircle,
  Bell,
  X,
  Zap,
  Target,
  FileText,
  BarChart3
} from 'lucide-react'
import { useState } from 'react'
import { useCurrency } from '@/hooks/useCurrency'

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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.3, ease: [0.25, 0.1, 0.25, 1] as const }
  })
}

export default function DashboardPage() {
  const { format: formatCurrency } = useCurrency()
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([])

  const { data, isLoading, error } = useQuery({
    queryKey: ['dashboard'],
    queryFn: fetchDashboardData,
    refetchInterval: 60000 // Refresh every minute
  })

  const dismissAlert = (alertId: string) => {
    setDismissedAlerts(prev => [...prev, alertId])
  }

  if (isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex flex-col items-center gap-4"
        >
          <div className="w-12 h-12 rounded-2xl bg-amber-500 flex items-center justify-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
              className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full"
            />
          </div>
          <p className="text-slate-500 text-sm">Loading dashboard...</p>
        </motion.div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <p className="text-slate-600">Failed to load dashboard</p>
        </div>
      </div>
    )
  }

  const stats = data?.stats || {}
  const alerts = (data?.alerts || []).filter((a: any) => !dismissedAlerts.includes(a.id))

  const statCards = [
    {
      label: 'Active Projects',
      value: stats.activeProjects || 0,
      icon: Building2,
      color: 'text-blue-600',
      bg: 'bg-blue-50',
      trend: stats.completedProjects > 0 ? `${stats.completedProjects} completed` : null,
      link: '/dashboard/projects'
    },
    {
      label: 'Tasks Completed',
      value: stats.completedTasks || 0,
      suffix: `/ ${stats.totalTasks || 0}`,
      icon: CheckSquare,
      color: 'text-emerald-600',
      bg: 'bg-emerald-50',
      trend: stats.tasksCompletedThisMonth > 0 ? `${stats.tasksCompletedThisMonth} this month` : null,
      link: '/dashboard/projects?tab=tasks'
    },
    {
      label: 'Team Members',
      value: stats.teamMembers || 0,
      icon: Users,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      link: '/dashboard/settings?tab=team'
    },
    {
      label: 'Revenue',
      value: formatCurrency(stats.revenue || 0, { compact: true }),
      icon: DollarSign,
      color: 'text-amber-600',
      bg: 'bg-amber-50',
      trend: stats.profit > 0 ? `${formatCurrency(stats.profit, { compact: true })} profit` : null,
      link: '/dashboard/reports'
    }
  ]

  const quickActions = [
    { label: 'New Project', icon: Plus, href: '/dashboard/projects?new=true', color: 'bg-blue-500' },
    { label: 'Add Lead', icon: Target, href: '/dashboard/leads?new=true', color: 'bg-emerald-500' },
    { label: 'View Reports', icon: BarChart3, href: '/dashboard/reports', color: 'bg-purple-500' },
    { label: 'Inventory', icon: Package, href: '/dashboard/inventory', color: 'bg-amber-500' }
  ]

  return (
    <div className="space-y-6 pb-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-sm text-slate-500 mt-1">
            Welcome back! Here's what's happening with your projects.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/dashboard/projects?new=true"
            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-semibold hover:bg-slate-800 transition-colors shadow-sm"
          >
            <Plus className="w-4 h-4" />
            New Project
          </Link>
        </div>
      </div>

      {/* Alerts Banner */}
      {alerts.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-2"
        >
          {alerts.map((alert: any) => (
            <div
              key={alert.id}
              className={`flex items-center justify-between p-4 rounded-xl border ${
                alert.type === 'danger'
                  ? 'bg-red-50 border-red-200'
                  : alert.type === 'warning'
                  ? 'bg-amber-50 border-amber-200'
                  : 'bg-blue-50 border-blue-200'
              }`}
            >
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  alert.type === 'danger'
                    ? 'bg-red-100'
                    : alert.type === 'warning'
                    ? 'bg-amber-100'
                    : 'bg-blue-100'
                }`}>
                  {alert.type === 'danger' ? (
                    <AlertTriangle className="w-5 h-5 text-red-600" />
                  ) : alert.type === 'warning' ? (
                    <Clock className="w-5 h-5 text-amber-600" />
                  ) : (
                    <Bell className="w-5 h-5 text-blue-600" />
                  )}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${
                    alert.type === 'danger'
                      ? 'text-red-900'
                      : alert.type === 'warning'
                      ? 'text-amber-900'
                      : 'text-blue-900'
                  }`}>
                    {alert.title}
                  </p>
                  <p className={`text-sm ${
                    alert.type === 'danger'
                      ? 'text-red-700'
                      : alert.type === 'warning'
                      ? 'text-amber-700'
                      : 'text-blue-700'
                  }`}>
                    {alert.message}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Link
                  href={alert.link || '#'}
                  className={`text-sm font-medium px-3 py-1.5 rounded-lg transition-colors ${
                    alert.type === 'danger'
                      ? 'text-red-700 hover:bg-red-100'
                      : alert.type === 'warning'
                      ? 'text-amber-700 hover:bg-amber-100'
                      : 'text-blue-700 hover:bg-blue-100'
                  }`}
                >
                  View
                </Link>
                <button
                  onClick={() => dismissAlert(alert.id)}
                  className="p-1 rounded-lg hover:bg-white/50 transition-colors"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              </div>
            </div>
          ))}
        </motion.div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {statCards.map((card, idx) => (
          <motion.div
            key={card.label}
            custom={idx}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
          >
            <Link
              href={card.link}
              className="block bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300 hover:shadow-lg hover:shadow-slate-200/50 transition-all group"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                  {card.label}
                </span>
                <div className={`w-9 h-9 rounded-xl ${card.bg} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-3xl font-bold text-slate-900 tabular-nums">
                  {card.value}
                </span>
                {card.suffix && (
                  <span className="text-lg text-slate-400">{card.suffix}</span>
                )}
              </div>
              {card.trend && (
                <p className="text-xs text-slate-500 mt-2 flex items-center gap-1">
                  <TrendingUp className="w-3 h-3 text-emerald-500" />
                  {card.trend}
                </p>
              )}
            </Link>
          </motion.div>
        ))}
      </div>

      {/* Main Grid */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Column - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Active Projects */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                  <Building2 className="w-4 h-4 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Active Projects</h3>
                  <p className="text-xs text-slate-500">{stats.activeProjects || 0} in progress</p>
                </div>
              </div>
              <Link
                href="/dashboard/projects"
                className="text-sm font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1 transition-colors"
              >
                View all
                <ChevronRight className="w-4 h-4" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.recentProjects?.length > 0 ? (
                data.recentProjects.slice(0, 5).map((project: any) => (
                  <Link
                    key={project.id}
                    href={`/dashboard/projects/${project.id}`}
                    className="flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">
                        {project.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {project.contactName || 'No client'} &middot; {project.completedTasks}/{project.taskCount} tasks
                      </p>
                    </div>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="w-24">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-500">Progress</span>
                          <span className="font-medium text-slate-700">{project.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-emerald-500 rounded-full transition-all"
                            style={{ width: `${project.progress}%` }}
                          />
                        </div>
                      </div>
                      <ArrowUpRight className="w-4 h-4 text-slate-400" />
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-5 py-8 text-center">
                  <Building2 className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No active projects</p>
                  <Link
                    href="/dashboard/projects?new=true"
                    className="text-sm font-medium text-blue-600 hover:text-blue-700 mt-2 inline-block"
                  >
                    Create your first project
                  </Link>
                </div>
              )}
            </div>
          </motion.div>

          {/* Overdue Tasks */}
          {data?.overdueTasks?.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.25 }}
              className="bg-red-50 rounded-2xl border border-red-200 overflow-hidden"
            >
              <div className="px-5 py-4 border-b border-red-100 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle className="w-4 h-4 text-red-600" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-red-900">Overdue Tasks</h3>
                    <p className="text-xs text-red-600">{data.overdueTasks.length} task{data.overdueTasks.length > 1 ? 's' : ''} need attention</p>
                  </div>
                </div>
                <Link
                  href="/dashboard/projects?tab=tasks&filter=overdue"
                  className="text-sm font-medium text-red-700 hover:text-red-800 flex items-center gap-1 transition-colors"
                >
                  View all
                  <ChevronRight className="w-4 h-4" />
                </Link>
              </div>

              <div className="divide-y divide-red-100 bg-white/50">
                {data.overdueTasks.map((task: any) => {
                  const dueDate = new Date(task.dueDate)
                  const daysOverdue = Math.floor((Date.now() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/projects/${task.card.id}?tab=tasks&taskId=${task.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-red-50/50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'URGENT' ? 'bg-red-600' :
                          task.priority === 'HIGH' ? 'bg-red-500' :
                          task.priority === 'MEDIUM' ? 'bg-orange-500' : 'bg-red-400'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                          <p className="text-xs text-slate-500 truncate">{task.card.title}</p>
                        </div>
                      </div>
                      <span className="text-xs font-medium px-2 py-1 rounded-full bg-red-100 text-red-700 flex-shrink-0">
                        {daysOverdue === 0 ? 'Due today' : daysOverdue === 1 ? '1 day late' : `${daysOverdue} days late`}
                      </span>
                    </Link>
                  )
                })}
              </div>
            </motion.div>
          )}

          {/* Upcoming Tasks */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                  <Calendar className="w-4 h-4 text-amber-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Upcoming Tasks</h3>
                  <p className="text-xs text-slate-500">Due within 7 days</p>
                </div>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {data?.upcomingTasks?.length > 0 ? (
                data.upcomingTasks.slice(0, 5).map((task: any) => {
                  const isOverdue = new Date(task.dueDate) < new Date()
                  const dueDate = new Date(task.dueDate)
                  const isToday = dueDate.toDateString() === new Date().toDateString()

                  return (
                    <Link
                      key={task.id}
                      href={`/dashboard/projects/${task.card.id}?tab=tasks&taskId=${task.id}`}
                      className="flex items-center justify-between px-5 py-3 hover:bg-slate-50 transition-colors"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${
                          task.priority === 'URGENT' ? 'bg-red-500' :
                          task.priority === 'HIGH' ? 'bg-orange-500' :
                          task.priority === 'MEDIUM' ? 'bg-amber-500' : 'bg-slate-400'
                        }`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                          <p className="text-xs text-slate-500 truncate">{task.card.title}</p>
                        </div>
                      </div>
                      <span className={`text-xs font-medium px-2 py-1 rounded-full flex-shrink-0 ${
                        isOverdue
                          ? 'bg-red-100 text-red-700'
                          : isToday
                          ? 'bg-amber-100 text-amber-700'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {isOverdue
                          ? 'Overdue'
                          : isToday
                          ? 'Today'
                          : dueDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </span>
                    </Link>
                  )
                })
              ) : (
                <div className="px-5 py-8 text-center">
                  <CheckSquare className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No upcoming tasks</p>
                </div>
              )}
            </div>
          </motion.div>
        </div>

        {/* Right Column - 1/3 width */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="bg-white rounded-2xl border border-slate-200/60 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Quick Actions</h3>
            <div className="grid grid-cols-2 gap-3">
              {quickActions.map((action) => (
                <Link
                  key={action.label}
                  href={action.href}
                  className="flex flex-col items-center gap-2 p-4 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors group"
                >
                  <div className={`w-10 h-10 rounded-xl ${action.color} flex items-center justify-center group-hover:scale-110 transition-transform`}>
                    <action.icon className="w-5 h-5 text-white" />
                  </div>
                  <span className="text-xs font-medium text-slate-700">{action.label}</span>
                </Link>
              ))}
            </div>
          </motion.div>

          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35 }}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                  <Zap className="w-4 h-4 text-slate-600" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
              </div>
              <Link
                href="/dashboard/activity"
                className="text-xs font-medium text-slate-500 hover:text-slate-700 transition-colors"
              >
                View all
              </Link>
            </div>

            <div className="divide-y divide-slate-100 max-h-80 overflow-y-auto">
              {data?.recentActivities?.length > 0 ? (
                data.recentActivities.slice(0, 8).map((activity: any) => (
                  <div key={activity.id} className="px-5 py-3">
                    <p className="text-sm text-slate-700 line-clamp-2">{activity.description}</p>
                    <div className="flex items-center gap-2 mt-1.5">
                      <span className="text-xs text-slate-500">
                        {activity.user?.firstName} {activity.user?.lastName}
                      </span>
                      <span className="text-slate-300">&middot;</span>
                      <span className="text-xs text-slate-400">
                        {new Date(activity.createdAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                          hour: 'numeric',
                          minute: '2-digit'
                        })}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-5 py-8 text-center">
                  <Activity className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-sm text-slate-500">No recent activity</p>
                </div>
              )}
            </div>
          </motion.div>

          {/* Resources Summary */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="bg-white rounded-2xl border border-slate-200/60 p-5"
          >
            <h3 className="text-sm font-semibold text-slate-900 mb-4">Resources</h3>
            <div className="space-y-3">
              <Link
                href="/dashboard/vendors"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 flex items-center justify-center">
                    <Truck className="w-4 h-4 text-teal-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Vendors</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{stats.vendors || 0}</span>
              </Link>

              <Link
                href="/dashboard/inventory"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center">
                    <Package className="w-4 h-4 text-purple-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Inventory</span>
                </div>
                {data?.lowStockItems?.length > 0 && (
                  <span className="text-xs font-medium px-2 py-0.5 bg-red-100 text-red-700 rounded-full">
                    {data.lowStockItems.length} low
                  </span>
                )}
              </Link>

              <Link
                href="/dashboard/leads"
                className="flex items-center justify-between p-3 rounded-xl bg-slate-50 hover:bg-slate-100 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <Target className="w-4 h-4 text-emerald-600" />
                  </div>
                  <span className="text-sm font-medium text-slate-700">Leads</span>
                </div>
                <span className="text-sm font-semibold text-slate-900">{stats.leads || 0}</span>
              </Link>
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
