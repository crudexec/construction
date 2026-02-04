import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: milestoneId } = await params

    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    return NextResponse.json(milestone)

  } catch (error) {
    console.error('Error fetching milestone:', error)
    return NextResponse.json(
      { error: 'Failed to fetch milestone' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: milestoneId } = await params
    const body = await request.json()

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    const { title, description, amount, targetDate, completedDate, status, vendorId, order } = body

    // If vendorId is provided, verify vendor exists and belongs to the company
    if (vendorId) {
      const vendor = await prisma.vendor.findFirst({
        where: {
          id: vendorId,
          companyId: user.companyId
        }
      })

      if (!vendor) {
        return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
      }
    }

    const updatedMilestone = await prisma.projectMilestone.update({
      where: { id: milestoneId },
      data: {
        ...(title !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(amount !== undefined && { amount: amount ? parseFloat(amount) : null }),
        ...(targetDate !== undefined && { targetDate: targetDate ? new Date(targetDate) : null }),
        ...(completedDate !== undefined && { completedDate: completedDate ? new Date(completedDate) : null }),
        ...(status !== undefined && { status }),
        ...(vendorId !== undefined && { vendorId: vendorId || null }),
        ...(order !== undefined && { order }),
        updatedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        createdBy: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'milestone_updated',
        description: `Updated milestone: ${updatedMilestone.title}`,
        cardId: milestone.project.id,
        userId: user.id
      }
    })

    return NextResponse.json(updatedMilestone)

  } catch (error) {
    console.error('Error updating milestone:', error)
    return NextResponse.json(
      { error: 'Failed to update milestone' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
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

    const { id: milestoneId } = await params

    // Verify milestone exists and user has access
    const milestone = await prisma.projectMilestone.findFirst({
      where: {
        id: milestoneId,
        project: {
          companyId: user.companyId
        }
      },
      include: {
        project: {
          select: {
            id: true,
            title: true
          }
        }
      }
    })

    if (!milestone) {
      return NextResponse.json({ error: 'Milestone not found' }, { status: 404 })
    }

    await prisma.projectMilestone.delete({
      where: { id: milestoneId }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'milestone_deleted',
        description: `Deleted milestone: ${milestone.title}`,
        cardId: milestone.project.id,
        userId: user.id
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Error deleting milestone:', error)
    return NextResponse.json(
      { error: 'Failed to delete milestone' },
      { status: 500 }
    )
  }
}
