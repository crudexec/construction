'use client'

import { useState } from 'react'
import Link from 'next/link'
import {
  Calendar,
  Users,
  Activity,
  CheckSquare,
  MessageSquare,
  Upload,
  UserPlus,
  Edit3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  Clock,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  BarChart3,
  ChevronRight,
  FileText,
  X,
  Info,
  Minus,
  Check
} from 'lucide-react'
import { useCurrency } from '@/hooks/useCurrency'

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

const getHealthColor = (score: number) => {
  if (score >= 80) return { bg: 'bg-emerald-500', text: 'text-emerald-600', light: 'bg-emerald-50', label: 'Healthy' }
  if (score >= 60) return { bg: 'bg-amber-500', text: 'text-amber-600', light: 'bg-amber-50', label: 'At Risk' }
  return { bg: 'bg-red-500', text: 'text-red-600', light: 'bg-red-50', label: 'Critical' }
}

const getPriorityConfig = (priority: string) => {
  switch (priority) {
    case 'URGENT': return { color: 'text-red-600', bg: 'bg-red-100', dot: 'bg-red-500' }
    case 'HIGH': return { color: 'text-orange-600', bg: 'bg-orange-100', dot: 'bg-orange-500' }
    case 'MEDIUM': return { color: 'text-amber-600', bg: 'bg-amber-100', dot: 'bg-amber-500' }
    default: return { color: 'text-slate-600', bg: 'bg-slate-100', dot: 'bg-slate-400' }
  }
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
  const [showHealthBreakdown, setShowHealthBreakdown] = useState(false)

  const metrics = project.metrics || {}
  const insights = project.insights || {}

  const progressPercentage = Math.min(100, Math.max(0, metrics.progress || progress))
  const healthScore = metrics.healthScore ?? 100
  const healthConfig = getHealthColor(healthScore)

  const projectMilestones = project.projectMilestones || []

  const formatDate = (dateString?: string) => {
    if (!dateString) return '-'
    return new Date(dateString).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Calculate health breakdown
  const getHealthBreakdown = () => {
    const breakdown = []
    if ((metrics.overdueTasks || 0) > 0) {
      breakdown.push({ label: 'Overdue Tasks', count: metrics.overdueTasks, deduction: Math.min(30, metrics.overdueTasks * 5), icon: AlertCircle, color: 'text-red-500' })
    }
    if ((insights.overdueMilestones?.length || 0) > 0) {
      breakdown.push({ label: 'Overdue Milestones', count: insights.overdueMilestones.length, deduction: Math.min(20, insights.overdueMilestones.length * 10), icon: Target, color: 'text-orange-500' })
    }
    if ((metrics.budgetUtilization || 0) > 100) {
      breakdown.push({ label: 'Budget Overrun', count: `${Math.round(metrics.budgetUtilization - 100)}%`, deduction: Math.min(25, (metrics.budgetUtilization - 100) / 2), icon: DollarSign, color: 'text-red-500' })
    }
    return breakdown
  }

  const healthBreakdown = getHealthBreakdown()

  return (
    <div className="space-y-3">
      {/* Health Score Modal */}
      {showHealthBreakdown && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full">
            <div className="flex items-center justify-between p-3 border-b">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold ${healthConfig.bg}`}>
                  {healthScore}
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Health Score Breakdown</h3>
                  <p className={`text-xs ${healthConfig.text}`}>{healthConfig.label}</p>
                </div>
              </div>
              <button onClick={() => setShowHealthBreakdown(false)} className="p-1 hover:bg-gray-100 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="flex items-center justify-between p-2 bg-emerald-50 rounded text-sm">
                <span className="flex items-center gap-2"><Check className="h-4 w-4 text-emerald-600" /> Starting Score</span>
                <span className="font-bold text-emerald-600">100</span>
              </div>
              {healthBreakdown.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded text-sm">
                  <span className="flex items-center gap-2">
                    <item.icon className={`h-4 w-4 ${item.color}`} />
                    {item.label} ({item.count})
                  </span>
                  <span className="font-bold text-red-500">-{Math.round(item.deduction)}</span>
                </div>
              ))}
              {healthBreakdown.length === 0 && (
                <div className="flex items-center justify-between p-2 bg-emerald-50 rounded text-sm">
                  <span className="flex items-center gap-2"><CheckCircle2 className="h-4 w-4 text-emerald-600" /> No issues found</span>
                  <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                </div>
              )}
              <div className={`flex items-center justify-between p-2 rounded text-sm border-2 ${healthConfig.light} ${healthScore >= 80 ? 'border-emerald-200' : healthScore >= 60 ? 'border-amber-200' : 'border-red-200'}`}>
                <span className="font-semibold">Final Score</span>
                <span className={`text-lg font-bold ${healthConfig.text}`}>{healthScore}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Compact Header Stats Bar */}
      <div className="bg-slate-800 rounded-lg p-3 text-white">
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 text-center">
          {/* Health Score */}
          <button
            onClick={() => setShowHealthBreakdown(true)}
            className="flex flex-col items-center hover:bg-white/10 rounded p-1 transition-colors"
          >
            <div className={`text-2xl font-bold ${healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
              {healthScore}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Health</div>
          </button>

          {/* Progress */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">{progressPercentage}%</div>
            <div className="text-[10px] text-slate-400 uppercase">Progress</div>
          </div>

          {/* Tasks */}
          <div className="flex flex-col items-center">
            <div className="text-2xl font-bold">{metrics.completedTasks || completedTasks}/{metrics.totalTasks || totalTasks}</div>
            <div className="text-[10px] text-slate-400 uppercase">Tasks</div>
          </div>

          {/* Overdue */}
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${(metrics.overdueTasks || 0) > 0 ? 'text-red-400' : ''}`}>
              {metrics.overdueTasks || 0}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Overdue</div>
          </div>

          {/* Due Soon */}
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${(metrics.upcomingTasksCount || 0) > 0 ? 'text-amber-400' : ''}`}>
              {metrics.upcomingTasksCount || 0}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">Due Soon</div>
          </div>

          {/* Days Left */}
          <div className="flex flex-col items-center">
            <div className={`text-2xl font-bold ${metrics.daysRemaining < 0 ? 'text-red-400' : ''}`}>
              {metrics.daysRemaining != null ? (metrics.daysRemaining >= 0 ? metrics.daysRemaining : Math.abs(metrics.daysRemaining)) : '-'}
            </div>
            <div className="text-[10px] text-slate-400 uppercase">{metrics.daysRemaining < 0 ? 'Days Over' : 'Days Left'}</div>
          </div>

          {/* Team */}
          <button onClick={onTeamClick} className="flex flex-col items-center hover:bg-white/10 rounded p-1 transition-colors">
            <div className="text-2xl font-bold">{project.assignedUsers?.length || 1}</div>
            <div className="text-[10px] text-slate-400 uppercase">Team</div>
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {/* Left Column */}
        <div className="space-y-3">
          {/* Timeline & Budget Card */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-xs">
              <tbody>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600 w-24">Timeline</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span>{formatDate(project.startDate)}</span>
                      <span>{formatDate(project.endDate)}</span>
                    </div>
                    <div className="h-1.5 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${metrics.isOverdue ? 'bg-red-500' : 'bg-blue-500'}`}
                        style={{ width: `${metrics.timelineProgress || 0}%` }}
                      />
                    </div>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Budget</td>
                  <td className="px-3 py-2 font-semibold">{formatCurrency(project.budget || 0)}</td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Spent</td>
                  <td className="px-3 py-2">
                    <span className="font-semibold">{formatCurrency(metrics.totalExpenses || 0)}</span>
                    <span className={`ml-2 text-[10px] px-1.5 py-0.5 rounded ${
                      (metrics.budgetUtilization || 0) > 100 ? 'bg-red-100 text-red-700' :
                      (metrics.budgetUtilization || 0) > 80 ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                    }`}>
                      {metrics.budgetUtilization || 0}%
                    </span>
                  </td>
                </tr>
                <tr className="border-b border-gray-100">
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Remaining</td>
                  <td className={`px-3 py-2 font-semibold ${(metrics.profit || 0) >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                    {formatCurrency(Math.abs(metrics.profit || 0))}
                    {(metrics.profit || 0) < 0 && <span className="text-[10px] ml-1">(over)</span>}
                  </td>
                </tr>
                <tr>
                  <td className="px-3 py-2 bg-gray-50 font-medium text-gray-600">Unpaid</td>
                  <td className="px-3 py-2 font-semibold text-amber-600">{formatCurrency(metrics.unpaidExpenses || 0)}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Milestones */}
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="h-4 w-4 text-amber-600" />
                <span className="text-xs font-semibold text-gray-700">Milestones</span>
                <span className="text-[10px] text-gray-500">
                  {metrics.completedMilestones || 0}/{metrics.totalMilestones || projectMilestones.length}
                </span>
              </div>
              <Link href={`/dashboard/projects/${project.id}?tab=milestones`} className="text-[10px] text-blue-600 hover:underline">
                View all
              </Link>
            </div>
            {projectMilestones.length > 0 ? (
              <table className="w-full text-xs">
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600">Milestone</th>
                    <th className="px-3 py-1.5 text-left font-medium text-gray-600 w-20">Due</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Tasks</th>
                    <th className="px-3 py-1.5 text-center font-medium text-gray-600 w-16">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {projectMilestones.slice(0, 5).map((milestone: any, idx: number) => {
                    const isCompleted = milestone.status === 'COMPLETED'
                    const isOverdue = milestone.targetDate && new Date(milestone.targetDate) < new Date() && !isCompleted
                    return (
                      <tr key={milestone.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-1.5 truncate max-w-[150px]">{milestone.title}</td>
                        <td className={`px-3 py-1.5 ${isOverdue ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {formatDate(milestone.targetDate)}
                        </td>
                        <td className="px-3 py-1.5 text-center text-gray-500">
                          {milestone.tasks ? `${milestone.tasks.filter((t: any) => t.status === 'COMPLETED').length}/${milestone.tasks.length}` : '-'}
                        </td>
                        <td className="px-3 py-1.5 text-center">
                          {isCompleted ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-emerald-100 text-emerald-700 rounded text-[10px]">Done</span>
                          ) : isOverdue ? (
                            <span className="inline-flex px-1.5 py-0.5 bg-red-100 text-red-700 rounded text-[10px]">Late</span>
                          ) : (
                            <span className="inline-flex px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded text-[10px]">Open</span>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            ) : (
              <div className="p-4 text-center text-xs text-gray-500">No milestones defined</div>
            )}
          </div>

          {/* Team Members */}
          {project.assignedUsers?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-purple-600" />
                  <span className="text-xs font-semibold text-gray-700">Team</span>
                  <span className="text-[10px] text-gray-500">{project.assignedUsers.length}</span>
                </div>
                <button onClick={onTeamClick} className="text-[10px] text-blue-600 hover:underline">Manage</button>
              </div>
              <div className="p-2 flex flex-wrap gap-1">
                {project.assignedUsers.map((user: any) => (
                  <div key={user.id} className="inline-flex items-center gap-1.5 px-2 py-1 bg-gray-100 rounded text-xs">
                    <div className="w-5 h-5 rounded-full bg-slate-600 text-white flex items-center justify-center text-[10px] font-medium">
                      {user.firstName?.[0]}{user.lastName?.[0]}
                    </div>
                    <span className="text-gray-700">{user.firstName} {user.lastName?.[0]}.</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column */}
        <div className="space-y-3">
          {/* Needs Attention */}
          {(insights.overdueTasks?.length > 0 || insights.highPriorityTasks?.length > 0) && (
            <div className="border border-red-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Needs Attention</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {insights.overdueTasks?.slice(0, 3).map((task: any, idx: number) => (
                    <tr key={task.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-red-50/30'}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                          <span className="truncate max-w-[180px]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-red-600 text-right w-20">{formatDate(task.dueDate)}</td>
                    </tr>
                  ))}
                  {insights.highPriorityTasks?.slice(0, 2).map((task: any, idx: number) => (
                    <tr key={task.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-amber-50/30'}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <div className={`w-1.5 h-1.5 rounded-full ${getPriorityConfig(task.priority).dot}`} />
                          <span className="truncate max-w-[180px]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-right w-20">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded ${getPriorityConfig(task.priority).bg} ${getPriorityConfig(task.priority).color}`}>
                          {task.priority}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Coming Up */}
          {insights.upcomingTasks?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="h-4 w-4 text-blue-600" />
                  <span className="text-xs font-semibold text-gray-700">Coming Up</span>
                  <span className="text-[10px] text-gray-500">Next 7 days</span>
                </div>
                <Link href={`/dashboard/projects/${project.id}?tab=tasks`} className="text-[10px] text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {insights.upcomingTasks.slice(0, 5).map((task: any, idx: number) => {
                    const dueDate = new Date(task.dueDate)
                    const today = new Date()
                    const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
                    return (
                      <tr key={task.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                        <td className="px-3 py-1.5 truncate max-w-[200px]">{task.title}</td>
                        <td className={`px-3 py-1.5 text-right w-20 ${diffDays <= 1 ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                          {diffDays === 0 ? 'Today' : diffDays === 1 ? 'Tomorrow' : `${diffDays}d`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}

          {/* Recently Completed */}
          {insights.recentlyCompleted?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span className="text-xs font-semibold text-gray-700">Recently Completed</span>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {insights.recentlyCompleted.slice(0, 4).map((task: any, idx: number) => (
                    <tr key={task.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-1.5">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                          <span className="truncate max-w-[180px]">{task.title}</span>
                        </div>
                      </td>
                      <td className="px-3 py-1.5 text-gray-500 text-right w-20">{formatDate(task.completedAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Recent Documents */}
          {insights.recentDocuments?.length > 0 && (
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-cyan-600" />
                  <span className="text-xs font-semibold text-gray-700">Recent Documents</span>
                </div>
                <Link href={`/dashboard/projects/${project.id}?tab=files`} className="text-[10px] text-blue-600 hover:underline">
                  View all
                </Link>
              </div>
              <table className="w-full text-xs">
                <tbody>
                  {insights.recentDocuments.slice(0, 3).map((doc: any, idx: number) => (
                    <tr key={doc.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                      <td className="px-3 py-1.5 truncate max-w-[200px]">{doc.name || doc.fileName}</td>
                      <td className="px-3 py-1.5 text-gray-500 text-right w-20">{formatDate(doc.createdAt)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Recent Activity - Full Width */}
      {project.activities?.length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <Activity className="h-4 w-4 text-slate-600" />
            <span className="text-xs font-semibold text-gray-700">Recent Activity</span>
          </div>
          <table className="w-full text-xs">
            <tbody>
              {project.activities.slice(0, 5).map((activity: any, idx: number) => (
                <tr key={activity.id} className={`border-b border-gray-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}>
                  <td className="px-3 py-1.5 w-8">
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[9px] font-medium text-slate-600">
                      {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                    </div>
                  </td>
                  <td className="px-3 py-1.5 text-gray-700">{activity.description}</td>
                  <td className="px-3 py-1.5 text-gray-400 text-right w-28 whitespace-nowrap">
                    {new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Expense Categories - if present */}
      {metrics.expensesByCategory && Object.keys(metrics.expensesByCategory).length > 0 && (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <div className="px-3 py-2 bg-gray-50 border-b border-gray-200 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-emerald-600" />
            <span className="text-xs font-semibold text-gray-700">Expenses by Category</span>
          </div>
          <div className="p-2 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-2">
            {Object.entries(metrics.expensesByCategory).slice(0, 6).map(([category, amount]: [string, any]) => (
              <div key={category} className="px-2 py-1.5 bg-gray-50 rounded text-xs">
                <div className="text-gray-500 truncate">{category}</div>
                <div className="font-semibold text-gray-800">{formatCurrency(amount)}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
