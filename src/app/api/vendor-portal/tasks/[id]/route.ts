import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify task belongs to vendor (either directly or through milestone)
    const task = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { vendorId: vendor.id },
          {
            milestone: {
              vendorId: vendor.id
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
        milestone: {
          select: {
            id: true,
            title: true,
            status: true,
            targetDate: true
          }
        },
        assignee: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        creator: {
          select: {
            id: true,
            firstName: true,
            lastName: true
          }
        },
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true
          }
        },
        attachments: {
          select: {
            id: true,
            fileName: true,
            fileSize: true,
            mimeType: true,
            url: true,
            createdAt: true,
            uploader: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            },
            uploadedByVendor: {
              select: {
                id: true,
                name: true,
                companyName: true
              }
            }
          },
          orderBy: { createdAt: 'desc' }
        },
        dependsOn: {
          select: {
            id: true,
            title: true,
            status: true
          }
        }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    // Format attachments to include uploader info from either user or vendor
    const formattedAttachments = task.attachments.map(att => ({
      ...att,
      uploader: att.uploader || (att.uploadedByVendor ? {
        id: att.uploadedByVendor.id,
        firstName: att.uploadedByVendor.name,
        lastName: att.uploadedByVendor.companyName ? `(${att.uploadedByVendor.companyName})` : ''
      } : null)
    }))

    return NextResponse.json({
      ...task,
      attachments: formattedAttachments
    })

  } catch (error) {
    console.error('Vendor task detail error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch task details' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: taskId } = await params
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify task belongs to vendor
    const existingTask = await prisma.task.findFirst({
      where: {
        id: taskId,
        OR: [
          { vendorId: vendor.id },
          {
            milestone: {
              vendorId: vendor.id
            }
          }
        ]
      }
    })

    if (!existingTask) {
      return NextResponse.json({ error: 'Task not found or not assigned to your vendor' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    // Vendors can only update status
    if (!status) {
      return NextResponse.json({ error: 'Status is required' }, { status: 400 })
    }

    if (!['TODO', 'IN_PROGRESS', 'COMPLETED'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        status,
        completedAt: status === 'COMPLETED' ? new Date() : null
      }
    })

    return NextResponse.json(updatedTask)

  } catch (error) {
    console.error('Vendor task update error:', error)
    return NextResponse.json(
      { error: 'Failed to update task' },
      { status: 500 }
    )
  }
}
