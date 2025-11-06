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

    const { id } = await params

    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        company: {
          select: {
            name: true
          }
        },
        bids: {
          orderBy: {
            submittedAt: 'desc'
          }
        },
        documents: {
          orderBy: {
            createdAt: 'desc'
          }
        },
        views: {
          orderBy: {
            viewedAt: 'desc'
          },
          take: 50
        },
        _count: {
          select: {
            bids: true,
            views: true
          }
        }
      }
    })

    if (!bidRequest) {
      return NextResponse.json({ error: 'Bid request not found' }, { status: 404 })
    }

    return NextResponse.json({ bidRequest })
  } catch (error) {
    console.error('Error fetching bid request:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid request' },
      { status: 500 }
    )
  }
}

export async function PUT(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { title, description, location, timeline, requirements, deadline, budget, isActive } = body

    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!bidRequest) {
      return NextResponse.json({ error: 'Bid request not found' }, { status: 404 })
    }

    const updatedBidRequest = await prisma.bidRequest.update({
      where: { id },
      data: {
        title: title?.trim(),
        description: description?.trim(),
        location: location?.trim() || null,
        timeline: timeline?.trim() || null,
        requirements: requirements?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        budget: budget ? parseFloat(budget) : null,
        isActive: isActive !== undefined ? isActive : undefined
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        }
      }
    })

    return NextResponse.json({ bidRequest: updatedBidRequest })
  } catch (error) {
    console.error('Error updating bid request:', error)
    return NextResponse.json(
      { error: 'Failed to update bid request' },
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params

    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!bidRequest) {
      return NextResponse.json({ error: 'Bid request not found' }, { status: 404 })
    }

    await prisma.bidRequest.delete({
      where: { id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting bid request:', error)
    return NextResponse.json(
      { error: 'Failed to delete bid request' },
      { status: 500 }
    )
  }
}