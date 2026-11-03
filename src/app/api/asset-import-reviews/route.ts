import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { failure, privateHeaders, requireAdmin } from '@/lib/import-review/server'

export async function GET(request: NextRequest) {
  try {
    const user = await requireAdmin(request)
    const reviews = await prisma.assetImportReview.findMany({
      where: { companyId: user.companyId }, orderBy: { createdAt: 'desc' }, take: 50,
      select: { id: true, title: true, expiresAt: true, revokedAt: true, submittedAt: true, submittedBy: true, createdAt: true, rows: { select: { decision: true } } },
    })
    return NextResponse.json(reviews.map(({ rows, ...review }) => ({ ...review, total: rows.length, reviewed: rows.filter(row => row.decision).length, questions: rows.filter(row => row.decision === 'question').length })), { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
