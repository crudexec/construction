import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { comparePassword, generateVendorToken } from '@/lib/vendor-auth'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { email, password } = body

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Find vendor by portal email
    const vendor = await prisma.vendor.findFirst({
      where: {
        portalEmail: email.toLowerCase(),
        isActive: true
      },
      include: {
        company: {
          select: {
            id: true,
            name: true,
            appName: true,
            currency: true
          }
        }
      }
    })

    if (!vendor) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Check if vendor has portal access
    if (!vendor.portalPassword) {
      return NextResponse.json(
        { error: 'Portal access not configured. Please contact the company.' },
        { status: 401 }
      )
    }

    // Check vendor status
    if (vendor.status === 'BLACKLISTED') {
      return NextResponse.json(
        { error: 'Your account has been suspended. Please contact the company.' },
        { status: 403 }
      )
    }

    if (vendor.status === 'SUSPENDED') {
      return NextResponse.json(
        { error: 'Your account is temporarily suspended. Please contact the company.' },
        { status: 403 }
      )
    }

    // Verify password
    const isValidPassword = await comparePassword(password, vendor.portalPassword)
    if (!isValidPassword) {
      return NextResponse.json(
        { error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Generate token
    const token = generateVendorToken({
      vendorId: vendor.id,
      email: vendor.portalEmail!,
      companyId: vendor.companyId,
      type: 'vendor'
    })

    // Update last login
    await prisma.vendor.update({
      where: { id: vendor.id },
      data: { lastPortalLogin: new Date() }
    })

    // Return vendor data without sensitive fields
    const vendorData = {
      id: vendor.id,
      name: vendor.name,
      companyName: vendor.companyName,
      email: vendor.email,
      portalEmail: vendor.portalEmail,
      phone: vendor.phone,
      status: vendor.status,
      type: vendor.type,
      companyId: vendor.companyId,
      company: vendor.company // Includes company.currency for proper currency formatting
    }

    console.log('[Vendor Login] Company currency:', vendor.company?.currency)

    return NextResponse.json({
      vendor: vendorData,
      token
    })

  } catch (error) {
    console.error('Vendor login error:', error)
    return NextResponse.json(
      { error: 'Login failed' },
      { status: 500 }
    )
  }
}
