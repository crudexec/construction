import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { randomBytes } from 'crypto'

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

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const bidRequests = await prisma.bidRequest.findMany({
      where: {
        cardId: projectId,
        companyId: user.companyId
      },
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            bids: true,
            views: true
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(bidRequests)
  } catch (error) {
    console.error('Error fetching project bid requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid requests' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    // Check permissions (ADMIN and STAFF can create bid requests)
    if (user.role !== 'ADMIN' && user.role !== 'STAFF') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    const { id: projectId } = await params

    // Verify project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      },
      select: {
        title: true,
        projectAddress: true,
        projectCity: true,
        projectState: true,
        projectZipCode: true,
        description: true,
        timeline: true,
        budget: true
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { 
      title, 
      description, 
      location, 
      timeline, 
      requirements, 
      deadline, 
      budget,
      useProjectDefaults 
    } = body

    // Use project defaults if specified
    let bidRequestData: any = {
      title: title?.trim() || `Bid Request for ${project.title}`,
      description: description?.trim() || project.description || '',
      location: location?.trim(),
      timeline: timeline?.trim(),
      requirements: requirements?.trim() || null,
      deadline: deadline ? new Date(deadline) : null,
      budget: budget ? parseFloat(budget) : null,
      shareToken: randomBytes(32).toString('hex'),
      cardId: projectId,
      companyId: user.companyId,
      creatorId: user.id
    }

    // If useProjectDefaults is true, use project data
    if (useProjectDefaults) {
      const projectLocation = [
        project.projectAddress,
        project.projectCity,
        project.projectState,
        project.projectZipCode
      ].filter(Boolean).join(', ')

      bidRequestData = {
        ...bidRequestData,
        location: bidRequestData.location || projectLocation || null,
        timeline: bidRequestData.timeline || project.timeline || null,
        budget: bidRequestData.budget || project.budget || null
      }
    }

    const bidRequest = await prisma.bidRequest.create({
      data: bidRequestData,
      include: {
        creator: {
          select: {
            firstName: true,
            lastName: true
          }
        },
        _count: {
          select: {
            bids: true,
            views: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'bid_request_created',
        description: `Created bid request: ${bidRequest.title}`,
        metadata: JSON.stringify({
          bidRequestId: bidRequest.id,
          shareToken: bidRequest.shareToken
        }),
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(bidRequest)
  } catch (error) {
    console.error('Error creating bid request:', error)
    return NextResponse.json(
      { error: 'Failed to create bid request' },
      { status: 500 }
    )
  }
}