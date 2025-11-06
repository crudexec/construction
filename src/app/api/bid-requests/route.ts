import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { randomBytes } from 'crypto'

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

    const bidRequests = await prisma.bidRequest.findMany({
      where: {
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

    return NextResponse.json({ bidRequests })
  } catch (error) {
    console.error('Error fetching bid requests:', error)
    return NextResponse.json(
      { error: 'Failed to fetch bid requests' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
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

    const body = await request.json()
    const { title, description, location, timeline, requirements, deadline, budget } = body

    if (!title || !description) {
      return NextResponse.json({ error: 'Title and description are required' }, { status: 400 })
    }

    // Generate unique share token
    const shareToken = randomBytes(32).toString('hex')

    const bidRequest = await prisma.bidRequest.create({
      data: {
        title: title.trim(),
        description: description.trim(),
        location: location?.trim() || null,
        timeline: timeline?.trim() || null,
        requirements: requirements?.trim() || null,
        deadline: deadline ? new Date(deadline) : null,
        budget: budget ? parseFloat(budget) : null,
        shareToken,
        companyId: user.companyId,
        creatorId: user.id
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

    // Note: Activity logging skipped for bid requests as they don't have associated cards
    // Activities are designed for card/project-specific actions

    const shareUrl = `${process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'}/bid/${shareToken}`

    return NextResponse.json({ 
      bidRequest,
      shareUrl
    })
  } catch (error) {
    console.error('Error creating bid request:', error)
    return NextResponse.json(
      { error: 'Failed to create bid request' },
      { status: 500 }
    )
  }
}