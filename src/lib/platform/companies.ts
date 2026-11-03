import { Prisma } from '@prisma/client'
import { PlatformError } from './server'

export const companySelect = {
  id: true, name: true, appName: true, email: true, phone: true, website: true,
  address: true, city: true, state: true, zipCode: true, country: true, currency: true,
  status: true, createdAt: true, suspendedAt: true, suspensionReason: true, accessVersion: true,
  _count: { select: { users: true, assets: true, cards: true, feedbackRequests: true } },
  users: { where: { role: 'ADMIN' as const, isActive: true }, select: { id: true, firstName: true, lastName: true, email: true }, take: 5 },
} satisfies Prisma.CompanySelect

export async function lockCompany(tx: Prisma.TransactionClient, id: string) {
  await tx.$queryRaw(Prisma.sql`SELECT id FROM "Company" WHERE id=${id} FOR UPDATE`)
  const company = await tx.company.findUnique({ where: { id } })
  if (!company) throw new PlatformError('Company not found.', 404)
  return company
}
export const publicUser = { id: true, email: true, firstName: true, lastName: true, role: true, isActive: true, createdAt: true, lastLogin: true, platformAdmin: { select: { createdAt: true } } } satisfies Prisma.UserSelect
export const publicInvite = { id: true, email: true, firstName: true, lastName: true, role: true, createdAt: true, expiresAt: true, isAccepted: true } satisfies Prisma.TeamInviteSelect
