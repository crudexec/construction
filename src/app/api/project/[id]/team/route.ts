import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// GET: Get all team members for a project
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

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      include: {
        assignedUsers: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          }
        },
        owner: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
            role: true,
            avatar: true
          }
        }
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    return NextResponse.json({ 
      assignedUsers: project.assignedUsers,
      owner: project.owner 
    })
  } catch (error) {
    console.error('Error fetching project team:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project team' },
      { status: 500 }
    )
  }
}

// POST: Add user to project team
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
    }

    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if target user exists in the same company
    const targetUser = await prisma.user.findFirst({
      where: {
        id: userId,
        companyId: user.companyId
      }
    })

    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    // Add user to project team
    await prisma.card.update({
      where: { id },
      data: {
        assignedUsers: {
          connect: { id: userId }
        }
      }
    })

    return NextResponse.json({ message: 'User added to project team successfully' })
  } catch (error) {
    console.error('Error adding user to project team:', error)
    return NextResponse.json(
      { error: 'Failed to add user to project team' },
      { status: 500 }
    )
  }
}

// DELETE: Remove user from project team
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
    if (!user || (user.role !== 'ADMIN' && user.role !== 'STAFF')) {
      return NextResponse.json({ error: 'Unauthorized - Admin or Staff access required' }, { status: 401 })
    }

    const { id } = await params
    const { userId } = await request.json()

    if (!userId) {
      return NextResponse.json({ error: 'User ID is required' }, { status: 400 })
    }

    // Check if project exists and user has access
    const project = await prisma.card.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Remove user from project team
    await prisma.card.update({
      where: { id },
      data: {
        assignedUsers: {
          disconnect: { id: userId }
        }
      }
    })

    return NextResponse.json({ message: 'User removed from project team successfully' })
  } catch (error) {
    console.error('Error removing user from project team:', error)
    return NextResponse.json(
      { error: 'Failed to remove user from project team' },
      { status: 500 }
    )
  }
}