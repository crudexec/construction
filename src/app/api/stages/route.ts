import { auditedRoute } from '@/lib/platform/route-audit'
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface DecodedToken {
  userId: string
  companyId: string
  role: string
}

 async function GETHandler(request: Request) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '')
    
    if (!token) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as DecodedToken

    // Fetch all stages for the company
    const stages = await prisma.stage.findMany({
      where: {
        companyId: decoded.companyId
      },
      orderBy: {
        order: 'asc'
      }
    })

    return NextResponse.json(stages)
  } catch (error) {
    console.error('Error fetching stages:', error)
    return NextResponse.json(
      { error: 'Failed to fetch stages' },
      { status: 500 }
    )
  }
}

export const GET = auditedRoute('/api/stages', 'GET', GETHandler)
