import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assetTypes, assetUser } from '@/lib/assets/types'
import { failure, input, PlatformError, privateHeaders, text } from '@/lib/platform/server'
import { auditedRoute } from '@/lib/platform/route-audit'
async function patch(request: NextRequest, context: { params: Promise<{ key: string }> }) {
  try {
    const user = await assetUser(request, true), { key } = await context.params, body = await input(request)
    const types = await assetTypes(user.companyId), existing = types.find(type => type.key === key)
    if (!existing) throw new PlatformError('Asset type not found.', 404)
    const name = body.name === undefined ? existing.name : text(body.name, 'Type name', 80).normalize('NFKC'), nameKey = name.toLowerCase()
    if (body.isActive !== undefined && typeof body.isActive !== 'boolean') throw new PlatformError('Invalid type availability.')
    if (types.some(type => type.key !== key && type.name.toLowerCase() === nameKey)) throw new PlatformError('An asset type with this name already exists.', 409)
    const isActive = body.isActive ?? existing.isActive
    const saved = await prisma.assetTypeDefinition.upsert({ where: { companyId_key: { companyId: user.companyId, key } }, create: { companyId: user.companyId, key, name, nameKey, isActive }, update: { name, nameKey, isActive } })
    return NextResponse.json(saved, { headers: privateHeaders })
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return failure(new PlatformError('An asset type with this name already exists.', 409)); return failure(error) }
}
export const PATCH = auditedRoute('/api/asset-types/[key]', 'PATCH', patch)
