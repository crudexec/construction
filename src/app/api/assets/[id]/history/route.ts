import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { getAssetHistory } from '@/lib/assets/history-query'

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
    const user = token ? await validateUser(token) : null
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const history = await prisma.$transaction(tx => getAssetHistory(tx, id, user.companyId), { isolationLevel: 'RepeatableRead' })
    if (!history) return NextResponse.json({ error: 'Asset not found' }, { status: 404 })
    return NextResponse.json(history, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Error fetching asset history:', error)
    return NextResponse.json({ error: 'Failed to fetch asset history' }, { status: 500 })
  }
}
