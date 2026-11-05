import { randomUUID } from 'node:crypto'
import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { assetTypes, assetUser } from '@/lib/assets/types'
import { failure, input, PlatformError, privateHeaders, text } from '@/lib/platform/server'
import { auditedRoute } from '@/lib/platform/route-audit'
async function get(request: NextRequest) {
  try { const user = await assetUser(request); return NextResponse.json(await assetTypes(user.companyId), { headers: privateHeaders }) }
  catch (error) { return failure(error) }
}
async function post(request: NextRequest) {
  try {
    const user = await assetUser(request, true), body = await input(request)
    const name = text(body.name, 'Type name', 80).normalize('NFKC'), nameKey = name.toLowerCase()
    if ((await assetTypes(user.companyId)).some(type => type.name.toLowerCase() === nameKey)) throw new PlatformError('An asset type with this name already exists.', 409)
    const key = `${name.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 60) || 'TYPE'}_${randomUUID().replaceAll('-', '').slice(0, 12).toUpperCase()}`
    const created = await prisma.assetTypeDefinition.create({ data: { companyId: user.companyId, key, name, nameKey } })
    return NextResponse.json(created, { status: 201, headers: privateHeaders })
  } catch (error) { if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') return failure(new PlatformError('An asset type with this name already exists.', 409)); return failure(error) }
}
export const GET = auditedRoute('/api/asset-types', 'GET', get)
export const POST = auditedRoute('/api/asset-types', 'POST', post)
