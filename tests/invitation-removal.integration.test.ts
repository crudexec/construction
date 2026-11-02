import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { after, before, test } from 'node:test'
import { NextRequest } from 'next/server'

if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to a disposable test database')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.JWT_SECRET = 'invitation-removal-test-secret'
let prisma: typeof import('../src/lib/prisma').prisma
let adminApi: typeof import('../src/app/api/team/invite/route')
let publicApi: typeof import('../src/app/api/invite/[token]/route')
let companyId: string
let otherCompanyId: string
let adminId: string
let adminToken: string
let staffToken: string

before(async () => {
  ;({ prisma } = await import('../src/lib/prisma'))
  adminApi = await import('../src/app/api/team/invite/route')
  publicApi = await import('../src/app/api/invite/[token]/route')
  const { generateToken } = await import('../src/lib/auth')
  companyId = (await prisma.company.create({ data: { name: 'Invitation removal test' } })).id
  otherCompanyId = (await prisma.company.create({ data: { name: 'Other company' } })).id
  for (const role of ['ADMIN', 'STAFF'] as const) {
    const user = await prisma.user.create({ data: {
      companyId, email: `${role}-${companyId}@example.test`, firstName: 'Test', lastName: role, role, password: 'unused',
    } })
    const token = generateToken({ userId: user.id, email: user.email, companyId, role })
    if (role === 'ADMIN') { adminId = user.id; adminToken = token }
    else staffToken = token
  }
})

after(async () => {
  try {
    const ids = [companyId, otherCompanyId].filter(Boolean)
    await prisma.teamInvite.deleteMany({ where: { companyId: { in: ids } } })
    await prisma.company.deleteMany({ where: { id: { in: ids } } })
  } finally {
    await prisma?.$disconnect()
  }
})

async function createInvite(overrides: { email?: string; companyId?: string; isAccepted?: boolean; expiresAt?: Date } = {}) {
  return prisma.teamInvite.create({ data: {
    email: `${randomUUID()}@example.test`, firstName: 'New', lastName: 'Member', token: randomUUID(),
    companyId, invitedById: adminId, expiresAt: new Date(Date.now() + 86400000), ...overrides,
  } })
}
function remove(id: string, token = adminToken) {
  return adminApi.DELETE(new NextRequest(`https://example.test/api/team/invite?id=${encodeURIComponent(id)}`, {
    method: 'DELETE', headers: token ? { authorization: `Bearer ${token}` } : {},
  }))
}
function accept(token: string) {
  return publicApi.POST(new NextRequest(`https://example.test/api/invite/${token}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: 'test-password-123' }),
  }), { params: Promise.resolve({ token }) })
}

test('only administrators can remove invitations', async () => {
  const invite = await createInvite()
  assert.equal((await remove(invite.id, '')).status, 401)
  assert.equal((await remove(invite.id, staffToken)).status, 403)
  assert.ok(await prisma.teamInvite.findUnique({ where: { id: invite.id } }))
  assert.equal((await remove('')).status, 400)
})

test('removes pending duplicates and invalidates every old link without changing users', async () => {
  const invite = await createInvite()
  const duplicate = await createInvite({ email: invite.email.toUpperCase() })
  const foreign = await createInvite({ email: invite.email, companyId: otherCompanyId })
  const accepted = await createInvite({ email: invite.email, isAccepted: true })
  const usersBefore = await prisma.user.count()
  assert.equal((await remove(invite.id)).status, 200)
  assert.equal(await prisma.teamInvite.count({ where: { id: { in: [invite.id, duplicate.id] } } }), 0)
  assert.equal(await prisma.teamInvite.count({ where: { id: { in: [foreign.id, accepted.id] } } }), 2)
  for (const token of [invite.token, duplicate.token]) {
    assert.equal((await publicApi.GET(new NextRequest(`https://example.test/api/invite/${token}`), { params: Promise.resolve({ token }) })).status, 404)
    assert.equal((await accept(token)).status, 404)
  }
  assert.equal(await prisma.user.count(), usersBefore)
  assert.equal((await remove(invite.id)).status, 404)
})

test('allows expired invitations to be removed, while protecting accepted and foreign invitations', async () => {
  const expired = await createInvite({ expiresAt: new Date(0) })
  const accepted = await createInvite({ isAccepted: true })
  const foreign = await createInvite({ companyId: otherCompanyId })
  assert.equal((await remove(expired.id)).status, 200)
  assert.equal((await remove(accepted.id)).status, 404)
  assert.equal((await remove(foreign.id)).status, 404)
  assert.equal((await remove('missing')).status, 404)
  assert.equal(await prisma.teamInvite.count({ where: { id: { in: [accepted.id, foreign.id] } } }), 2)
})

test('accepting an invitation and removing it cannot both succeed', async () => {
  const invite = await createInvite()
  const [accepted, removed] = await Promise.all([accept(invite.token), remove(invite.id)])
  assert.deepEqual([accepted.status, removed.status].sort(), [200, 404])
  assert.equal(await prisma.user.count({ where: { email: invite.email } }), accepted.status === 200 ? 1 : 0)
})

test('a valid invitation still creates one account and cannot be removed after acceptance', async () => {
  const invite = await createInvite()
  assert.equal((await accept(invite.token)).status, 200)
  assert.equal((await remove(invite.id)).status, 404)
  assert.equal((await accept(invite.token)).status, 404)
  assert.equal(await prisma.user.count({ where: { email: invite.email } }), 1)
  assert.equal((await prisma.teamInvite.findUniqueOrThrow({ where: { id: invite.id } })).isAccepted, true)
})
