'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import Link from 'next/link'
import {
  Calendar,
  Users,
  Activity,
  Plus,
  FileText,
  CheckSquare,
  MessageSquare,
  Upload,
  UserPlus,
  Edit3,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Target,
  ArrowUpRight,
  Clock,
  Zap,
  AlertTriangle,
  AlertCircle,
  CheckCircle2,
  CalendarClock,
  BarChart3,
  ChevronRight,
  FileBox,
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

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: {
      delay: i * 0.08,
      duration: 0.4,
      ease: [0.25, 0.1, 0.25, 1] as const
    }
  })
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

  // Calculate health breakdown details
  const getHealthBreakdown = () => {
    const breakdown = []
    let score = 100

    // Overdue tasks (up to 30 points deduction)
    const overdueTasks = metrics.overdueTasks || 0
    if (overdueTasks > 0) {
      const deduction = Math.min(30, overdueTasks * 5)
      breakdown.push({
        label: 'Overdue Tasks',
        description: `${overdueTasks} task${overdueTasks > 1 ? 's are' : ' is'} past due date`,
        deduction,
        icon: AlertCircle,
        color: 'text-red-500'
      })
      score -= deduction
    }

    // Overdue milestones (up to 20 points deduction)
    const overdueMilestones = insights.overdueMilestones?.length || 0
    if (overdueMilestones > 0) {
      const deduction = Math.min(20, overdueMilestones * 10)
      breakdown.push({
        label: 'Overdue Milestones',
        description: `${overdueMilestones} milestone${overdueMilestones > 1 ? 's are' : ' is'} past target date`,
        deduction,
        icon: Target,
        color: 'text-orange-500'
      })
      score -= deduction
    }

    // Budget overrun (up to 25 points deduction)
    const budgetUtilization = metrics.budgetUtilization || 0
    if (budgetUtilization > 100) {
      const deduction = Math.min(25, (budgetUtilization - 100) / 2)
      breakdown.push({
        label: 'Budget Overrun',
        description: `Spending is ${Math.round(budgetUtilization - 100)}% over budget`,
        deduction: Math.round(deduction),
        icon: DollarSign,
        color: 'text-red-500'
      })
      score -= deduction
    }

    // Timeline overdue (up to 25 points deduction)
    if (metrics.isOverdue && metrics.daysRemaining !== null) {
      const daysOverdue = Math.abs(metrics.daysRemaining)
      const deduction = Math.min(25, daysOverdue * 2)
      breakdown.push({
        label: 'Past Deadline',
        description: `Project is ${daysOverdue} day${daysOverdue > 1 ? 's' : ''} past the end date`,
        deduction: Math.round(deduction),
        icon: Calendar,
        color: 'text-red-500'
      })
      score -= deduction
    }

    // Add positive factors if no issues
    if (breakdown.length === 0) {
      breakdown.push({
        label: 'No Issues Found',
        description: 'All tasks are on track, budget is within limits',
        deduction: 0,
        icon: CheckCircle2,
        color: 'text-emerald-500',
        isPositive: true
      })
    }

    return { breakdown, finalScore: Math.max(0, Math.round(score)) }
  }

  const { breakdown: healthBreakdown, finalScore } = getHealthBreakdown()

  // Get milestones from project data
  const projectMilestones = project.projectMilestones || []

  return (
    <div className="space-y-6">
      {/* Health Score Breakdown Modal */}
      <AnimatePresence>
        {showHealthBreakdown && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 overflow-y-auto"
          >
            <div className="flex min-h-screen items-center justify-center p-4">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="fixed inset-0 bg-slate-900/70 backdrop-blur-sm"
                onClick={() => setShowHealthBreakdown(false)}
              />

              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 20 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 20 }}
                transition={{ type: "spring", duration: 0.3 }}
                className="relative bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden"
              >
                {/* Modal Header */}
                <div className="bg-gradient-to-r from-slate-800 to-slate-900 p-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <div className="relative">
                        <svg className="w-16 h-16 -rotate-90">
                          <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="6" />
                          <circle
                            cx="32"
                            cy="32"
                            r="28"
                            fill="none"
                            stroke={healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'}
                            strokeWidth="6"
                            strokeLinecap="round"
                            strokeDasharray={`${healthScore * 1.76} 176`}
                          />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                          <span className="text-xl font-bold text-white">{healthScore}</span>
                        </div>
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-white">Health Score Breakdown</h3>
                        <p className={`text-sm font-medium ${healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                          {healthConfig.label}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setShowHealthBreakdown(false)}
                      className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  </div>
                </div>

                {/* Modal Content */}
                <div className="p-6">
                  <div className="mb-4 p-4 bg-slate-50 rounded-xl">
                    <div className="flex items-center gap-2 text-sm text-slate-600">
                      <Info className="w-4 h-4" />
                      <span>The health score starts at 100 and deductions are made for issues found.</span>
                    </div>
                  </div>

                  <div className="space-y-3">
                    {/* Starting Score */}
                    <div className="flex items-center justify-between p-4 bg-emerald-50 rounded-xl">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center">
                          <Check className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Starting Score</p>
                          <p className="text-sm text-slate-500">Base health score</p>
                        </div>
                      </div>
                      <span className="text-lg font-bold text-emerald-600">100</span>
                    </div>

                    {/* Deductions */}
                    {healthBreakdown.map((item, idx) => {
                      const Icon = item.icon
                      return (
                        <div
                          key={idx}
                          className={`flex items-center justify-between p-4 rounded-xl ${
                            item.isPositive ? 'bg-emerald-50' : 'bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                              item.isPositive ? 'bg-emerald-100' : 'bg-white'
                            }`}>
                              <Icon className={`w-5 h-5 ${item.color}`} />
                            </div>
                            <div>
                              <p className="font-medium text-slate-900">{item.label}</p>
                              <p className="text-sm text-slate-500">{item.description}</p>
                            </div>
                          </div>
                          {item.deduction > 0 ? (
                            <span className="text-lg font-bold text-red-500 flex items-center">
                              <Minus className="w-4 h-4" />
                              {item.deduction}
                            </span>
                          ) : (
                            <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                          )}
                        </div>
                      )
                    })}

                    {/* Final Score */}
                    <div className={`flex items-center justify-between p-4 rounded-xl border-2 ${
                      finalScore >= 80 ? 'border-emerald-200 bg-emerald-50' :
                      finalScore >= 60 ? 'border-amber-200 bg-amber-50' :
                      'border-red-200 bg-red-50'
                    }`}>
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                          finalScore >= 80 ? 'bg-emerald-500' :
                          finalScore >= 60 ? 'bg-amber-500' :
                          'bg-red-500'
                        }`}>
                          <Target className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <p className="font-medium text-slate-900">Final Health Score</p>
                          <p className="text-sm text-slate-500">After all deductions</p>
                        </div>
                      </div>
                      <span className={`text-2xl font-bold ${
                        finalScore >= 80 ? 'text-emerald-600' :
                        finalScore >= 60 ? 'text-amber-600' :
                        'text-red-600'
                      }`}>{finalScore}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => setShowHealthBreakdown(false)}
                    className="w-full mt-6 bg-slate-900 text-white py-3 rounded-xl font-semibold hover:bg-slate-800 transition-colors"
                  >
                    Close
                  </button>
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Project Health & Timeline Banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 rounded-2xl p-6 text-white overflow-hidden relative"
      >
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-[0.03]" style={{
          backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
          backgroundSize: '20px 20px'
        }} />

        <div className="relative grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Health Score - Clickable */}
          <button
            onClick={() => setShowHealthBreakdown(true)}
            className="flex items-center gap-4 text-left hover:bg-white/5 rounded-xl p-2 -m-2 transition-colors group"
          >
            <div className="relative">
              <svg className="w-20 h-20 -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke="rgba(255,255,255,0.1)"
                  strokeWidth="8"
                />
                <motion.circle
                  cx="40"
                  cy="40"
                  r="36"
                  fill="none"
                  stroke={healthScore >= 80 ? '#10b981' : healthScore >= 60 ? '#f59e0b' : '#ef4444'}
                  strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={`${healthScore * 2.26} 226`}
                  initial={{ strokeDasharray: '0 226' }}
                  animate={{ strokeDasharray: `${healthScore * 2.26} 226` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.3 }}
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-2xl font-bold">{healthScore}</span>
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm text-slate-400 uppercase tracking-wider">Health Score</p>
                <Info className="w-3.5 h-3.5 text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <p className={`text-lg font-semibold ${healthScore >= 80 ? 'text-emerald-400' : healthScore >= 60 ? 'text-amber-400' : 'text-red-400'}`}>
                {healthConfig.label}
              </p>
              {metrics.healthFactors && metrics.healthFactors.length > 0 && (
                <p className="text-xs text-slate-400 mt-1">
                  {metrics.healthFactors[0]}
                </p>
              )}
              <p className="text-xs text-slate-500 mt-1 group-hover:text-slate-300 transition-colors">
                Click for details
              </p>
            </div>
          </button>

          {/* Timeline Progress */}
          <div className="lg:border-l lg:border-r border-white/10 lg:px-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-slate-400 uppercase tracking-wider">Timeline</p>
              {metrics.isOverdue && (
                <span className="px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 text-xs font-medium">
                  Overdue
                </span>
              )}
            </div>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-300">
                  {project.startDate ? new Date(project.startDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set'}
                </span>
                <span className="text-slate-300">
                  {project.endDate ? new Date(project.endDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Not set'}
                </span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${metrics.timelineProgress || 0}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  className={`h-full rounded-full ${metrics.isOverdue ? 'bg-red-500' : 'bg-amber-500'}`}
                />
              </div>
              <div className="flex justify-between text-xs text-slate-400">
                <span>{metrics.daysElapsed != null && !isNaN(metrics.daysElapsed) ? `Day ${metrics.daysElapsed}` : ''}</span>
                <span>
                  {metrics.daysRemaining != null && !isNaN(metrics.daysRemaining)
                    ? metrics.daysRemaining >= 0
                      ? `${metrics.daysRemaining} days left`
                      : `${Math.abs(metrics.daysRemaining)} days overdue`
                    : ''}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{metrics.overdueTasks || 0}</p>
              <p className="text-xs text-slate-400">Overdue</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{metrics.upcomingTasksCount || 0}</p>
              <p className="text-xs text-slate-400">Due Soon</p>
            </div>
            <div className="text-center">
              <p className="text-3xl font-bold tabular-nums">{metrics.highPriorityCount || 0}</p>
              <p className="text-xs text-slate-400">High Priority</p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress Card */}
        <motion.div
          custom={0}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Progress</span>
              <div className="w-8 h-8 rounded-lg bg-emerald-50 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </div>
            </div>

            <div className="flex items-baseline gap-1 mb-4">
              <span className="text-4xl font-bold text-slate-900 tracking-tight tabular-nums">
                {progressPercentage}
              </span>
              <span className="text-lg text-slate-400 font-medium">%</span>
            </div>

            <div className="relative h-2 bg-slate-100 rounded-full overflow-hidden">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progressPercentage}%` }}
                transition={{ duration: 1.2, ease: [0.25, 0.1, 0.25, 1] as const, delay: 0.3 }}
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  background: 'linear-gradient(90deg, #10b981 0%, #34d399 50%, #10b981 100%)',
                  backgroundSize: '200% 100%',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Tasks Card */}
        <motion.div
          custom={1}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Tasks</span>
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <CheckSquare className="h-4 w-4 text-blue-600" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-slate-900 tracking-tight tabular-nums">
                {metrics.completedTasks || completedTasks}
              </span>
              <span className="text-lg text-slate-400 font-medium">/ {metrics.totalTasks || totalTasks}</span>
            </div>

            <div className="flex items-center gap-2 text-sm flex-wrap">
              {(metrics.inProgressTasks || inProgressTasks) > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 text-xs font-medium">
                  <Clock className="w-3 h-3" />
                  {metrics.inProgressTasks || inProgressTasks} active
                </span>
              )}
              {metrics.overdueTasks > 0 && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 text-red-700 text-xs font-medium">
                  <AlertCircle className="w-3 h-3" />
                  {metrics.overdueTasks} overdue
                </span>
              )}
            </div>
          </div>
        </motion.div>

        {/* Budget Card */}
        <motion.div
          custom={2}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-amber-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Budget</span>
              <div className="w-8 h-8 rounded-lg bg-amber-50 flex items-center justify-center">
                <DollarSign className="h-4 w-4 text-amber-600" />
              </div>
            </div>

            <div className="mb-2">
              <span className="text-3xl font-bold text-slate-900 tracking-tight">
                {formatCurrency(project.budget, { compact: true })}
              </span>
            </div>

            <div className="flex items-center gap-2 text-sm">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                metrics.budgetUtilization > 100
                  ? 'bg-red-50 text-red-700'
                  : metrics.budgetUtilization > 80
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-emerald-50 text-emerald-700'
              }`}>
                {metrics.budgetUtilization > 100 ? <TrendingDown className="w-3 h-3" /> : <TrendingUp className="w-3 h-3" />}
                {metrics.budgetUtilization || 0}% used
              </span>
            </div>
          </div>
        </motion.div>

        {/* Team Card */}
        <motion.div
          custom={3}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          onClick={onTeamClick}
          className="group relative bg-white rounded-2xl p-5 border border-slate-200/60 hover:border-slate-300/80 transition-all duration-300 hover:shadow-lg hover:shadow-slate-200/50 cursor-pointer"
        >
          <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

          <div className="relative">
            <div className="flex items-center justify-between mb-4">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Team</span>
              <div className="w-8 h-8 rounded-lg bg-purple-50 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Users className="h-4 w-4 text-purple-600" />
              </div>
            </div>

            <div className="flex items-baseline gap-2 mb-2">
              <span className="text-4xl font-bold text-slate-900 tracking-tight tabular-nums">
                {project.assignedUsers?.length || 1}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Team members</p>
              <ArrowUpRight className="w-4 h-4 text-slate-400 group-hover:text-purple-500 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
            </div>
          </div>
        </motion.div>
      </div>

      {/* Needs Attention & Milestones Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Urgent Attention - Overdue & High Priority */}
        {(insights.overdueTasks?.length > 0 || insights.highPriorityTasks?.length > 0) ? (
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-red-50 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-red-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Needs Attention</h3>
                <p className="text-xs text-slate-500">Overdue and high priority items</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100 max-h-[300px] overflow-y-auto">
              {insights.overdueTasks?.slice(0, 3).map((task: any) => (
                <div key={task.id} className="px-5 py-3 hover:bg-red-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-red-500 mt-2 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-red-600 font-medium">
                          Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        </span>
                        {task.assignee && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span className="text-xs text-slate-500">{task.assignee.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              {insights.highPriorityTasks?.slice(0, 2).map((task: any) => (
                <div key={task.id} className="px-5 py-3 hover:bg-amber-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${getPriorityConfig(task.priority).dot}`} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${getPriorityConfig(task.priority).color}`}>
                          {task.priority}
                        </span>
                        {task.dueDate && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span className="text-xs text-slate-500">
                              Due {new Date(task.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        ) : (
          <motion.div
            custom={4}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">All Clear</h3>
                <p className="text-xs text-slate-500">No urgent items</p>
              </div>
            </div>
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No overdue or high priority tasks.</p>
            </div>
          </motion.div>
        )}

        {/* Milestones - Now next to Needs Attention */}
        <motion.div
          custom={5}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
                <Target className="h-4 w-4 text-amber-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Milestones</h3>
                <p className="text-xs text-slate-500">
                  {metrics.completedMilestones || 0} of {metrics.totalMilestones || projectMilestones.length} completed
                </p>
              </div>
            </div>
            <Link
              href={`/dashboard/projects/${project.id}?tab=milestones`}
              className="text-xs text-amber-600 hover:text-amber-700 font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          {projectMilestones.length > 0 ? (
            <div className="p-5">
              {/* Milestone progress bar */}
              <div className="space-y-2 mb-4">
                <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${metrics.milestonesProgress || 0}%` }}
                    transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                    className="h-full bg-amber-500 rounded-full"
                  />
                </div>
              </div>

              {/* Milestones list */}
              <div className="space-y-3 max-h-[220px] overflow-y-auto">
                {projectMilestones.slice(0, 5).map((milestone: any) => {
                  const isCompleted = milestone.status === 'COMPLETED'
                  const isInProgress = milestone.status === 'IN_PROGRESS'
                  const isOverdue = milestone.targetDate && new Date(milestone.targetDate) < new Date() && !isCompleted

                  return (
                    <div key={milestone.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
                      <div className={`w-3 h-3 rounded-full flex-shrink-0 ${
                        isCompleted ? 'bg-emerald-500' :
                        isOverdue ? 'bg-red-500' :
                        isInProgress ? 'bg-amber-500' : 'bg-slate-300'
                      }`} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">{milestone.title}</p>
                        {milestone.targetDate && (
                          <p className={`text-xs ${isOverdue ? 'text-red-500' : 'text-slate-500'}`}>
                            {isOverdue ? 'Overdue - ' : 'Due '}
                            {new Date(milestone.targetDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                          </p>
                        )}
                      </div>
                      {milestone.tasks?.length > 0 && (
                        <span className="text-xs text-slate-400">
                          {milestone.tasks.filter((t: any) => t.status === 'COMPLETED').length}/{milestone.tasks.length} tasks
                        </span>
                      )}
                      {isCompleted && (
                        <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">No milestones defined yet.</p>
            </div>
          )}
        </motion.div>
      </div>

      {/* Upcoming Deadlines */}
      {insights.upcomingTasks?.length > 0 && (
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-50 flex items-center justify-center">
                <CalendarClock className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Coming Up</h3>
                <p className="text-xs text-slate-500">Due in the next 7 days</p>
              </div>
            </div>
            <Link
              href={`/dashboard/projects/${project.id}?tab=tasks`}
              className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
            >
              View all <ChevronRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="divide-y divide-slate-100 max-h-[200px] overflow-y-auto">
            {insights.upcomingTasks.slice(0, 5).map((task: any) => {
              const dueDate = new Date(task.dueDate)
              const today = new Date()
              const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
              const isToday = diffDays === 0
              const isTomorrow = diffDays === 1

              return (
                <div key={task.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                      isToday ? 'bg-red-100 text-red-700' : isTomorrow ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-600'
                    }`}>
                      {dueDate.getDate()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`text-xs font-medium ${
                          isToday ? 'text-red-600' : isTomorrow ? 'text-amber-600' : 'text-slate-500'
                        }`}>
                          {isToday ? 'Today' : isTomorrow ? 'Tomorrow' : `In ${diffDays} days`}
                        </span>
                        {task.assignee && (
                          <>
                            <span className="text-slate-300">&middot;</span>
                            <span className="text-xs text-slate-500">{task.assignee.firstName}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className={`w-2 h-2 rounded-full flex-shrink-0 ${getPriorityConfig(task.priority).dot}`} />
                  </div>
                </div>
              )
            })}
          </div>
        </motion.div>
      )}

      {/* Financial Overview */}
      {(project.budget > 0 || metrics.totalExpenses > 0) && (
        <motion.div
          custom={6}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <BarChart3 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Financial Overview</h3>
                <p className="text-xs text-slate-500">Budget and expense tracking</p>
              </div>
            </div>
          </div>

          <div className="p-5">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-slate-50 rounded-xl">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Budget</p>
                <p className="text-xl font-bold text-slate-900">{formatCurrency(project.budget || 0)}</p>
              </div>
              <div className="p-4 bg-red-50 rounded-xl">
                <p className="text-xs text-red-600 uppercase tracking-wider mb-1">Expenses</p>
                <p className="text-xl font-bold text-red-700">{formatCurrency(metrics.totalExpenses || 0)}</p>
              </div>
              <div className="p-4 bg-amber-50 rounded-xl">
                <p className="text-xs text-amber-600 uppercase tracking-wider mb-1">Unpaid</p>
                <p className="text-xl font-bold text-amber-700">{formatCurrency(metrics.unpaidExpenses || 0)}</p>
              </div>
              <div className={`p-4 rounded-xl ${metrics.profit >= 0 ? 'bg-emerald-50' : 'bg-red-50'}`}>
                <p className={`text-xs uppercase tracking-wider mb-1 ${metrics.profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {metrics.profit >= 0 ? 'Remaining' : 'Over Budget'}
                </p>
                <p className={`text-xl font-bold ${metrics.profit >= 0 ? 'text-emerald-700' : 'text-red-700'}`}>
                  {formatCurrency(Math.abs(metrics.profit || 0))}
                </p>
              </div>
            </div>

            {/* Budget utilization bar */}
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-slate-600">Budget Utilization</span>
                <span className={`font-medium ${
                  metrics.budgetUtilization > 100 ? 'text-red-600' : metrics.budgetUtilization > 80 ? 'text-amber-600' : 'text-emerald-600'
                }`}>
                  {metrics.budgetUtilization || 0}%
                </span>
              </div>
              <div className="h-3 bg-slate-100 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, metrics.budgetUtilization || 0)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  className={`h-full rounded-full ${
                    metrics.budgetUtilization > 100 ? 'bg-red-500' : metrics.budgetUtilization > 80 ? 'bg-amber-500' : 'bg-emerald-500'
                  }`}
                />
              </div>
            </div>

            {/* Expense categories */}
            {metrics.expensesByCategory && Object.keys(metrics.expensesByCategory).length > 0 && (
              <div className="mt-6 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-500 uppercase tracking-wider mb-3">Expenses by Category</p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Object.entries(metrics.expensesByCategory).slice(0, 8).map(([category, amount]: [string, any]) => (
                    <div key={category} className="p-3 bg-slate-50 rounded-lg">
                      <p className="text-xs text-slate-500 truncate">{category}</p>
                      <p className="text-sm font-semibold text-slate-900">{formatCurrency(amount)}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Team Members Section */}
      {project.assignedUsers?.length > 0 && (
        <motion.div
          custom={8}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Users className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Team Members</h3>
                <p className="text-xs text-slate-500">{project.assignedUsers.length} assigned</p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={onTeamClick}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition-colors shadow-sm"
            >
              <Plus className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Add Member</span>
            </motion.button>
          </div>

          <div className="p-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {project.assignedUsers.map((user: any, idx: number) => (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.5 + idx * 0.05 }}
                  className="flex items-center gap-3 p-3 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors group"
                >
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-white text-sm font-semibold shadow-sm">
                    {user.firstName?.[0]}{user.lastName?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">
                      {user.firstName} {user.lastName}
                    </p>
                    {user.role && (
                      <p className="text-xs text-slate-500 truncate">{user.role}</p>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* Recent Activity & Documents Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Documents */}
        {insights.recentDocuments?.length > 0 && (
          <motion.div
            custom={9}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-50 flex items-center justify-center">
                  <FileBox className="h-4 w-4 text-cyan-600" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">Recent Documents</h3>
                  <p className="text-xs text-slate-500">{metrics.totalDocuments || 0} total files</p>
                </div>
              </div>
              <Link
                href={`/dashboard/projects/${project.id}?tab=files`}
                className="text-xs text-cyan-600 hover:text-cyan-700 font-medium flex items-center gap-1"
              >
                View all <ChevronRight className="w-3 h-3" />
              </Link>
            </div>

            <div className="divide-y divide-slate-100">
              {insights.recentDocuments.slice(0, 4).map((doc: any) => (
                <div key={doc.id} className="px-5 py-3 hover:bg-slate-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <FileText className="w-4 h-4 text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{doc.name || doc.fileName}</p>
                      <p className="text-xs text-slate-500">
                        {new Date(doc.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {doc.uploader && ` by ${doc.uploader.firstName}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Recently Completed */}
        {insights.recentlyCompleted?.length > 0 && (
          <motion.div
            custom={10}
            initial="hidden"
            animate="visible"
            variants={cardVariants}
            className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
          >
            <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-emerald-50 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recently Completed</h3>
                <p className="text-xs text-slate-500">Last 7 days</p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {insights.recentlyCompleted.map((task: any) => (
                <div key={task.id} className="px-5 py-3 hover:bg-emerald-50/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-slate-900 truncate">{task.title}</p>
                      <p className="text-xs text-slate-500">
                        Completed {task.completedAt && new Date(task.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {task.assignee && ` by ${task.assignee.firstName}`}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>

      {/* Recent Activity Section */}
      {project.activities?.length > 0 && (
        <motion.div
          custom={11}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 overflow-hidden"
        >
          <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-slate-100 flex items-center justify-center">
                <Zap className="h-4 w-4 text-slate-600" />
              </div>
              <div>
                <h3 className="text-sm font-semibold text-slate-900">Recent Activity</h3>
                <p className="text-xs text-slate-500">Latest updates on this project</p>
              </div>
            </div>
          </div>

          <div className="divide-y divide-slate-100">
            {project.activities.slice(0, 5).map((activity: any, idx: number) => {
              const getActivityConfig = (activityType: string, description: string) => {
                const type = activityType?.toLowerCase() || description?.toLowerCase() || ''

                if (type.includes('task') || type.includes('complete')) {
                  return { icon: CheckSquare, color: 'text-emerald-600', bg: 'bg-emerald-50' }
                } else if (type.includes('file') || type.includes('upload') || type.includes('document')) {
                  return { icon: Upload, color: 'text-blue-600', bg: 'bg-blue-50' }
                } else if (type.includes('comment') || type.includes('message') || type.includes('note')) {
                  return { icon: MessageSquare, color: 'text-purple-600', bg: 'bg-purple-50' }
                } else if (type.includes('user') || type.includes('assign') || type.includes('team')) {
                  return { icon: UserPlus, color: 'text-indigo-600', bg: 'bg-indigo-50' }
                } else if (type.includes('edit') || type.includes('update') || type.includes('change')) {
                  return { icon: Edit3, color: 'text-amber-600', bg: 'bg-amber-50' }
                } else if (type.includes('estimate') || type.includes('budget') || type.includes('invoice')) {
                  return { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-50' }
                } else if (type.includes('schedule') || type.includes('deadline') || type.includes('date')) {
                  return { icon: Calendar, color: 'text-rose-600', bg: 'bg-rose-50' }
                } else {
                  return { icon: Activity, color: 'text-slate-600', bg: 'bg-slate-100' }
                }
              }

              const { icon: IconComponent, color, bg } = getActivityConfig(activity.type, activity.description)

              return (
                <motion.div
                  key={activity.id}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.7 + idx * 0.05 }}
                  className="px-5 py-4 hover:bg-slate-50/50 transition-colors"
                >
                  <div className="flex items-start gap-4">
                    <div className={`w-9 h-9 ${bg} rounded-xl flex items-center justify-center flex-shrink-0`}>
                      <IconComponent className={`h-4 w-4 ${color}`} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700 leading-relaxed">{activity.description}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-semibold text-slate-600">
                          {activity.user?.firstName?.[0]}{activity.user?.lastName?.[0]}
                        </div>
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
                  </div>
                </motion.div>
              )
            })}
          </div>

          {project.activities.length > 5 && (
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-100">
              <button className="text-sm font-medium text-slate-600 hover:text-slate-900 transition-colors flex items-center gap-1">
                View all activity
                <ArrowUpRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </motion.div>
      )}

      {/* Empty State when no activities */}
      {(!project.activities || project.activities.length === 0) && (
        <motion.div
          custom={11}
          initial="hidden"
          animate="visible"
          variants={cardVariants}
          className="bg-white rounded-2xl border border-slate-200/60 p-8 text-center"
        >
          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <Activity className="h-6 w-6 text-slate-400" />
          </div>
          <h3 className="text-sm font-semibold text-slate-900 mb-1">No activity yet</h3>
          <p className="text-sm text-slate-500">
            Activity will appear here as you and your team work on this project.
          </p>
        </motion.div>
      )}
    </div>
  )
}
