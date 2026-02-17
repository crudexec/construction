import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await validateUser(token)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const companyId = user.companyId
    const now = new Date()
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate())
    const endOfWeek = new Date(startOfDay.getTime() + 7 * 24 * 60 * 60 * 1000)
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)

    // Parallel queries for better performance
    const [
      // Projects summary
      projectStats,
      activeProjects,

      // Tasks summary
      taskStats,
      overdueTasks,
      upcomingTasks,

      // Leads (cards in non-project stages)
      leadStats,

      // Recent activities
      recentActivities,

      // Team members
      teamCount,

      // Vendors
      vendorCount,

      // Inventory alerts
      lowStockItems,

      // Asset requests pending
      pendingAssetRequests,

      // Financial summary from budget items
      financialSummary,

      // Project status distribution
      projectsByStatus,

      // Tasks completed this month
      tasksCompletedThisMonth,

      // Recent projects
      recentProjects
    ] = await Promise.all([
      // Project stats
      prisma.card.groupBy({
        by: ['status'],
        where: { companyId, status: { not: 'CANCELLED' } },
        _count: { id: true }
      }),

      // Active projects with progress
      prisma.card.findMany({
        where: { companyId, status: 'ACTIVE' },
        select: {
          id: true,
          title: true,
          budget: true,
          startDate: true,
          endDate: true,
          tasks: { select: { status: true } }
        },
        take: 5,
        orderBy: { updatedAt: 'desc' }
      }),

      // Task stats
      prisma.task.groupBy({
        by: ['status'],
        where: { card: { companyId } },
        _count: { id: true }
      }),

      // Overdue tasks
      prisma.task.findMany({
        where: {
          card: { companyId },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { lt: startOfDay }
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          card: { select: { id: true, title: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 5
      }),

      // Upcoming tasks (due within 7 days)
      prisma.task.findMany({
        where: {
          card: { companyId },
          status: { notIn: ['COMPLETED', 'CANCELLED'] },
          dueDate: { gte: startOfDay, lte: endOfWeek }
        },
        select: {
          id: true,
          title: true,
          dueDate: true,
          priority: true,
          status: true,
          card: { select: { id: true, title: true } }
        },
        orderBy: { dueDate: 'asc' },
        take: 10
      }),

      // Archived cards (leads/on-hold)
      prisma.card.count({
        where: {
          companyId,
          status: 'ARCHIVED'
        }
      }),

      // Recent activities
      prisma.activity.findMany({
        where: { card: { companyId } },
        include: {
          user: { select: { id: true, firstName: true, lastName: true } },
          card: { select: { id: true, title: true } }
        },
        orderBy: { createdAt: 'desc' },
        take: 10
      }),

      // Team count
      prisma.user.count({ where: { companyId, isActive: true } }),

      // Vendor count
      prisma.vendor.count({ where: { companyId } }),

      // Low stock inventory materials (quantity < 10)
      prisma.inventoryMaterial.findMany({
        where: {
          companyId,
          quantity: { lt: 10 }
        },
        select: {
          id: true,
          name: true,
          quantity: true,
          unit: true
        },
        orderBy: { quantity: 'asc' },
        take: 5
      }),

      // Pending asset requests
      prisma.assetRequest.count({
        where: {
          asset: { companyId },
          status: 'PENDING'
        }
      }),

      // Financial summary
      prisma.budgetItem.groupBy({
        by: ['isExpense'],
        where: { card: { companyId } },
        _sum: { amount: true }
      }),

      // Projects by status
      prisma.card.groupBy({
        by: ['status'],
        where: { companyId },
        _count: { id: true }
      }),

      // Tasks completed this month
      prisma.task.count({
        where: {
          card: { companyId },
          status: 'COMPLETED',
          updatedAt: { gte: startOfMonth }
        }
      }),

      // Recent projects
      prisma.card.findMany({
        where: { companyId, status: { in: ['ACTIVE', 'COMPLETED'] } },
        select: {
          id: true,
          title: true,
          status: true,
          budget: true,
          contactName: true,
          updatedAt: true,
          tasks: { select: { status: true } }
        },
        orderBy: { updatedAt: 'desc' },
        take: 5
      })
    ])

    // Calculate derived metrics
    const totalProjects = projectStats.reduce((sum, s) => sum + s._count.id, 0)
    const activeProjectCount = projectStats.find(s => s.status === 'ACTIVE')?._count.id || 0
    const completedProjectCount = projectStats.find(s => s.status === 'COMPLETED')?._count.id || 0

    const totalTasks = taskStats.reduce((sum, s) => sum + s._count.id, 0)
    const completedTaskCount = taskStats.find(s => s.status === 'COMPLETED')?._count.id || 0
    const inProgressTaskCount = taskStats.find(s => s.status === 'IN_PROGRESS')?._count.id || 0
    const pendingTaskCount = taskStats.find(s => s.status === 'TODO')?._count.id || 0

    const totalRevenue = financialSummary.find(f => !f.isExpense)?._sum.amount || 0
    const totalExpenses = financialSummary.find(f => f.isExpense)?._sum.amount || 0

    // Calculate progress for active projects
    const projectsWithProgress = activeProjects.map(p => ({
      ...p,
      progress: p.tasks.length > 0
        ? Math.round((p.tasks.filter(t => t.status === 'COMPLETED').length / p.tasks.length) * 100)
        : 0
    }))

    // Build alerts
    const alerts: any[] = []

    if (overdueTasks.length > 0) {
      alerts.push({
        id: 'overdue-tasks',
        type: 'warning',
        title: 'Overdue Tasks',
        message: `You have ${overdueTasks.length} overdue task${overdueTasks.length > 1 ? 's' : ''} that need attention`,
        count: overdueTasks.length,
        link: '/dashboard/projects?tab=tasks&filter=overdue'
      })
    }

    if (lowStockItems.length > 0) {
      alerts.push({
        id: 'low-stock',
        type: 'danger',
        title: 'Low Stock Alert',
        message: `${lowStockItems.length} item${lowStockItems.length > 1 ? 's are' : ' is'} running low on stock`,
        count: lowStockItems.length,
        link: '/dashboard/inventory?filter=low-stock'
      })
    }

    if (pendingAssetRequests > 0) {
      alerts.push({
        id: 'asset-requests',
        type: 'info',
        title: 'Pending Requests',
        message: `${pendingAssetRequests} asset request${pendingAssetRequests > 1 ? 's' : ''} awaiting approval`,
        count: pendingAssetRequests,
        link: '/dashboard/assets/requests'
      })
    }

    // Calculate recent projects with metrics
    const recentProjectsWithMetrics = recentProjects.map(p => ({
      id: p.id,
      title: p.title,
      status: p.status,
      budget: p.budget,
      contactName: p.contactName,
      updatedAt: p.updatedAt,
      progress: p.tasks.length > 0
        ? Math.round((p.tasks.filter(t => t.status === 'COMPLETED').length / p.tasks.length) * 100)
        : 0,
      taskCount: p.tasks.length,
      completedTasks: p.tasks.filter(t => t.status === 'COMPLETED').length
    }))

    return NextResponse.json({
      stats: {
        totalProjects,
        activeProjects: activeProjectCount,
        completedProjects: completedProjectCount,
        totalTasks,
        completedTasks: completedTaskCount,
        inProgressTasks: inProgressTaskCount,
        pendingTasks: pendingTaskCount,
        overdueTasks: overdueTasks.length,
        leads: leadStats,
        teamMembers: teamCount,
        vendors: vendorCount,
        revenue: totalRevenue,
        expenses: totalExpenses,
        profit: totalRevenue - totalExpenses,
        tasksCompletedThisMonth
      },
      alerts,
      overdueTasks,
      upcomingTasks,
      recentActivities,
      activeProjectsProgress: projectsWithProgress,
      recentProjects: recentProjectsWithMetrics,
      lowStockItems,
      projectsByStatus: projectsByStatus.map(p => ({
        status: p.status,
        count: p._count.id
      }))
    })
  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
