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

    // Verify project exists and belongs to user's company
    const project = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    // Get project vendors with vendor details
    const projectVendors = await prisma.projectVendor.findMany({
      where: {
        projectId: id
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            type: true,
            isActive: true
          }
        }
      },
      orderBy: {
        assignedAt: 'desc'
      }
    })

    return NextResponse.json(projectVendors)

  } catch (error) {
    console.error('Error fetching project vendors:', error)
    return NextResponse.json(
      { error: 'Failed to fetch project vendors' },
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

    // Verify project exists and belongs to user's company
    const project = await prisma.card.findFirst({
      where: {
        id: id,
        companyId: user.companyId
      }
    })

    if (!project) {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 })
    }

    const body = await request.json()
    const { vendorId, status = 'ASSIGNED' } = body

    // Verify vendor exists and belongs to user's company
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Check if vendor is already assigned to this project
    const existingAssignment = await prisma.projectVendor.findFirst({
      where: {
        projectId: id,
        vendorId: vendorId
      }
    })

    if (existingAssignment) {
      return NextResponse.json({ 
        error: 'Vendor is already assigned to this project' 
      }, { status: 409 })
    }

    // Create the project-vendor relationship
    const projectVendor = await prisma.projectVendor.create({
      data: {
        projectId: id,
        vendorId: vendorId,
        status: status,
        assignedAt: new Date()
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            companyName: true,
            email: true,
            phone: true,
            type: true,
            isActive: true
          }
        }
      }
    })

    return NextResponse.json(projectVendor, { status: 201 })

  } catch (error) {
    console.error('Error assigning vendor to project:', error)
    return NextResponse.json(
      { error: 'Failed to assign vendor to project' },
      { status: 500 }
    )
  }
}