import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { randomUUID } from 'node:crypto'
import { NextRequest } from 'next/server'
import type { PrismaClient } from '@prisma/client'

const url = process.env.TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use an explicit disposable local TEST_DATABASE_URL')
process.env.DATABASE_URL = url
process.env.JWT_SECRET = 'feedback-tests'
let prisma: PrismaClient
let collection: typeof import('../src/app/api/feedback/route')
let detail: typeof import('../src/app/api/feedback/[id]/route')
let permissions: typeof import('../src/app/api/feedback/access/route')
const companies: string[] = [], actors: Record<string, { id: string; token: string; companyId: string }> = {}
const context = (id: string) => ({ params: Promise.resolve({ id }) })
const request = (actor: string | null, path = '', input?: unknown, method = 'POST', origin = 'https://buildflo.test') => new NextRequest(`https://buildflo.test/api/feedback${path}`, { headers: { ...(actor ? { authorization: `Bearer ${actors[actor].token}` } : {}), origin, 'content-type': 'application/json' }, ...(input ? { method, body: JSON.stringify(input) } : {}) })
before(async () => {
  ;({ prisma } = await import('../src/lib/prisma'))
  collection = await import('../src/app/api/feedback/route'); detail = await import('../src/app/api/feedback/[id]/route'); permissions = await import('../src/app/api/feedback/access/route')
  const { generateToken } = await import('../src/lib/auth')
  for (let i = 0; i < 2; i++) companies.push((await prisma.company.create({ data: { name: `Feedback test ${i}` } })).id)
  for (const [key, role, company] of [['staff', 'STAFF', 0], ['peer', 'STAFF', 0], ['admin', 'ADMIN', 0], ['foreign', 'ADMIN', 1], ['operator', 'STAFF', 1]] as const) {
    const u = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: key, lastName: 'Tester', companyId: companies[company], role, password: 'unused' } })
    actors[key] = { id: u.id, companyId: u.companyId, token: generateToken({ userId: u.id, email: u.email, role: u.role, companyId: u.companyId }) }
  }
  await prisma.feedbackManager.create({ data: { userId: actors.operator.id } })
})
after(async () => { for (const id of companies) await prisma.company.delete({ where: { id } }); await prisma?.$disconnect() })
async function create(actor = 'staff', extra = {}) {
  const input = { title: 'Asset search needs improvement', body: 'Please let me find equipment by serial number.', pagePath: '/dashboard/assets', clientId: randomUUID(), ...extra }
  const r = await collection.POST(request(actor, '', input)); assert.equal(r.status, 201, await r.clone().text()); return { id: (await r.json()).id as string, input }
}

