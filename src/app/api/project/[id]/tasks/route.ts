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

    const tasks = await prisma.task.findMany({
      where: { 
        cardId: projectId
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
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
            lastName: true,
            email: true
          }
        }
        // dependsOn: {
        //   select: {
        //     id: true,
        //     title: true,
        //     status: true
        //   }
        // }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error('Error fetching project tasks:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project tasks' },
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

    // If assigneeId is provided, verify the assignee exists and belongs to the same company
    if (body.assigneeId) {
      const assignee = await prisma.user.findFirst({
        where: {
          id: body.assigneeId,
          companyId: user.companyId
        }
      })

      if (!assignee) {
        return NextResponse.json({ error: 'Invalid assignee' }, { status: 400 })
      }
    }

    // If dependencyIds are provided, verify they exist and belong to the same project
    if (body.dependencyIds && Array.isArray(body.dependencyIds) && body.dependencyIds.length > 0) {
      const dependencies = await prisma.task.findMany({
        where: {
          id: { in: body.dependencyIds },
          cardId: projectId
        }
      })

      if (dependencies.length !== body.dependencyIds.length) {
        return NextResponse.json({ error: 'One or more dependency tasks not found' }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description,
        status: 'TODO',
        priority: body.priority,
        dueDate: body.dueDate ? new Date(body.dueDate) : null,
        cardId: projectId,
        categoryId: body.categoryId || null,
        assigneeId: body.assigneeId || null,
        creatorId: user.id,
        // dependsOn: body.dependencyIds && Array.isArray(body.dependencyIds) && body.dependencyIds.length > 0 
        //   ? {
        //       connect: body.dependencyIds.map((id: string) => ({ id }))
        //     }
        //   : undefined
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
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
            lastName: true,
            email: true
          }
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

    // Create activity log
    await prisma.activity.create({
      data: {
        type: 'task_created',
        description: `Created task: ${task.title}`,
        cardId: projectId,
        userId: user.id
      }
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error('Error creating task:', error)
    return NextResponse.json(
      { error: 'Failed to create task' },
      { status: 500 }
    )
  }
}