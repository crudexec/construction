import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

 async function GETHandler(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    const user = token ? await validateUser(token) : null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const type = request.nextUrl.searchParams.get('type')
    if (type && !/^[A-Z0-9_]{1,100}$/.test(type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 })
    }
    const assetType = type
    const categories = await prisma.asset.findMany({
      where: { companyId: user.companyId, category: { not: null }, ...(assetType && { type: assetType }) },
      select: { category: true },
      distinct: ['category'],
      orderBy: { category: 'asc' },
    })
    const names = new Map<string, string>()
    for (const { category } of categories) {
      if (category && !names.has(category.toLowerCase())) names.set(category.toLowerCase(), category)
    }
    return NextResponse.json([...names.values()])
  } catch (error) {
    console.error('Error fetching asset categories:', error)
    return NextResponse.json({ error: 'Failed to fetch asset categories' }, { status: 500 })
  }
}


export const GET = auditedRoute('/api/asset-categories', 'GET', GETHandler)
