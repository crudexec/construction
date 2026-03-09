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

    const { id: vendorId } = await params

    // Verify vendor exists and user has access
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const folders = await prisma.vendorFolder.findMany({
      where: {
        vendorId: vendorId
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
    console.error('Error fetching vendor folders:', error)
    return NextResponse.json(
      { error: 'Failed to fetch vendor folders' },
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

    const { id: vendorId } = await params
    const body = await request.json()

    // Verify vendor exists and user has access
    const vendor = await prisma.vendor.findFirst({
      where: {
        id: vendorId,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // If parentId is provided, verify parent folder exists and belongs to same vendor
    if (body.parentId) {
      const parentFolder = await prisma.vendorFolder.findFirst({
        where: {
          id: body.parentId,
          vendorId: vendorId
        }
      })

      if (!parentFolder) {
        return NextResponse.json({ error: 'Parent folder not found' }, { status: 400 })
      }
    }

    const folder = await prisma.vendorFolder.create({
      data: {
        name: body.name,
        description: body.description,
        color: body.color || '#6366f1',
        parentId: body.parentId || null,
        vendorId: vendorId
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

    return NextResponse.json(folder)
  } catch (error) {
    console.error('Error creating vendor folder:', error)
    return NextResponse.json(
      { error: 'Failed to create folder' },
      { status: 500 }
    )
  }
}
