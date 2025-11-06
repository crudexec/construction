import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function PATCH(
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
    if (!user || user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 401 })
    }

    const { id } = await params
    const { status } = await request.json()

    if (!['SUBMITTED', 'UNDER_REVIEW', 'ACCEPTED', 'REJECTED', 'WITHDRAWN'].includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Verify the bid exists and belongs to the user's company
    const bid = await prisma.bid.findFirst({
      where: {
        id,
        bidRequest: {
          companyId: user.companyId
        }
      },
      include: {
        bidRequest: {
          select: {
            title: true,
            companyId: true
          }
        }
      }
    })

    if (!bid) {
      return NextResponse.json({ error: 'Bid not found' }, { status: 404 })
    }

    const updatedBid = await prisma.bid.update({
      where: { id },
      data: { status }
    })

    return NextResponse.json({ bid: updatedBid })
  } catch (error) {
    console.error('Error updating bid status:', error)
    return NextResponse.json(
      { error: 'Failed to update bid status' },
      { status: 500 }
    )
  }
}