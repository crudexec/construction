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

    const folders = await prisma.folder.findMany({
      where: { 
        cardId: projectId
      },
      include: {
        _count: {
          select: { 
            documents: true,
            children: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      },
      orderBy: {
        name: 'asc'
      }
    })

    return NextResponse.json(folders)
  } catch (error) {
    console.error('Error fetching project folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project folders' },
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

    const { id: projectId } = await params
    const body = await request.json()

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

    // If parentId is provided, verify parent folder exists and belongs to same project
    if (body.parentId) {
      const parentFolder = await prisma.folder.findFirst({
        where: {
          id: body.parentId,
          cardId: projectId
        }
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 400 })
      }
    }

    const folder = await prisma.folder.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color || '#6366f1',
        parentId: body.parentId || null,
        cardId: projectId
      },
      include: {
        _count: {
          select: { 
            documents: true,
            children: true
          }
        },
        parent: {
          select: {
            id: true,
            name: true
          }
        }
      }
    })

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'folder_created',
        description: `Created folder: ${folder.name}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error creating folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}