test('new feedback automatically becomes a To do request; retries create one card and message', async () => {
  const { id, input } = await create()
  const retried = await collection.POST(request('staff', '', input)); assert.equal((await retried.json()).id, id)
  const row = await prisma.feedbackRequest.findUniqueOrThrow({ where: { id }, include: { messages: true } })
  assert.equal(row.status, 'TODO'); assert.equal(row.companyId, actors.staff.companyId); assert.equal(row.messages.length, 1)
  assert.equal((await collection.POST(request('staff', '', { ...input, title: 'Different title' }))).status, 409)
})
test('authentication, per-user privacy and company boundaries apply to reads and writes', async () => {
  const { id } = await create()
  assert.equal((await collection.GET(request(null))).status, 401)
  assert.equal((await collection.GET(request('staff', '?view=board'))).status, 403)
  for (const other of ['peer', 'foreign']) {
    assert.equal((await detail.GET(request(other, `/${id}`), context(id))).status, 404)
    assert.equal((await detail.POST(request(other, `/${id}`, { body: 'Should fail', clientId: randomUUID() }), context(id))).status, 404)
  }
  const mine = await (await collection.GET(request('peer'))).json(); assert.equal(mine.total, 0)
  assert.equal((await detail.GET(request('admin', `/${id}`), context(id))).status, 200)
  assert.equal((await detail.GET(request('operator', `/${id}`), context(id))).status, 200)
})
test('replies persist, are idempotent under concurrency and have server-controlled attribution', async () => {
  const { id } = await create(), input = { body: 'We are investigating this.', clientId: randomUUID(), authorId: actors.foreign.id, fromTeam: false }
  const replies = await Promise.all([1, 2].map(() => detail.POST(request('admin', `/${id}`, input), context(id))))
  assert.ok(replies.every(r => r.status === 201))
  const messages = await prisma.feedbackMessage.findMany({ where: { requestId: id } }); assert.equal(messages.length, 2)
  const reply = messages.find(m => m.authorId === actors.admin.id)!; assert.equal(reply.fromTeam, true); assert.equal(reply.body, input.body)
  assert.equal((await detail.POST(request('admin', `/${id}`, { ...input, body: 'Changed' }), context(id))).status, 409)
})
test('status changes require management access and reject stale versions; history is visible to submitter', async () => {
  const { id } = await create()
  const move = { status: 'IN_PROGRESS', version: 0 }
  assert.equal((await detail.PATCH(request('staff', `/${id}`, move, 'PATCH'), context(id))).status, 403)
  assert.equal((await detail.PATCH(request('foreign', `/${id}`, move, 'PATCH'), context(id))).status, 404)
  assert.equal((await detail.PATCH(request('admin', `/${id}`, move, 'PATCH'), context(id))).status, 200)
  assert.equal((await detail.PATCH(request('admin', `/${id}`, { status: 'DONE', version: 0 }, 'PATCH'), context(id))).status, 409)
  assert.equal((await detail.PATCH(request('admin', `/${id}`, { status: 'DONE', version: 1 }, 'PATCH'), context(id))).status, 200)
  const response = await detail.GET(request('staff', `/${id}`), context(id)); assert.match(response.headers.get('cache-control')!, /no-store/)
  const result = await response.json(); assert.equal(result.request.status, 'DONE'); assert.equal(result.messages.filter((m: { kind: string }) => m.kind === 'STATUS').length, 2)
  assert.ok(!JSON.stringify(result).includes('password'))
})
test('validation rejects oversized content, unsafe page URLs, foreign origins and invalid states', async () => {
  const input = { title: 'Hello', body: 'Details', clientId: randomUUID(), pagePath: '/dashboard/assets' }
  for (const extra of [{ title: ' ' }, { body: 'x'.repeat(4001) }, { pagePath: '//evil.test' }, { pagePath: '/dashboard/assets?token=private' }, { clientId: 'short' }]) assert.equal((await collection.POST(request('staff', '', { ...input, ...extra }))).status, 400)
  assert.equal((await collection.POST(request('staff', '', input, 'POST', 'https://other.test'))).status, 403)
  assert.equal((await collection.POST(request('staff', '', { ...input, body: 'x'.repeat(25000) }))).status, 413)
  const { id } = await create(); assert.equal((await detail.PATCH(request('admin', `/${id}`, { status: 'UNKNOWN', version: 0 }, 'PATCH'), context(id))).status, 400)
})
test('board and conversations paginate without exposing other companies or losing earlier messages', async () => {
  const { id } = await create()
  await prisma.feedbackRequest.createMany({ data: Array.from({ length: 28 }, (_, i) => ({ companyId: companies[0], createdById: actors.staff.id, createdByName: 'staff Tester', clientId: randomUUID(), title: `Pagination sample ${i}` })) })
  const first = await (await collection.GET(request('admin', '?view=board&status=TODO&search=Pagination'))).json(); assert.equal(first.items.length, 25); assert.equal(first.total, 28)
  const next = await (await collection.GET(request('admin', `?view=board&status=TODO&search=Pagination&cursor=${first.nextCursor}`))).json(); assert.equal(next.items.length, 3); assert.equal(new Set([...first.items, ...next.items].map((x: { id: string }) => x.id)).size, 28)
  assert.equal((await (await collection.GET(request('foreign', '?view=board&search=Pagination'))).json()).total, 0)
  await prisma.feedbackMessage.createMany({ data: Array.from({ length: 54 }, (_, i) => ({ requestId: id, authorId: actors.staff.id, authorName: 'staff Tester', clientId: randomUUID(), body: `Message ${i}` })) })
  const latest = await (await detail.GET(request('staff', `/${id}`), context(id))).json(); assert.equal(latest.messages.length, 50)
  const older = await (await detail.GET(request('staff', `/${id}?before=${latest.nextCursor}`), context(id))).json(); assert.equal(older.messages.length, 5)
  assert.equal(new Set([...latest.messages, ...older.messages].map((m: { id: string }) => m.id)).size, 55)
})
test('disabled users and revoked platform-manager access lose access immediately', async () => {
  const { id } = await create()
  await prisma.feedbackManager.delete({ where: { userId: actors.operator.id } })
  assert.equal((await detail.GET(request('operator', `/${id}`), context(id))).status, 404)
  const permission = await (await permissions.GET(request('operator'))).json(); assert.equal(permission.canManage, false)
  await prisma.user.update({ where: { id: actors.peer.id }, data: { isActive: false } })
  assert.equal((await collection.GET(request('peer'))).status, 401)
})
