import { prisma } from '@/lib/prisma'
import { validateUser } from '@/lib/auth'
import { PlatformError } from '@/lib/platform/server'
import { defaultAssetTypes } from './type-options'
import type { NextRequest } from 'next/server'
export async function assetUser(request: NextRequest, admin = false) {
  const token = request.cookies.get('auth-token')?.value || request.headers.get('authorization')?.replace(/^Bearer /, '')
  const user = token ? await validateUser(token) : null
  if (!user) throw new PlatformError('Please sign in to continue.', 401)
  if (admin && user.role !== 'ADMIN') throw new PlatformError('Company administrator access is required.', 403)
  return user
}
export async function assetTypes(companyId: string) {
  const [rows, counts] = await Promise.all([
    prisma.assetTypeDefinition.findMany({ where: { companyId }, orderBy: { createdAt: 'asc' } }),
    prisma.asset.groupBy({ by: ['type'], where: { companyId }, _count: { _all: true } }),
  ])
  const options = new Map(defaultAssetTypes.map(type => [type.key, { ...type }]))
  for (const row of rows) options.set(row.key, { key: row.key, name: row.name, isActive: row.isActive })
  return [...options.values()].map(type => ({ ...type, assetCount: counts.find(count => count.type === type.key)?._count._all || 0 }))
}
export async function validateAssetType(companyId: string, value: unknown, current?: string) {
  if (typeof value !== 'string' || !/^[A-Z0-9_]{1,100}$/.test(value)) throw new PlatformError('Choose a valid asset type.')
  // Archived assignments can be retained when editing other asset fields.
  if (value === current) return value
  const stored = await prisma.assetTypeDefinition.findUnique({ where: { companyId_key: { companyId, key: value } } })
  const type = stored || defaultAssetTypes.find(type => type.key === value)
  if (!type?.isActive) throw new PlatformError('Choose an active asset type from your company settings.')
  return value
}
