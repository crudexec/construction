import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
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

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const urgency = searchParams.get('urgency')

    const whereClause: any = { asset: { companyId: user.companyId } }
    if (status) whereClause.status = status
    if (urgency) whereClause.urgency = urgency

    const issues = await prisma.assetIssue.findMany({
      where: whereClause,
      include: {
        asset: { select: { id: true, name: true, type: true, equipmentId: true } },
        reportedBy: { select: { id: true, firstName: true, lastName: true } },
        _count: { select: { comments: true } }
      },
      orderBy: [{ status: 'asc' }, { createdAt: 'desc' }]
    })

    return NextResponse.json(issues)
  } catch (error) {
    console.error('Error fetching all asset issues:', error)
    return NextResponse.json({ error: 'Failed to fetch issues' }, { status: 500 })
  }
}
