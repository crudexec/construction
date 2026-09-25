import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

async function validateContract(contractId: string, companyId: string) {
  return prisma.vendorContract.findFirst({
    where: {
      id: contractId,
      companyId
    }
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

    const { id: contractId } = await params
    const contract = await validateContract(contractId, user.companyId)

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const links = await prisma.contractSupplier.findMany({
      where: { contractId },
      include: {
        supplier: true
      },
      orderBy: { createdAt: 'asc' }
    })

    return NextResponse.json(links)
  } catch (error) {
    console.error('Error fetching contract suppliers:', error)
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

    const { id: contractId } = await params
    const contract = await validateContract(contractId, user.companyId)

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const body = await request.json()
    const vendorSupplierId = typeof body.vendorSupplierId === 'string' ? body.vendorSupplierId : ''

    if (!vendorSupplierId) {
      return NextResponse.json({ error: 'vendorSupplierId is required' }, { status: 400 })
    }

    // The supplier must belong to this contract's own vendor
    const supplier = await prisma.vendorSupplier.findFirst({
      where: {
        id: vendorSupplierId,
        vendorId: contract.vendorId
      }
    })

    if (!supplier) {
      return NextResponse.json({ error: 'Supplier not found' }, { status: 404 })
    }

    const existing = await prisma.contractSupplier.findUnique({
      where: {
        contractId_vendorSupplierId: {
          contractId,
          vendorSupplierId
        }
      }
    })

    if (existing) {
      return NextResponse.json({ error: 'Supplier is already linked to this contract' }, { status: 409 })
    }

    const link = await prisma.contractSupplier.create({
      data: {
        contractId,
        vendorSupplierId
      },
      include: {
        supplier: true
      }
    })

    return NextResponse.json(link, { status: 201 })
  } catch (error) {
    console.error('Error linking supplier to contract:', error)
    return NextResponse.json({ error: 'Failed to link supplier' }, { status: 500 })
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

    const { id: contractId } = await params
    const contract = await validateContract(contractId, user.companyId)

    if (!contract) {
      return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
    }

    const supplierId = request.nextUrl.searchParams.get('supplierId')
    if (!supplierId) {
      return NextResponse.json({ error: 'supplierId is required' }, { status: 400 })
    }

    const link = await prisma.contractSupplier.findFirst({
      where: {
        contractId,
        vendorSupplierId: supplierId
      }
    })

    if (!link) {
      return NextResponse.json({ error: 'Supplier link not found' }, { status: 404 })
    }

    if (await prisma.lienRelease.count({ where: { contractId, vendorSupplierId: supplierId } })) {
      return NextResponse.json({ error: 'Supplier has lien releases on this contract and cannot be unlinked.' }, { status: 409 })
    }
    await prisma.contractSupplier.delete({
      where: { id: link.id }
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error unlinking supplier from contract:', error)
    return NextResponse.json({ error: 'Failed to unlink supplier' }, { status: 500 })
  }
}
