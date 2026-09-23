import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'

async function actor(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
  return token ? validateUser(token) : null
}

export async function GET(request: NextRequest) {
  const user = await actor(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json(await prisma.assetYard.findMany({ where: { companyId: user.companyId }, orderBy: { name: 'asc' } }))
}

export async function POST(request: NextRequest) {
  const user = await actor(request)
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!['ADMIN', 'STAFF'].includes(user.role)) return NextResponse.json({ error: 'Only staff or admins can add yards' }, { status: 403 })
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 100) return NextResponse.json({ error: 'Yard name must be between 1 and 100 characters' }, { status: 400 })
  const yard = await prisma.assetYard.upsert({ where: { companyId_name: { companyId: user.companyId, name } }, create: { companyId: user.companyId, name }, update: {} })
  return NextResponse.json(yard, { status: 201 })
}
