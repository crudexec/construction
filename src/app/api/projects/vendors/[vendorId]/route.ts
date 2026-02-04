import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
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

    const { vendorId } = await params

    // Verify project vendor exists and belongs to user's company
    const existingProjectVendor = await prisma.projectVendor.findFirst({
      where: {
        id: vendorId,
        project: {
          companyId: user.companyId
        }
      }
    })

    if (!existingProjectVendor) {
      return NextResponse.json({ error: 'Project vendor assignment not found' }, { status: 404 })
    }

    const body = await request.json()
    const { status } = body

    const projectVendor = await prisma.projectVendor.update({
      where: {
        id: vendorId
      },
      data: {
        status: status
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

    return NextResponse.json(projectVendor)

  } catch (error) {
    console.error('Error updating project vendor:', error)
    return NextResponse.json(
      { error: 'Failed to update project vendor' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ vendorId: string }> }
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

    const { vendorId } = await params

    // Verify project vendor exists and belongs to user's company
    const existingProjectVendor = await prisma.projectVendor.findFirst({
      where: {
        id: vendorId,
        project: {
          companyId: user.companyId
        }
      }
    })

    if (!existingProjectVendor) {
      return NextResponse.json({ error: 'Project vendor assignment not found' }, { status: 404 })
    }

    await prisma.projectVendor.delete({
      where: {
        id: vendorId
      }
    })

    return NextResponse.json({ message: 'Vendor removed from project successfully' })

  } catch (error) {
    console.error('Error removing vendor from project:', error)
    return NextResponse.json(
      { error: 'Failed to remove vendor from project' },
      { status: 500 }
    )
  }
}