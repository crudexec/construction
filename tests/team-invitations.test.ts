import assert from 'node:assert/strict'
import { before, test, type TestContext } from 'node:test'
import { NextRequest } from 'next/server'

// Explicitly isolate tests from every configured database and email provider.
process.env.DATABASE_URL = 'postgresql://test:test@127.0.0.1:1/test'
process.env.JWT_SECRET = 'team-invitation-test-secret'
process.env.NEXT_PUBLIC_APP_URL = 'https://example.test'
let prisma: typeof import('../src/lib/prisma').prisma
let handlers: typeof import('../src/app/api/team/invite/route')
let token: string
const admin = { id: 'admin', email: 'admin@example.test', firstName: 'Team', lastName: 'Admin', role: 'ADMIN', isActive: true, companyId: 'company-a' }
const invite = { id: 'invite', email: 'new@example.test', firstName: 'New', lastName: 'Member', role: 'STAFF', token: 'original-token', companyId: 'company-a', invitedById: 'admin', isAccepted: false, createdAt: new Date(), expiresAt: new Date(Date.now() + 86400000) }
before(async () => {
  const unexpected = async () => { throw new Error('Unexpected database operation') }
  Object.assign(globalThis, { prisma: {
    user: { findUnique: unexpected, findFirst: unexpected, findMany: unexpected, update: unexpected },
    teamInvite: { findFirst: unexpected, findMany: unexpected, create: unexpected, update: unexpected },
    card: { findFirst: unexpected },
    company: { findUnique: unexpected },
    emailConfig: { findUnique: unexpected }
  } })
  ;({ prisma } = await import('../src/lib/prisma'))
  handlers = await import('../src/app/api/team/invite/route')
  const { generateToken } = await import('../src/lib/auth')
  token = generateToken({ ...admin, userId: admin.id, role: 'ADMIN' })
})
function request(method = 'POST', body = { email: invite.email, firstName: 'New', lastName: 'Member', role: 'STAFF' }) {
  return new NextRequest('https://example.test/api/team/invite', {
    method, headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    ...(method === 'POST' ? { body: JSON.stringify(body) } : {})
  })
}
function setup(t: TestContext) {
  t.mock.method(prisma.user, 'findUnique', async () => admin)
  t.mock.method(prisma.user, 'findFirst', async () => null)
  t.mock.method(prisma.teamInvite, 'findFirst', async () => null)
  t.mock.method(prisma.teamInvite, 'create', async ({ data }: { data: object }) => ({ ...invite, ...data }))
  t.mock.method(prisma.card, 'findFirst', async () => null)
  t.mock.method(prisma.company, 'findUnique', async () => ({ appName: 'Test Company' }))
  t.mock.method(prisma.emailConfig, 'findUnique', async () => null)
  t.mock.method(globalThis, 'fetch', async () => { throw new Error('Unexpected external request') })
}

test('requires an administrator to list or send invitations', async t => {
  setup(t)
  t.mock.method(prisma.user, 'findUnique', async () => ({ ...admin, role: 'STAFF' }))
  assert.equal((await handlers.GET(request('GET'))).status, 401)
  assert.equal((await handlers.POST(request())).status, 401)
  assert.equal((await handlers.GET(new NextRequest('https://example.test/api/team/invite'))).status, 401)
})

test('lists only this company’s invitations, excluding members and duplicate invitations', async t => {
  setup(t)
  t.mock.method(prisma.teamInvite, 'findMany', async (args: { where: object; select: Record<string, boolean> }) => {
    assert.deepEqual(args.where, { companyId: 'company-a', isAccepted: false })
    assert.equal(args.select.token, undefined)
    return [invite, { ...invite, id: 'old' }, { ...invite, id: 'joined', email: 'joined@example.test' }]
  })
  t.mock.method(prisma.user, 'findMany', async (args: { where: object }) => {
    assert.deepEqual(args.where, { companyId: 'company-a', isActive: true })
    return [{ email: 'Joined@example.test' }]
  })
  const result = await handlers.GET(request('GET'))
  assert.equal(result.status, 200)
  assert.deepEqual((await result.json()).map((i: { id: string }) => i.id), ['invite'])
})

test('normalizes email and preserves the invitation when email is not configured', async t => {
  setup(t)
  t.mock.method(prisma.user, 'findFirst', async (args: { where: object }) => {
    assert.deepEqual(args.where, { email: { equals: invite.email, mode: 'insensitive' } })
    return null
  })
  const result = await handlers.POST(request('POST', { email: ' NEW@EXAMPLE.TEST ', firstName: 'New', lastName: 'Member', role: 'STAFF' }))
  const body = await result.json()
  assert.equal(result.status, 200)
  assert.equal(body.invite.email, invite.email)
  assert.equal(body.emailSent, false)
  assert.match(body.inviteUrl, /^https:\/\/example.test\/invite\//)
})

test('rejects cross-company accounts without moving them or sending email', async t => {
  setup(t)
  t.mock.method(prisma.user, 'findFirst', async () => ({ ...admin, companyId: 'company-b' }))
  t.mock.method(prisma.user, 'update', async () => { assert.fail('Must not move an existing account') })
  const result = await handlers.POST(request())
  assert.equal(result.status, 409)
  assert.equal((await result.json()).code, 'ACCOUNT_COMPANY_CONFLICT')
})

test('renews an expired invitation in place and invalidates its old token', async t => {
  setup(t)
  t.mock.method(prisma.teamInvite, 'findFirst', async () => ({ ...invite, expiresAt: new Date(0) }))
  t.mock.method(prisma.teamInvite, 'create', async () => { assert.fail('Must not create duplicate invitation') })
  t.mock.method(prisma.teamInvite, 'update', async ({ where, data }: { where: object; data: { token: string; expiresAt: Date } }) => {
    assert.deepEqual(where, { id: invite.id })
    assert.notEqual(data.token, invite.token)
    assert.ok(data.expiresAt.getTime() > Date.now() + 6 * 86400000)
    return { ...invite, ...data }
  })
  const body = await (await handlers.POST(request())).json()
  assert.equal(body.renewed, true)
  assert.equal(body.resent, true)
  assert.equal(body.invite.id, invite.id)
})

test('resending a valid invitation preserves its token and reports provider failure', async t => {
  setup(t)
  t.mock.method(prisma.teamInvite, 'findFirst', async () => invite)
  t.mock.method(prisma.teamInvite, 'update', async () => { assert.fail('Valid invitations should keep their links') })
  t.mock.method(prisma.emailConfig, 'findUnique', async () => ({ provider: 'RESEND', isActive: true, apiKey: 'fake-test-key', fromEmail: 'test@example.test' }))
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ message: 'Rejected by provider' }), { status: 403 }))
  const body = await (await handlers.POST(request())).json()
  assert.equal(body.renewed, false)
  assert.equal(body.invite.token, invite.token)
  assert.equal(body.emailSent, false)
})

test('reports successful email submission separately from invitation creation', async t => {
  setup(t)
  t.mock.method(prisma.emailConfig, 'findUnique', async () => ({ provider: 'RESEND', isActive: true, apiKey: 'fake-test-key', fromEmail: 'test@example.test' }))
  t.mock.method(globalThis, 'fetch', async () => new Response(JSON.stringify({ id: 'email-id' }), { status: 200 }))
  const body = await (await handlers.POST(request())).json()
  assert.equal(body.emailSent, true)
  assert.equal(body.resent, false)
})
