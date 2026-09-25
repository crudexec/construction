import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { saveSupplierCompany, removeSupplier, RelationshipError } from '@/lib/vendors/relationships'

async function validateVendor(vendorId: string, companyId: string) {
  return prisma.vendor.findFirst({
    where: {
      id: vendorId,
      companyId,
    },
  })
}

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
    const vendor = await validateVendor(vendorId, user.companyId)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const suppliers = await prisma.vendorSupplier.findMany({
      where: { vendorId },
      orderBy: { name: 'asc' },
    })

    return NextResponse.json(suppliers)
  } catch (error) {
    console.error('Error fetching vendor suppliers:', error)
    return NextResponse.json({ error: 'Failed to fetch suppliers' }, { status: 500 })
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
    const vendor = await validateVendor(vendorId, user.companyId)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const body = await request.json()
    const supplier = await saveSupplierCompany(user.companyId, vendorId, body)

    return NextResponse.json(supplier, { status: 201 })
  } catch (error) {
    console.error('Error creating vendor supplier:', error)
    if (error instanceof RelationshipError) return NextResponse.json({ error: error.message, candidates: error.candidates }, { status: error.status })
    return NextResponse.json({ error: 'Failed to create supplier' }, { status: 500 })
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

    const { id: vendorId } = await params
    const vendor = await validateVendor(vendorId, user.companyId)

    if (!vendor) {
      return NextResponse.json({ error: 'Vendor not found' }, { status: 404 })
    }

    const supplierId = request.nextUrl.searchParams.get('supplierId')
    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 })
    }

    const supplier = await prisma.vendorSupplier.findFirst({
      where: {
        id: supplierId,
        vendorId,
      },
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    await removeSupplier(user.companyId, vendorId, supplierId)

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error deleting vendor supplier:', error)
    if (error instanceof RelationshipError) return NextResponse.json({ error: error.message }, { status: error.status })
    return NextResponse.json({ error: 'Failed to delete supplier' }, { status: 500 })
  }
}
