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

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const projectLinks = await prisma.projectContract.findMany({
      where: {
        contractId: id
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            budget: true,
            startDate: true,
            endDate: true
          }
        }
      }
    })

    return NextResponse.json(projectLinks)

  } catch (error) {
    console.error('Error fetching contract projects:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contract projects' },
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

    const { id } = await params

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const body = await request.json()
    const { projectId, allocatedAmount, notes } = body

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify project exists and belongs to user's company
    const project = await prisma.card.findFirst({
      where: {
        id: projectId,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Check if link already exists
    const existingLink = await prisma.projectContract.findUnique({
      where: {
        contractId_projectId: {
          contractId: id,
          projectId
        }
      }
    })

    if (existingLink) {
      return NextResponse.json(
        { error: 'Contract is already linked to this project' },
        { status: 409 }
      )
    }

    const projectContract = await prisma.projectContract.create({
      data: {
        contractId: id,
        projectId,
        allocatedAmount,
        notes
      },
      include: {
        project: {
          select: {
            id: true,
            title: true,
            status: true,
            budget: true
          }
        },
        contract: {
          select: {
            id: true,
            contractNumber: true,
            totalSum: true
          }
        }
      }
    })

    return NextResponse.json(projectContract, { status: 201 })

  } catch (error) {
    console.error('Error linking contract to project:', error)
    return NextResponse.json(
      { error: 'Failed to link contract to project' },
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
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const { searchParams } = new URL(request.url)
    const projectId = searchParams.get('projectId')

    if (!projectId) {
      return NextResponse.json(
        { error: 'Project ID is required' },
        { status: 400 }
      )
    }

    // Verify contract exists and belongs to user's company
    const contract = await prisma.vendorContract.findFirst({
      where: {
        id,
        vendor: {
          companyId: user.companyId
        }
      }
    })

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    // Delete the link
    await prisma.projectContract.delete({
      where: {
        contractId_projectId: {
          contractId: id,
          projectId
        }
      }
    })

    return NextResponse.json({ message: 'Project link removed successfully' })

  } catch (error) {
    console.error('Error removing project link:', error)
    return NextResponse.json(
      { error: 'Failed to remove project link' },
      { status: 500 }
    )
  }
}
