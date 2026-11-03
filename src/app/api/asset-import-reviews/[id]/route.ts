import { NextRequest, NextResponse } from 'next/server'
import { Prisma } from '@prisma/client'
import { prisma } from '@/lib/prisma'
import { failure, newReviewToken, privateHeaders, readBody, requestOrigin, requireAdmin, ReviewError } from '@/lib/import-review/server'

type Context = { params: Promise<{ id: string }> }
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const user = await requireAdmin(request)
    const review = await prisma.assetImportReview.findFirst({ where: { id: (await params).id, companyId: user.companyId }, include: { rows: { orderBy: { position: 'asc' } }, events: { orderBy: { createdAt: 'asc' } } } })
    if (!review) throw new ReviewError('Review not found.', 404)
    const { tokenHash: _tokenHash, ...exported } = review
    return NextResponse.json(exported, { headers: { ...privateHeaders, ...(request.nextUrl.searchParams.has('download') ? { 'Content-Disposition': 'attachment; filename="asset-import-review.json"' } : {}) } })
  } catch (error) { return failure(error) }
}
export async function POST(request: NextRequest, { params }: Context) {
  try {
    const user = await requireAdmin(request)
    const body = await readBody(request)
    const id = (await params).id
    if (!['renew', 'revoke', 'reopen'].includes(String(body.action))) throw new ReviewError('Unknown review action.')
    const result = await prisma.$transaction(async tx => {
      await tx.$queryRaw(Prisma.sql`SELECT id FROM "AssetImportReview" WHERE id=${id} AND "companyId"=${user.companyId} FOR UPDATE`)
      const review = await tx.assetImportReview.findFirst({ where: { id, companyId: user.companyId } })
      if (!review) throw new ReviewError('Review not found.', 404)
      let link: string | undefined
      if (body.action === 'renew') {
        const { token, tokenHash } = newReviewToken()
        await tx.assetImportReview.update({ where: { id }, data: { tokenHash, expiresAt: new Date(Date.now() + 14 * 86400000), revokedAt: null, revision: { increment: 1 } } })
        link = `${requestOrigin(request)}/import-review/${token}`
      } else if (body.action === 'revoke') {
        await tx.assetImportReview.update({ where: { id }, data: { revokedAt: new Date(), revision: { increment: 1 } } })
      } else {
        await tx.assetImportReview.update({ where: { id }, data: { submittedAt: null, submittedBy: null, revision: { increment: 1 } } })
      }
      await tx.assetImportReviewEvent.create({ data: { reviewId: id, action: String(body.action).toUpperCase(), actor: `${user.firstName} ${user.lastName}`, payload: { userId: user.id } } })
      return { success: true, ...(link ? { link } : {}) }
    })
    return NextResponse.json(result, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
