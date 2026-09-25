import { NextRequest, NextResponse } from 'next/server'
import { validateUser } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
  const user = token ? await validateUser(token) : null
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const q = request.nextUrl.searchParams.get('q')?.trim()
  const vendors = await prisma.vendor.findMany({ where: { companyId: user.companyId, ...(q ? { OR: [{ companyName: { contains: q, mode: 'insensitive' } }, { name: { contains: q, mode: 'insensitive' } }] } : {}) }, select: { id: true, companyName: true, name: true }, orderBy: [{ companyName: 'asc' }, { id: 'asc' }] })
  return NextResponse.json(vendors, { headers: { 'Cache-Control': 'no-store' } })
}
