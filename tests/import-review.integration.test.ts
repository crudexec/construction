import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { randomBytes } from 'node:crypto'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'

const url = process.env.TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('TEST_DATABASE_URL must be a disposable local database')
process.env.DATABASE_URL = url
process.env.JWT_SECRET = 'import-review-test-secret'
let prisma: PrismaClient
let routes: typeof import('../src/app/api/shared/import-review/[token]/route')
let adminRoutes: typeof import('../src/app/api/asset-import-reviews/[id]/route')
let helpers: typeof import('../src/lib/import-review/server')
let companyId: string
let otherCompanyId: string
let adminToken: string
let staffToken: string
let foreignToken: string
const fields = [
  { key: 'assetId', label: 'Asset', type: 'select', choiceKey: 'assets', initial: '', required: true },
  { key: 'startedAt', label: 'Start date', type: 'datetime-local', initial: '', required: true },
  { key: 'endedAt', label: 'End date', type: 'datetime-local', initial: '' },
  { key: 'cost', label: 'Cost', type: 'number', initial: '', required: true },
  { key: 'confirm', label: 'Confirmation', type: 'checkbox', initial: 'false', required: true },
]
const values = { assetId: 'asset-choice', startedAt: '2026-10-12T08:00', endedAt: '', cost: '0', confirm: 'true' }
before(async () => {
  ;({ prisma } = await import('../src/lib/prisma'))
  routes = await import('../src/app/api/shared/import-review/[token]/route')
  adminRoutes = await import('../src/app/api/asset-import-reviews/[id]/route')
  helpers = await import('../src/lib/import-review/server')
  const { generateToken } = await import('../src/lib/auth')
  companyId = (await prisma.company.create({ data: { name: 'Review tests' } })).id
  otherCompanyId = (await prisma.company.create({ data: { name: 'Unrelated review tests' } })).id
  for (const [company, role, assign] of [[companyId, 'ADMIN', (token: string) => { adminToken = token }], [companyId, 'STAFF', (token: string) => { staffToken = token }], [otherCompanyId, 'ADMIN', (token: string) => { foreignToken = token }]] as const) {
    const user = await prisma.user.create({ data: { companyId: company, role, email: `${randomBytes(8).toString('hex')}@example.test`, firstName: 'Test', lastName: 'Reviewer', password: 'unused' } })
    assign(generateToken({ userId: user.id, email: user.email, role, companyId: company }))
  }
  await prisma.asset.create({ data: { companyId, name: 'Must stay unchanged', equipmentId: 'STABLE', type: 'TOOL' } })
})
after(async () => { for (const id of [companyId, otherCompanyId].filter(Boolean)) await prisma.company.delete({ where: { id } }); await prisma?.$disconnect() })
async function fixture(options: { expired?: boolean; revoked?: boolean; rows?: number } = {}) {
  const { token, tokenHash } = helpers.newReviewToken()
  const review = await prisma.assetImportReview.create({ data: {
    companyId, title: 'Asset import review', sourceDigest: randomBytes(16).toString('hex'), tokenHash,
    expiresAt: new Date(Date.now() + (options.expired ? -1000 : 86400000)), revokedAt: options.revoked ? new Date() : null,
    choices: { assets: [{ value: 'asset-choice', label: 'Asset One' }] },
    rows: { create: Array.from({ length: options.rows ?? 1 }, (_, index) => ({ position: index, sourceFile: 'vehicle_assignments', sourceRow: index + 2, sourceId: String(index), title: `Row ${index + 1}`, kind: 'assignment', reason: 'Confirm assignment', fields, context: [{ label: 'Source asset', value: 'Asset One' }], source: { secretInternalMetadata: 'must-not-leak' } })) },
  }, include: { rows: { orderBy: { position: 'asc' } } } })
  return { token, review }
}
const context = (token: string) => ({ params: Promise.resolve({ token }) })
function request(token: string, body?: unknown, origin = 'https://example.test') {
  return new NextRequest(`https://example.test/api/shared/import-review/${token}`, { ...(body ? { method: 'POST', body: JSON.stringify(body), headers: { 'Content-Type': 'application/json', ...(origin ? { Origin: origin } : {}) } } : {}) })
}
function saveBody(id: string, overrides = {}) { return { action: 'save', rowId: id, revision: 0, decision: 'resolve', values, notes: '', reviewer: 'Brian', ...overrides } }
async function save(token: string, body: unknown) { return routes.POST(request(token, body), context(token)) }
function adminRequest(id: string, token: string, action?: string) {
  return new NextRequest(`https://example.test/api/asset-import-reviews/${id}`, { headers: { Authorization: `Bearer ${token}`, Origin: 'https://example.test', 'Content-Type': 'application/json' }, ...(action ? { method: 'POST', body: JSON.stringify({ action }) } : {}) })
}

