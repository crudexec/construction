import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateVendor } from '@/lib/vendor-auth'

export async function GET(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization')
    const token = authHeader?.replace('Bearer ', '') || request.cookies.get('vendor-auth-token')?.value

    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const vendor = await validateVendor(token)
    if (!vendor) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const contracts = await prisma.vendorContract.findMany({
      where: {
        vendorId: vendor.id
      },
      select: {
        id: true,
        contractNumber: true,
        type: true,
        totalSum: true,
        retentionPercent: true,
        retentionAmount: true,
        warrantyYears: true,
        startDate: true,
        endDate: true,
        status: true,
        terms: true,
        createdAt: true,
        projects: {
          select: {
            allocatedAmount: true,
            project: {
              select: {
                id: true,
                title: true,
                status: true
              }
            }
          }
        },
        payments: {
          select: {
            id: true,
            amount: true,
            paymentDate: true,
            reference: true,
            notes: true,
            createdAt: true,
            createdBy: {
              select: {
                id: true,
                firstName: true,
                lastName: true
              }
            }
          },
          orderBy: {
            paymentDate: 'desc'
          }
        }
      },
      orderBy: {
        createdAt: 'desc'
      }
    })

    return NextResponse.json(contracts)

  } catch (error) {
    console.error('Vendor contracts error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch contracts' },
      { status: 500 }
    )
  }
}
