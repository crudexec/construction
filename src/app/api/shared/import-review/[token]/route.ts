import { auditedRoute } from '@/lib/platform/route-audit'
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { failure, findReview, privateHeaders, publicRowSelect, readBody, ReviewError, validateAnswer } from '@/lib/import-review/server'
import type { ReviewField, ReviewOption } from '@/lib/import-review/types'

type Context = { params: Promise<{ token: string }> }
 async function GETHandler(_request: NextRequest, { params }: Context) {
  try {
    const review = await findReview((await params).token)
    const [company, rows] = await Promise.all([
      prisma.company.findUniqueOrThrow({ where: { id: review.companyId }, select: { name: true } }),
      prisma.assetImportReviewRow.findMany({ where: { reviewId: review.id }, orderBy: { position: 'asc' }, select: publicRowSelect }),
    ])
    return NextResponse.json({ id: review.id, title: review.title, companyName: company.name, expiresAt: review.expiresAt, submittedAt: review.submittedAt, submittedBy: review.submittedBy, revision: review.revision, choices: review.choices, rows }, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}
 async function POSTHandler(request: NextRequest, { params }: Context) {
  try {
    const token = (await params).token
    const body = await readBody(request)
    const result = await prisma.$transaction(async tx => {
      const review = await findReview(token, tx, true)
      if (review.submittedAt) throw new ReviewError('This review has already been submitted. Ask your administrator to reopen it.', 409)
      if (body.action === 'save') {
        if (typeof body.rowId !== 'string' || !Number.isSafeInteger(body.revision)) throw new ReviewError('Invalid row or revision.')
        const row = await tx.assetImportReviewRow.findFirst({ where: { id: body.rowId, reviewId: review.id } })
        if (!row) throw new ReviewError('Review row not found.', 404)
        if (row.revision !== body.revision) throw new ReviewError('Someone else changed this row. Reload the review before saving.', 409)
        const answer = validateAnswer(body, row.fields as unknown as ReviewField[], review.choices as unknown as Record<string, ReviewOption[]>)
        const updated = await tx.assetImportReviewRow.update({ where: { id: row.id }, data: { ...answer, revision: { increment: 1 } }, select: publicRowSelect })
        await tx.assetImportReviewEvent.create({ data: { reviewId: review.id, rowId: row.id, action: 'SAVE', actor: answer.reviewer, payload: { previous: { decision: row.decision, values: row.values, notes: row.notes, revision: row.revision }, answer } } })
        const batch = await tx.assetImportReview.update({ where: { id: review.id }, data: { revision: { increment: 1 } } })
        return { row: updated, revision: batch.revision }
      }
      if (body.action === 'submit') {
        if (body.revision !== review.revision) throw new ReviewError('The review changed in another window. Reload it before submitting.', 409)
        if (typeof body.reviewer !== 'string' || !body.reviewer.trim() || body.reviewer.length > 100) throw new ReviewError('Enter your name before submitting.')
        const remaining = await tx.assetImportReviewRow.count({ where: { reviewId: review.id, decision: null } })
        if (remaining) throw new ReviewError(`Review the remaining ${remaining} row${remaining === 1 ? '' : 's'} before submitting.`)
        const submittedAt = new Date()
        await tx.assetImportReview.update({ where: { id: review.id }, data: { submittedAt, submittedBy: body.reviewer.trim(), revision: { increment: 1 } } })
        await tx.assetImportReviewEvent.create({ data: { reviewId: review.id, action: 'SUBMIT', actor: body.reviewer.trim(), payload: { revision: review.revision } } })
        return { submittedAt, submittedBy: body.reviewer.trim(), revision: review.revision + 1 }
      }
      throw new ReviewError('Unknown review action.')
    })
    return NextResponse.json(result, { headers: privateHeaders })
  } catch (error) { return failure(error) }
}


export const GET = auditedRoute('/api/shared/import-review/[token]', 'GET', GETHandler)
export const POST = auditedRoute('/api/shared/import-review/[token]', 'POST', POSTHandler)
