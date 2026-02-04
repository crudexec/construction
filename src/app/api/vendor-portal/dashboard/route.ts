import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get assigned projects
    const projectVendors = await prisma.projectVendor.findMany({
      where: {
        vendorId: vendor.id
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    // Get tasks assigned to vendor
    const tasks = await prisma.task.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        id: true,
        title: true,
        description: true,
        status: true,
        priority: true,
        dueDate: true,
        completedAt: true,
        card: {
          select: {
            id: true,
            title: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        dueDate: 'asc'
      },
      take: 10
    })

    // Get contracts
    const contracts = await prisma.vendorContract.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        id: true,
        contractNumber: true,
        type: true,
        totalSum: true,
        status: true,
        startDate: true,
        endDate: true,
        _count: {
          select: {
            projects: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // Get recent reviews
    const reviews = await prisma.vendorReview.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        id: true,
        overallRating: true,
        qualityRating: true,
        timelinessRating: true,
        communicationRating: true,
        professionalismRating: true,
        comments: true,
        createdAt: true,
        project: {
          select: {
            title: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: 5
    })

    // Calculate average ratings
    const allReviews = await prisma.vendorReview.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        overallRating: true,
        qualityRating: true,
        timelinessRating: true,
        communicationRating: true,
        professionalismRating: true
      }
    })

    const avgRatings = allReviews.length > 0 ? {
      overall: allReviews.reduce((sum, r) => sum + r.overallRating, 0) / allReviews.length,
      quality: allReviews.filter(r => r.qualityRating).reduce((sum, r) => sum + (r.qualityRating || 0), 0) / allReviews.filter(r => r.qualityRating).length || 0,
      timeliness: allReviews.filter(r => r.timelinessRating).reduce((sum, r) => sum + (r.timelinessRating || 0), 0) / allReviews.filter(r => r.timelinessRating).length || 0,
      communication: allReviews.filter(r => r.communicationRating).reduce((sum, r) => sum + (r.communicationRating || 0), 0) / allReviews.filter(r => r.communicationRating).length || 0,
      professionalism: allReviews.filter(r => r.professionalismRating).reduce((sum, r) => sum + (r.professionalismRating || 0), 0) / allReviews.filter(r => r.professionalismRating).length || 0,
      totalReviews: allReviews.length
    } : null

    // Get stats
    const taskStats = {
      total: await prisma.task.count({ where: { vendorId: vendor.id } }),
      completed: await prisma.task.count({ where: { vendorId: vendor.id, status: 'COMPLETED' } }),
      inProgress: await prisma.task.count({ where: { vendorId: vendor.id, status: 'IN_PROGRESS' } }),
      overdue: await prisma.task.count({
        where: {
          vendorId: vendor.id,
          status: { not: 'COMPLETED' },
          dueDate: { lt: new Date() }
        }
      })
    }

    return NextResponse.json({
      vendor: {
        id: vendor.id,
        name: vendor.name,
        companyName: vendor.companyName,
        status: vendor.status,
        type: vendor.type
      },
      projects: projectVendors.map(pv => ({
        ...pv.project,
        status: pv.status,
        assignedScope: pv.assignedScope
      })),
      recentTasks: tasks,
      contracts,
      recentReviews: reviews,
      ratings: avgRatings,
      stats: taskStats
    })

  } catch (error) {
    console.error('Vendor dashboard error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch dashboard data' },
      { status: 500 }
    )
  }
}
