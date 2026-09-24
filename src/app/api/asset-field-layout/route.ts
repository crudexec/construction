import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { defaultAssetFieldOrder, resolveAssetFieldOrder } from '@/lib/assets/field-layout'

async function authenticate(request: NextRequest) {
  const token = request.headers.get('authorization')?.replace('Bearer ', '') || request.cookies.get('auth-token')?.value
  return token ? validateUser(token) : null
}

const definitions = (companyId: string) => prisma.assetCustomFieldDefinition.findMany({
  where: { companyId },
  select: { id: true, name: true, fieldType: true, selectOptions: true, isActive: true },
  orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }, { id: 'asc' }],
})
const conflict = () => NextResponse.json({ error: 'The layout changed. Reload the layout before saving again.' }, { status: 409 })

export async function GET(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const [layout, customFields] = await Promise.all([
      prisma.assetFieldLayout.findUnique({ where: { companyId: user.companyId } }), definitions(user.companyId),
    ])
    return NextResponse.json({ order: resolveAssetFieldOrder(layout?.fieldOrder || [], customFields), version: layout?.version || 0, customFields }, { headers: { 'Cache-Control': 'private, no-store' } })
  } catch (error) {
    console.error('Error fetching asset field layout:', error)
    return NextResponse.json({ error: 'Unable to load asset field layout' }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await authenticate(request)
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    if (user.role !== 'ADMIN') return NextResponse.json({ error: 'Only admins can change the company asset layout' }, { status: 403 })
    let body
    try { body = await request.json() } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }) }
    if (!body || !Number.isSafeInteger(body.version) || body.version < 0 || (body.reset !== undefined && typeof body.reset !== 'boolean')) {
      return NextResponse.json({ error: 'A valid layout version is required' }, { status: 400 })
    }
    const customFields = await definitions(user.companyId)
    const defaults = defaultAssetFieldOrder(customFields)
    const order: unknown = body.reset === true ? defaults : body.order
    if (!Array.isArray(order) || order.length !== defaults.length || order.some(key => typeof key !== 'string' || !defaults.includes(key)) || new Set(order).size !== defaults.length) {
      return NextResponse.json({ error: 'Include every current company field exactly once. Reload if fields have been added or removed.' }, { status: 400 })
    }
    const fieldOrder = body.reset ? [] : order as string[]
    if (body.version === 0) {
      try {
        await prisma.assetFieldLayout.create({ data: { companyId: user.companyId, fieldOrder } })
      } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return conflict()
        throw error
      }
    } else {
      const result = await prisma.assetFieldLayout.updateMany({
        where: { companyId: user.companyId, version: body.version },
        data: { fieldOrder, version: { increment: 1 } },
      })
      if (!result.count) return conflict()
    }
    return NextResponse.json({ order, version: body.version + 1, customFields })
  } catch (error) {
    console.error('Error saving asset field layout:', error)
    return NextResponse.json({ error: 'Unable to save asset field layout' }, { status: 500 })
  }
}
