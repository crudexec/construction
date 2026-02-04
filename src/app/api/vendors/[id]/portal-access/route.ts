import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { hashPassword } from '@/lib/vendor-auth'

// GET /api/vendors/[id]/portal-access - Get portal access status
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

    // Only admins can manage portal access
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can manage portal access' }, { status: 403 })
    }

    const { id } = await params

    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        companyId: user.companyId
      },
      select: {
        id: true,
        portalEmail: true,
        lastPortalLogin: true
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    return NextResponse.json({
      hasPortalAccess: !!vendor.portalEmail,
      portalEmail: vendor.portalEmail,
      lastLogin: vendor.lastPortalLogin
    })

  } catch (error) {
    console.error('Error fetching portal access:', error)
    return NextResponse.json(
      { error: 'Failed to fetch portal access' },
      { status: 500 }
    )
  }
}

// POST /api/vendors/[id]/portal-access - Enable or update portal access
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

    // Only admins can manage portal access
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can manage portal access' }, { status: 403 })
    }

    const { id } = await params
    const body = await request.json()
    const { email, password } = body

    if (!email) {
      return NextResponse.json({ error: 'Portal email is required' }, { status: 400 })
    }

    if (!password || password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 })
    }

    // Check if vendor exists
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Check if email is already used by another vendor
    const existingVendor = await prisma.vendor.findFirst({
      where: {
        portalEmail: email.toLowerCase(),
        id: { not: id }
      }
    })

    if (existingVendor) {
      return NextResponse.json({ error: 'This email is already used by another vendor' }, { status: 400 })
    }

    // Hash password and update vendor
    const hashedPassword = await hashPassword(password)

    const updatedVendor = await prisma.vendor.update({
      where: { id },
      data: {
        portalEmail: email.toLowerCase(),
        portalPassword: hashedPassword
      },
      select: {
        id: true,
        name: true,
        portalEmail: true
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Portal access enabled',
      vendor: updatedVendor
    })

  } catch (error) {
    console.error('Error enabling portal access:', error)
    return NextResponse.json(
      { error: 'Failed to enable portal access' },
      { status: 500 }
    )
  }
}

// DELETE /api/vendors/[id]/portal-access - Disable portal access
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

    // Only admins can manage portal access
    if (user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Only admins can manage portal access' }, { status: 403 })
    }

    const { id } = await params

    // Check if vendor exists
    const vendor = await prisma.vendor.findFirst({
      where: {
        id,
        companyId: user.companyId
      }
    })

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    // Clear portal access
    await prisma.vendor.update({
      where: { id },
      data: {
        portalEmail: null,
        portalPassword: null,
        portalToken: null,
        portalTokenExpiry: null
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Portal access disabled'
    })

  } catch (error) {
    console.error('Error disabling portal access:', error)
    return NextResponse.json(
      { error: 'Failed to disable portal access' },
      { status: 500 }
    )
  }
}
