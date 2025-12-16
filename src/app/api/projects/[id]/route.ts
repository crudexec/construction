import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'
import { Priority, CardStatus } from '@prisma/client'

interface DecodedToken {
  userId: string
  companyId: string
  role: string
}

async function getUserFromToken(request: Request): Promise<DecodedToken | null> {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    if (!token) return null
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken
    return decoded
  } catch {
    return null
  }
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    const project = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      },
      include: {
        stage: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json(project)
  } catch (error) {
    console.error('Error fetching project:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    
    // Check if project exists and belongs to user's company
    const existingProject = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check permissions (only ADMIN and STAFF can edit)
    if (user.role === 'CLIENT' || user.role === 'SUBCONTRACTOR') {
      return NextResponse.json({ error: 'Insufficient permissions' }, { status: 403 })
    }

    // Prepare update data
    const updateData: any = {
      title: body.title,
      description: body.description,
      contactName: body.contactName,
      contactEmail: body.contactEmail,
      contactPhone: body.contactPhone,
      projectAddress: body.projectAddress,
      projectCity: body.projectCity,
      projectState: body.projectState,
      projectZipCode: body.projectZipCode,
      projectSize: body.projectSize ? parseFloat(body.projectSize) : null,
      projectSizeUnit: body.projectSizeUnit,
      budget: body.budget ? parseFloat(body.budget) : null,
      timeline: body.timeline,
      priority: body.priority as Priority,
      status: body.status as CardStatus,
      updatedAt: new Date()
    }

    // Handle dates
    if (body.startDate) {
      updateData.startDate = new Date(body.startDate)
    }
    if (body.endDate) {
      updateData.endDate = new Date(body.endDate)
    }

    // Handle stage change if provided
    if (body.stageId && body.stageId !== existingProject.stageId) {
      // Verify stage belongs to company
      const stage = await prisma.stage.findFirst({
        where: {
          id: body.stageId,
          companyId: user.companyId
        }
      })
      
      if (!stage) {
        return NextResponse.json({ error: 'Invalid stage' }, { status: 400 })
      }
      
      updateData.stageId = body.stageId
    }

    // Handle owner change if provided
    if (body.ownerId !== undefined) {
      if (body.ownerId) {
        // Verify owner belongs to company
        const owner = await prisma.user.findFirst({
          where: {
            id: body.ownerId,
            companyId: user.companyId
          }
        })
        
        if (!owner) {
          return NextResponse.json({ error: 'Invalid owner' }, { status: 400 })
        }
      }
      updateData.ownerId = body.ownerId
    }

    // Handle assigned users if provided
    const assignedUserOperations: any = {}
    if (body.assignedUserIds) {
      // Verify all assigned users belong to company
      const users = await prisma.user.findMany({
        where: {
          id: { in: body.assignedUserIds },
          companyId: user.companyId
        }
      })
      
      if (users.length !== body.assignedUserIds.length) {
        return NextResponse.json({ error: 'Invalid assigned users' }, { status: 400 })
      }
      
      assignedUserOperations.assignedUsers = {
        set: body.assignedUserIds.map((id: string) => ({ id }))
      }
    }

    // Update the project
    const updatedProject = await prisma.card.update({
      where: { id: id },
      data: {
        ...updateData,
        ...assignedUserOperations
      },
      include: {
        stage: true,
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        },
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'project_updated',
        description: `Project details updated by ${user.role}`,
        metadata: JSON.stringify({
          updatedFields: Object.keys(body),
          updatedBy: user.userId
        }),
        cardId: id,
        userId: user.userId
      }
    })

    return NextResponse.json(updatedProject)
  } catch (error) {
    console.error('Error updating project:', error)
    return NextResponse.json(
      { error: 'Failed to update project' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getUserFromToken(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params

    // Only ADMIN can delete projects
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only administrators can delete projects' }, { status: 403 })
    }

    // Check if project exists and belongs to user's company
    const existingProject = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!existingProject) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Delete the project (cascade delete will handle related records)
    await prisma.card.delete({
      where: { id: id }
    })

    return NextResponse.json({ success: true, message: 'Project deleted successfully' })
  } catch (error) {
    console.error('Error deleting project:', error)
    return NextResponse.json(
      { error: 'Failed to delete project' },
      { status: 500 }
    )
  }
}