test('capability reads expose curated fields only and are never cacheable', async () => {
  const { token, review } = await fixture()
  const response = await routes.GET(request(token), context(token))
  assert.equal(response.status, 200)
  assert.match(response.headers.get('cache-control')!, /no-store/)
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer')
  const body = await response.text()
  assert.ok(!body.includes('must-not-leak') && !body.includes(review.tokenHash) && !body.includes(token))
  assert.ok(body.includes('Asset One'))
})
test('invalid, expired and revoked links cannot read or save', async () => {
  for (const options of [{ expired: true }, { revoked: true }]) {
    const { token, review } = await fixture(options)
    assert.equal((await routes.GET(request(token), context(token))).status, 404)
    assert.equal((await save(token, saveBody(review.rows[0].id))).status, 404)
  }
  assert.equal((await routes.GET(request('bad-token'), context('bad-token'))).status, 404)
})
test('rejects cross-origin requests, oversized payloads and rows outside the link', async () => {
  const first = await fixture(), second = await fixture()
  for (const origin of ['https://attacker.example', '']) assert.equal((await routes.POST(request(first.token, saveBody(first.review.rows[0].id), origin), context(first.token))).status, 403)
  assert.equal((await save(first.token, saveBody(second.review.rows[0].id))).status, 404)
  assert.equal((await save(first.token, saveBody(first.review.rows[0].id, { notes: 'x'.repeat(40000) }))).status, 413)
})
test('validates typed corrections and choice membership without writing assets', async () => {
  const { token, review } = await fixture()
  for (const invalid of [
    { ...values, assetId: 'foreign-asset' }, { ...values, cost: '-1' }, { ...values, confirm: 'false' },
    { ...values, startedAt: '2026-02-30T12:00' }, { ...values, startedAt: '2026-03-08T02:30' },
    { ...values, endedAt: '2026-10-11T12:00' }, { ...values, companyId: otherCompanyId },
  ]) assert.equal((await save(token, saveBody(review.rows[0].id, { values: invalid }))).status, 400)
  assert.equal((await save(token, saveBody(review.rows[0].id, { decision: 'exclude' }))).status, 400)
  assert.equal((await save(token, saveBody(review.rows[0].id))).status, 200)
  const assets = await prisma.asset.findMany({ where: { companyId } })
  assert.equal(assets.length, 1); assert.equal(assets[0].name, 'Must stay unchanged')
})
test('simultaneous saves reject the stale revision and retain an audit history', async () => {
  const { token, review } = await fixture()
  const responses = await Promise.all([save(token, saveBody(review.rows[0].id)), save(token, saveBody(review.rows[0].id))])
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409])
  assert.equal(await prisma.assetImportReviewEvent.count({ where: { reviewId: review.id, action: 'SAVE' } }), 1)
  const event = await prisma.assetImportReviewEvent.findFirstOrThrow({ where: { reviewId: review.id } })
  assert.equal(event.actor, 'Brian')
})
test('requires all rows before submission, preserves questions and locks submitted answers', async () => {
  const { token, review } = await fixture({ rows: 2 })
  const submit = (revision: number) => save(token, { action: 'submit', revision, reviewer: 'Brian' })
  assert.equal((await submit(0)).status, 400)
  assert.equal((await save(token, saveBody(review.rows[0].id))).status, 200)
  assert.equal((await save(token, saveBody(review.rows[1].id, { decision: 'question', notes: 'Which asset is this?' }))).status, 200)
  assert.equal((await submit(1)).status, 409)
  assert.equal((await submit(2)).status, 200)
  assert.equal((await save(token, saveBody(review.rows[0].id, { revision: 1 }))).status, 409)
  const body = await (await routes.GET(request(token), context(token))).json()
  assert.ok(body.submittedAt); assert.equal(body.rows[1].decision, 'question')
})
test('admin operations are company-scoped; renewal invalidates the old link', async () => {
  const { token, review } = await fixture()
  const ctx = { params: Promise.resolve({ id: review.id }) }
  assert.equal((await adminRoutes.GET(adminRequest(review.id, staffToken), ctx)).status, 403)
  assert.equal((await adminRoutes.GET(adminRequest(review.id, foreignToken), ctx)).status, 404)
  assert.equal((await adminRoutes.POST(adminRequest(review.id, foreignToken, 'revoke'), ctx)).status, 404)
  const renewed = await adminRoutes.POST(adminRequest(review.id, adminToken, 'renew'), ctx)
  assert.equal(renewed.status, 200)
  const nextToken = (await renewed.json()).link.split('/').at(-1)
  assert.notEqual(nextToken, token)
  assert.equal((await routes.GET(request(token), context(token))).status, 404)
  assert.equal((await routes.GET(request(nextToken), context(nextToken))).status, 200)
  assert.equal((await adminRoutes.POST(adminRequest(review.id, adminToken, 'revoke'), ctx)).status, 200)
  assert.equal((await routes.GET(request(nextToken), context(nextToken))).status, 404)
})
test('submission and save serialize on the review so no correction is silently lost', async () => {
  const { token, review } = await fixture()
  await save(token, saveBody(review.rows[0].id))
  const responses = await Promise.all([
    save(token, saveBody(review.rows[0].id, { revision: 1, notes: 'Last correction' })),
    save(token, { action: 'submit', revision: 1, reviewer: 'Brian' }),
  ])
  assert.deepEqual(responses.map(response => response.status).sort(), [200, 409])
})

test('accepts the public origin behind the deployment proxy and supports admin reopening', async () => {
  const { token, review } = await fixture()
  const proxied = new NextRequest(`http://internal:3000/api/shared/import-review/${token}`, { method: 'POST', headers: { Origin: 'https://example.test', 'X-Forwarded-Host': 'example.test', 'X-Forwarded-Proto': 'https', 'Content-Type': 'application/json' }, body: JSON.stringify(saveBody(review.rows[0].id)) })
  assert.equal((await routes.POST(proxied, context(token))).status, 200)
  await save(token, { action: 'submit', revision: 1, reviewer: 'Brian' })
  assert.equal((await adminRoutes.POST(adminRequest(review.id, adminToken, 'reopen'), { params: Promise.resolve({ id: review.id }) })).status, 200)
  assert.equal((await save(token, saveBody(review.rows[0].id, { revision: 1, notes: 'Corrected after reopening' }))).status, 200)
})
