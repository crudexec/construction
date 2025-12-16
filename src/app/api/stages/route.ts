import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import jwt from 'jsonwebtoken'

interface DecodedToken {
  userId: string
  companyId: string
  role: string
}

export async function GET(request: Request) {
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