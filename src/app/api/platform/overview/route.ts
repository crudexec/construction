import { Prisma } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { failure, privateHeaders, requirePlatform } from '@/lib/platform/server'

export async function GET(request: NextRequest) {
  try {
    await requirePlatform(request)
    const week = new Date(Date.now() - 7 * 86400000), month = new Date(Date.now() - 30 * 86400000), day = new Date(Date.now() - 86400000)
    const [companies, activeCompanies, activeUsers, newCompanies, openFeedback, expiredInvites, failedActions, missingAdmin, inactive, unanswered, recent, incomplete] = await Promise.all([
      prisma.company.count(), prisma.company.count({ where: { status: 'ACTIVE' } }),
      prisma.user.count({ where: { isActive: true, company: { status: 'ACTIVE' }, lastLogin: { gte: week } } }),
      prisma.company.count({ where: { createdAt: { gte: month } } }),
      prisma.feedbackRequest.count({ where: { status: { not: 'DONE' } } }),
      prisma.teamInvite.count({ where: { isAccepted: false, expiresAt: { lt: new Date() }, company: { status: 'ACTIVE' } } }),
      prisma.auditEvent.count({ where: { outcome: 'FAILED', createdAt: { gte: day } } }),
      prisma.company.count({ where: { status: 'ACTIVE', users: { none: { isActive: true, role: 'ADMIN' } } } }),
      prisma.company.count({ where: { status: 'ACTIVE', createdAt: { lt: month }, users: { none: { lastLogin: { gte: month } } } } }),
      prisma.feedbackRequest.count({ where: { status: { not: 'DONE' }, createdAt: { lt: week }, messages: { none: { fromTeam: true } } } }),
      prisma.auditEvent.findMany({ where: { outcome: { in: ['SUCCEEDED', 'FAILED'] } }, orderBy: [{ createdAt: 'desc' }, { id: 'desc' }], take: 10 }),
      prisma.$queryRaw<{ count: bigint }[]>(Prisma.sql`SELECT COUNT(*) AS count FROM "AuditEvent" a WHERE a.outcome='STARTED' AND a."createdAt" < (NOW() AT TIME ZONE 'UTC') - INTERVAL '5 minutes' AND NOT EXISTS (SELECT 1 FROM "AuditEvent" b WHERE b."requestId"=a."requestId" AND b.outcome IN ('SUCCEEDED','FAILED'))`),
    ])
    return NextResponse.json({ companies, activeCompanies, suspendedCompanies: companies - activeCompanies, activeUsers, newCompanies, openFeedback, attention: { expiredInvites, failedActions, missingAdmin, inactive, unanswered, incomplete: Number(incomplete[0].count) }, recent, asOf: new Date() }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
