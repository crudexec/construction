import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

// Add dependency to a task
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

    const { id: taskId } = await params
    const { dependencyId } = await request.json()

    // Verify both tasks exist and belong to the same company
    const [task, dependencyTask] = await Promise.all([
      prisma.task.findFirst({
        where: { 
          id: taskId,
          card: { companyId: user.companyId }
        }
      }),
      prisma.task.findFirst({
        where: { 
          id: dependencyId,
          card: { companyId: user.companyId }
        }
      })
    ])

    if (!task || !dependencyTask) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Prevent circular dependencies
    const existingDependencies = await prisma.task.findUnique({
      where: { id: dependencyId },
      include: {
        dependsOn: {
          include: {
            dependsOn: true
          }
        }
      }
    })

    // Simple circular dependency check (can be enhanced for deeper cycles)
    const checkCircularDependency = (deps: any[], targetId: string): boolean => {
      for (const dep of deps) {
        if (dep.id === targetId) return true
        if (dep.dependsOn && checkCircularDependency(dep.dependsOn, targetId)) return true
      }
      return false
    }

    if (checkCircularDependency(existingDependencies?.dependsOn || [], taskId)) {
      return NextResponse.json({ 
        error: 'Cannot create circular dependency' 
      }, { status: 400 })
    }

    // Add the dependency
    await prisma.task.update({
      where: { id: taskId },
      data: {
        dependsOn: {
          connect: { id: dependencyId }
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to add task dependency:', error)
    return NextResponse.json(
      { error: 'Failed to add task dependency' },
      { status: 500 }
    )
  }
}

// Remove dependency from a task
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: taskId } = await params
    const { dependencyId } = await request.json()

    // Verify task exists and belongs to the company
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        card: { companyId: user.companyId }
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Remove the dependency
    await prisma.task.update({
      where: { id: taskId },
      data: {
        dependsOn: {
          disconnect: { id: dependencyId }
        }
      }
    })

    return NextResponse.json({ success: true })

  } catch (error) {
    console.error('Failed to remove task dependency:', error)
    return NextResponse.json(
      { error: 'Failed to remove task dependency' },
      { status: 500 }
    )
  }
}

// Get available tasks for dependency selection
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

    const { id: taskId } = await params

    // Get the task and its project
    const task = await prisma.task.findFirst({
      where: { 
        id: taskId,
        card: { companyId: user.companyId }
      },
      include: {
        card: true,
        dependsOn: true
      }
    })

    if (!task) {
      return NextResponse.json({ error: 'Task not found' }, { status: 404 })
    }

    // Get all tasks in the same project except the current task and its existing dependencies
    const availableTasks = await prisma.task.findMany({
      where: {
        cardId: task.cardId,
        isArchived: false,
        NOT: {
          OR: [
            { id: taskId }, // Exclude self
            { id: { in: task.dependsOn.map(dep => dep.id) } } // Exclude existing dependencies
          ]
        }
      },
      select: {
        id: true,
        title: true,
        status: true,
        category: {
          select: {
            name: true,
            color: true
          }
        }
      },
      orderBy: {
        createdAt: 'asc'
      }
    })

    return NextResponse.json({
      availableTasks,
      currentDependencies: task.dependsOn.map(dep => dep.id)
    })

  } catch (error) {
    console.error('Failed to get available dependencies:', error)
    return NextResponse.json(
      { error: 'Failed to get available dependencies' },
      { status: 500 }
    )
  }
}