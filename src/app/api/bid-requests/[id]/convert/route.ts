import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const { bidId, convertTo, stageId } = await request.json()

    if (!bidId || !convertTo || (convertTo === 'project' && !stageId)) {
      return NextResponse.json({ 
        error: 'Bid ID, conversion type, and stage ID (for project) are required' 
      }, { status: 400 })
    }

    // Get the bid request and selected bid
    const bidRequest = await prisma.bidRequest.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        bids: {
          where: { id: bidId }
        }
      }
    })

    if (!bidRequest || bidRequest.bids.length === 0) {
      return NextResponse.json({ error: 'Bid request or bid not found' }, { status: 404 })
    }

    const bid = bidRequest.bids[0]

    if (convertTo === 'project') {
      // Convert to project
      const project = await prisma.card.create({
        data: {
          title: bidRequest.title,
          description: `${bidRequest.description}\n\nAwarded to: ${bid.companyName}\nContact: ${bid.contactName} (${bid.contactEmail})\nBid Amount: $${bid.totalAmount?.toLocaleString() || 'Not specified'}`,
          contactName: bid.contactName,
          contactEmail: bid.contactEmail,
          contactPhone: bid.contactPhone,
          projectAddress: bidRequest.location,
          budget: bid.totalAmount,
          priority: 'MEDIUM',
          status: 'ACTIVE',
          stageId,
          companyId: user.companyId,
          ownerId: user.id,
          customFields: JSON.stringify({
            bidRequestId: bidRequest.id,
            bidId: bid.id,
            awardedCompany: bid.companyName,
            originalBudget: bid.totalAmount,
            licenseNumber: bid.licenseNumber,
            insuranceInfo: bid.insuranceInfo
          })
        }
      })

      // Update bid status
      await prisma.bid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' }
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: 'bid_converted_to_project',
          description: `Converted bid from ${bid.companyName} to project: ${bidRequest.title}`,
          cardId: project.id,
          userId: user.id,
          metadata: JSON.stringify({
            bidRequestId: bidRequest.id,
            bidId: bid.id,
            bidAmount: bid.totalAmount
          })
        }
      })

      return NextResponse.json({ 
        success: true,
        projectId: project.id,
        message: 'Bid successfully converted to project'
      })

    } else if (convertTo === 'task') {
      // Convert to task - this requires selecting a project
      const { projectId, categoryId } = await request.json()
      
      if (!projectId) {
        return NextResponse.json({ error: 'Project ID is required for task conversion' }, { status: 400 })
      }

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

      const task = await prisma.task.create({
        data: {
          title: bidRequest.title,
          description: `${bidRequest.description}\n\nAwarded to: ${bid.companyName}\nContact: ${bid.contactName} (${bid.contactEmail})\nBid Amount: $${bid.totalAmount?.toLocaleString() || 'Not specified'}`,
          priority: 'MEDIUM',
          status: 'TODO',
          cardId: projectId,
          categoryId: categoryId || null,
          creatorId: user.id
        }
      })

      // Update bid status
      await prisma.bid.update({
        where: { id: bidId },
        data: { status: 'ACCEPTED' }
      })

      // Create activity
      await prisma.activity.create({
        data: {
          type: 'bid_converted_to_task',
          description: `Converted bid from ${bid.companyName} to task: ${bidRequest.title}`,
          cardId: projectId,
          userId: user.id,
          metadata: JSON.stringify({
            bidRequestId: bidRequest.id,
            bidId: bid.id,
            taskId: task.id,
            bidAmount: bid.totalAmount
          })
        }
      })

      return NextResponse.json({ 
        success: true,
        taskId: task.id,
        projectId,
        message: 'Bid successfully converted to task'
      })
    }

    return NextResponse.json({ error: 'Invalid conversion type' }, { status: 400 })

  } catch (error) {
    console.error('Error converting bid:', error)
    return NextResponse.json(
      { error: 'Failed to convert bid' },
      { status: 500 }
    )
  }
}