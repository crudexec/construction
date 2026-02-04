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

    const { id: vendorId } = await params

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Fetch tasks assigned to this vendor (directly or through milestone)
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { vendorId: vendorId },
          {
            milestone: {
              vendorId: vendorId
            }
          }
        ]
      },
      include: {
        card: {
          select: {
            id: true,
            title: true,
            status: true
          }
        },
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        completionApprover: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        }
      },
      orderBy: [
        { completionPendingApproval: 'desc' },
        { status: 'asc' },
        { dueDate: 'asc' }
      ]
    })

    return NextResponse.json(tasks)

  } catch (error) {
    console.error('Error fetching vendor tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor tasks' },
      { status: 500 }
    )
  }
}
