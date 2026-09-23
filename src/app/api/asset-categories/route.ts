import { NextRequest, NextResponse } from 'next/server'
import { AssetType } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

export async function GET(request: NextRequest) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    const user = token ? await validateUser(token) : null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const type = request.nextUrl.searchParams.get('type')
    if (type && !Object.values(AssetType).some(value => value === type)) {
      return NextResponse.json({ error: 'Invalid asset type' }, { status: 400 })
    }
    const assetType = Object.values(AssetType).find(value => value === type)
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
