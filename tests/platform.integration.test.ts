import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createHash, randomBytes, randomUUID } from 'node:crypto'
import { auditModules } from '../src/lib/platform/modules'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'
import { NextRequest, NextResponse } from 'next/server'
import type { PrismaClient } from '@prisma/client'

const url = process.env.TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Use a disposable local TEST_DATABASE_URL')
process.env.DATABASE_URL = url
process.env.JWT_SECRET = 'platform-integration-only'
process.env.PLATFORM_MFA_ENCRYPTION_KEY = '17'.repeat(32)
let prisma: PrismaClient
let security: typeof import('../src/app/api/platform/security/route')
let companies: typeof import('../src/app/api/platform/companies/route')
let company: typeof import('../src/app/api/platform/companies/[id]/route')
let users: typeof import('../src/app/api/platform/companies/[id]/users/route')
let events: typeof import('../src/app/api/platform/events/route')
let auth: typeof import('../src/lib/auth')
let crypt: typeof import('../src/lib/platform/crypto')
const companyIds: string[] = []
const actors: Record<string, any> = {}
const context = (id: string) => ({ params: Promise.resolve({ id }) })
function request(who: string, path: string, body?: unknown, method = 'POST', verified = true, origin = 'https://buildflo.test') {
  return new NextRequest(`https://buildflo.test/api/${path}`, { method: body ? method : 'GET', headers: { origin, 'content-type': 'application/json', cookie: `auth-token=${actors[who].token}; ${verified && actors[who].session ? `platform-session=${actors[who].session}` : ''}` }, ...(body ? { body: JSON.stringify(body) } : {}) })
}
before(async () => {
  ;({ prisma } = await import('../src/lib/prisma')); auth = await import('../src/lib/auth'); crypt = await import('../src/lib/platform/crypto')
  security = await import('../src/app/api/platform/security/route'); companies = await import('../src/app/api/platform/companies/route'); company = await import('../src/app/api/platform/companies/[id]/route'); users = await import('../src/app/api/platform/companies/[id]/users/route'); events = await import('../src/app/api/platform/events/route')
  for (const name of ['Platform test', 'Customer A test', 'Customer B test']) companyIds.push((await prisma.company.create({ data: { name } })).id)
  for (const [name, index, role] of [['owner', 0, 'ADMIN'], ['staff', 1, 'STAFF'], ['admin', 1, 'ADMIN'], ['foreign', 2, 'ADMIN'], ['feedback', 2, 'STAFF'], ['locked', 0, 'STAFF']] as const) {
    const row = await prisma.user.create({ data: { companyId: companyIds[index], email: `${randomUUID()}@example.test`, firstName: name, lastName: 'Tester', role, password: await auth.hashPassword('Local-test-password-123') } })
    actors[name] = { ...row, token: auth.generateToken({ userId: row.id, email: row.email, role, companyId: row.companyId }) }
  }
  for (const name of ['owner', 'locked']) await prisma.platformAdmin.create({ data: { userId: actors[name].id } })
  await prisma.feedbackManager.create({ data: { userId: actors.feedback.id } })
})
after(async () => {
  for (const id of companyIds.reverse()) await prisma.company.deleteMany({ where: { id } })
  await prisma.$disconnect()
})

test('TOTP matches RFC 6238 SHA-1 vectors and rejects replay; encrypted secrets authenticate ciphertext', () => {
  const secret = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'
  for (const [time, expected] of [[59, '287082'], [1111111109, '081804'], [1111111111, '050471'], [1234567890, '005924'], [2000000000, '279037'], [20000000000, '353130']] as const) {
    const counter = Math.floor(time / 30)
    assert.equal(crypt.totp(secret, counter), expected)
    assert.equal(crypt.matchingCounter(secret, expected, counter - 1, time * 1000), counter)
    assert.equal(crypt.matchingCounter(secret, expected, counter, time * 1000), null)
  }
  const encrypted = crypt.seal(secret); assert.equal(crypt.unseal(encrypted), secret); assert.ok(!encrypted.includes(secret))
  const bytes = Buffer.from(encrypted, 'base64'); bytes[15] ^= 1
  assert.throws(() => crypt.unseal(bytes.toString('base64')))
})
test('company roles and feedback grants never grant platform access; owner must complete MFA', async () => {
  for (const name of ['staff', 'admin', 'feedback']) assert.equal((await companies.GET(request(name, 'platform/companies'))).status, 403)
  assert.equal((await companies.GET(request('owner', 'platform/companies', undefined, 'GET', false))).status, 403)
  const setup = await security.POST(request('owner', 'platform/security', { action: 'setup', password: 'Local-test-password-123' }, 'POST', false))
  assert.equal(setup.status, 200, await setup.clone().text()); const data = await setup.json()
  const code = crypt.totp(data.secret, Math.floor(Date.now() / 30000))
  const verify = await security.POST(request('owner', 'platform/security', { action: 'verify', code }, 'POST', false))
  assert.equal(verify.status, 200, await verify.clone().text())
  const cookie = verify.headers.get('set-cookie')!; assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=strict/i)
  actors.owner.session = cookie.match(/platform-session=([^;]+)/)![1]
  assert.equal((await companies.GET(request('owner', 'platform/companies'))).status, 200)
  assert.equal((await security.POST(request('owner', 'platform/security', { action: 'verify', code }, 'POST', false))).status, 400)
  const stored = await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: actors.owner.id } }); assert.notEqual(stored.secret, data.secret)
})
test('MFA attempts are rate limited and cross-site writes are rejected', async () => {
  for (let i = 0; i < 5; i++) assert.equal((await security.POST(request('locked', 'platform/security', { action: 'setup', password: 'wrong' }, 'POST', false))).status, 400)
  assert.equal((await security.POST(request('locked', 'platform/security', { action: 'setup', password: 'Local-test-password-123' }, 'POST', false))).status, 429)
  assert.equal((await companies.POST(request('owner', 'platform/companies', { name: 'Cross site' }, 'POST', true, 'https://evil.test'))).status, 403)
})
test('company creation prepares a scoped administrator invitation, rejects duplicate reservations, and audits atomically', async () => {
  const input = { name: 'Created customer', adminEmail: `${randomUUID()}@example.test`, firstName: 'New', lastName: 'Admin', reason: 'Approved onboarding' }
  const response = await companies.POST(request('owner', 'platform/companies', input))
  assert.equal(response.status, 201, await response.clone().text()); const result = await response.json(); companyIds.push(result.id)
  const invite = await prisma.teamInvite.findFirstOrThrow({ where: { companyId: result.id } }); assert.equal(invite.role, 'ADMIN'); assert.equal(invite.email, input.adminEmail); assert.ok(result.inviteUrl.endsWith(invite.token))
  assert.equal((await companies.POST(request('owner', 'platform/companies', input))).status, 409)
  assert.equal((await companies.GET(request('owner', 'platform/companies?createdAfter=2026-02-31'))).status, 400)
  assert.equal(await prisma.auditEvent.count({ where: { companyId: result.id, action: 'created', scope: 'PLATFORM' } }), 1)
  const bad = await company.PATCH(request('owner', `platform/companies/${result.id}`, { action: 'edit', name: 'Not saved' }, 'PATCH'), context(result.id))
  assert.equal(bad.status, 400); assert.equal((await prisma.company.findUniqueOrThrow({ where: { id: result.id } })).name, 'Created customer')
})
test('suspension blocks staff, raw-JWT routes, vendors, client/shared links, invitations and review links; reactivation does not revive tokens', async () => {
  const id = companyIds[1], shareToken = randomBytes(32).toString('hex')
  const asset = await prisma.asset.create({ data: { companyId: id, name: 'Shared machine', type: 'EQUIPMENT', isShareable: true, shareToken } })
  const stage = await prisma.stage.create({ data: { companyId: id, name: 'New', color: '#000000', order: 0 } })
  const clientToken = randomBytes(32).toString('hex')
  const project = await prisma.card.create({ data: { companyId: id, stageId: stage.id, title: 'Client project', customFields: JSON.stringify({ clientAccessEnabled: true, clientAccessToken: clientToken }) } })
  const taskToken = randomBytes(32).toString('hex'), reviewToken = randomBytes(32).toString('hex')
  await prisma.task.create({ data: { cardId: project.id, creatorId: actors.admin.id, title: 'Shared task', isShareable: true, shareToken: taskToken } })
  await prisma.assetImportReview.create({ data: { companyId: id, title: 'Review', sourceDigest: randomUUID(), tokenHash: createHash('sha256').update(reviewToken).digest('hex'), choices: {}, expiresAt: new Date(Date.now() + 86400000) } })
  const vendor = await prisma.vendor.create({ data: { companyId: id, name: 'Vendor', companyName: 'Vendor test', portalEmail: `${randomUUID()}@example.test`, status: 'VERIFIED' } })
  const va = await import('../src/lib/vendor-auth'), vendorToken = va.generateVendorToken({ vendorId: vendor.id, email: vendor.portalEmail!, companyId: id, type: 'vendor' })
  const invitation = await prisma.teamInvite.create({ data: { companyId: id, email: `${randomUUID()}@example.test`, firstName: 'Test', lastName: 'Invite', invitedById: actors.admin.id, token: randomUUID(), expiresAt: new Date(Date.now() + 86400000) } })
  assert.ok(await auth.validateUser(actors.staff.token)); assert.ok(await va.validateVendor(vendorToken))
  const result = await company.PATCH(request('owner', `platform/companies/${id}`, { action: 'suspend', reason: 'Account review' }, 'PATCH'), context(id))
  assert.equal(result.status, 200, await result.clone().text()); assert.equal(await auth.validateUser(actors.staff.token), null); assert.equal(await va.validateVendor(vendorToken), null)
  const raw = await import('../src/app/api/stages/route'); assert.equal((await raw.GET(request('staff', 'stages'))).status, 401)
  const shared = await import('../src/app/api/shared/asset/[token]/route')
  assert.equal((await shared.GET(new NextRequest('https://buildflo.test/api/shared/asset/' + shareToken), { params: Promise.resolve({ token: shareToken }) })).status, 404)
  const client = await import('../src/app/api/client/project/[token]/route')
  assert.equal((await client.GET(new NextRequest('https://buildflo.test/api/client/project/' + clientToken), { params: Promise.resolve({ token: clientToken }) })).status, 404)
  const invited = await import('../src/app/api/invite/[token]/route')
  assert.equal((await invited.GET(new NextRequest('https://buildflo.test/api/invite/' + invitation.token), { params: Promise.resolve({ token: invitation.token }) })).status, 404)
  const sharedTask = await import('../src/app/api/shared/task/[token]/route')
  assert.equal((await sharedTask.GET(new NextRequest('https://buildflo.test/api/shared/task/' + taskToken), { params: Promise.resolve({ token: taskToken }) })).status, 404)
  const review = await import('../src/app/api/shared/import-review/[token]/route')
  assert.equal((await review.GET(new NextRequest('https://buildflo.test/api/shared/import-review/' + reviewToken), { params: Promise.resolve({ token: reviewToken }) })).status, 404)
  const { auditedRoute } = await import('../src/lib/platform/route-audit')
  let called = false
  const protectedRead = auditedRoute('/api/anything', 'GET', async () => { called = true; return NextResponse.json({}) })
  assert.equal((await (protectedRead as any)(request('staff', 'anything'))).status, 401); assert.equal(called, false)
  await company.PATCH(request('owner', `platform/companies/${id}`, { action: 'reactivate', reason: 'Review complete' }, 'PATCH'), context(id))
  assert.equal(await auth.validateUser(actors.staff.token), null); assert.equal(await va.validateVendor(vendorToken), null)
  const current = await prisma.company.findUniqueOrThrow({ where: { id } })
  for (const name of ['staff', 'admin']) actors[name].token = auth.generateToken({ userId: actors[name].id, email: actors[name].email, role: actors[name].role, companyId: id, companyVersion: current.accessVersion })
  assert.ok(await auth.validateUser(actors.staff.token))
  assert.equal(await auth.validateUser(auth.generateToken({ userId: actors.staff.id, companyId: companyIds[2], email: actors.staff.email, role: 'STAFF', companyVersion: current.accessVersion })), null)
  assert.equal(await auth.validateUser(auth.generateToken({ userId: actors.staff.id, companyId: id, email: actors.staff.email, role: 'ADMIN', companyVersion: current.accessVersion })), null)
  assert.equal((await company.PATCH(request('owner', 'platform/companies/' + companyIds[0], { action: 'suspend', reason: 'Must fail' }, 'PATCH'), context(companyIds[0]))).status, 409)
  await prisma.card.delete({ where: { id: project.id } }); await prisma.asset.delete({ where: { id: asset.id } })
})
test('user controls protect platform accounts and last company administrator, and revoke old sessions', async () => {
  const id = companyIds[1]
  assert.equal((await users.PATCH(request('owner', `platform/companies/${id}/users`, { userId: actors.admin.id, action: 'disable', reason: 'Must fail' }, 'PATCH'), context(id))).status, 409)
  assert.equal((await users.PATCH(request('owner', `platform/companies/${companyIds[0]}/users`, { userId: actors.locked.id, action: 'disable', reason: 'Must fail' }, 'PATCH'), context(companyIds[0]))).status, 403)
  assert.equal((await users.PATCH(request('owner', `platform/companies/${id}/users`, { userId: actors.foreign.id, action: 'disable', reason: 'Must fail' }, 'PATCH'), context(id))).status, 404)
  assert.equal((await users.PATCH(request('owner', `platform/companies/${id}/users`, { userId: actors.staff.id, action: 'revoke-sessions', reason: 'Lost device' }, 'PATCH'), context(id))).status, 200)
  assert.equal(await auth.validateUser(actors.staff.token), null)
  const current = await prisma.user.findUniqueOrThrow({ where: { id: actors.staff.id }, include: { company: true } })
  actors.staff.token = auth.generateToken({ userId: current.id, email: current.email, role: current.role, companyId: current.companyId, sessionVersion: current.sessionVersion, companyVersion: current.company.accessVersion })
})
test('mutations have immutable attributed before/after records; failure and secret redaction are preserved', async () => {
  const { auditedRoute } = await import('../src/lib/platform/route-audit')
  const asset = await prisma.asset.create({ data: { companyId: companyIds[1], name: 'Audit excavator', type: 'EQUIPMENT' } })
  const change = auditedRoute('/api/assets/[id]', 'PATCH', async () => { await prisma.asset.update({ where: { id: asset.id }, data: { status: 'UNDER_MAINTENANCE' } }); return NextResponse.json({ password: 'never-record-this' }) })
  const response = await (change as any)(request('staff', `assets/${asset.id}`, { status: 'UNDER_MAINTENANCE', apiKey: 'never-record-this' }, 'PATCH'), context(asset.id))
  assert.equal(response.status, 200)
  const logged = await prisma.auditEvent.findFirstOrThrow({ where: { resourceId: asset.id, outcome: 'SUCCEEDED' } })
  assert.equal(logged.actorId, actors.staff.id); assert.equal((logged.before as any).status, 'AVAILABLE'); assert.equal((logged.after as any).status, 'UNDER_MAINTENANCE'); assert.match(logged.summary, /Audit excavator from AVAILABLE to UNDER_MAINTENANCE/)
  assert.ok(!JSON.stringify(logged).includes('never-record-this'))
  await assert.rejects(prisma.auditEvent.update({ where: { id: logged.id }, data: { summary: 'Tampered' } }), /immutable/)
  await assert.rejects(prisma.auditEvent.delete({ where: { id: logged.id } }), /immutable/)
  await prisma.asset.delete({ where: { id: asset.id } }); assert.ok(await prisma.auditEvent.findUnique({ where: { id: logged.id } }))
  const failing = auditedRoute('/api/assets', 'POST', async () => NextResponse.json({ error: 'Invalid payload' }, { status: 400 }))
  assert.equal((await (failing as any)(request('staff', 'assets', {}))).status, 400)
  assert.ok(await prisma.auditEvent.count({ where: { actorId: actors.staff.id, outcome: 'FAILED' } }))
  const statefulRead = auditedRoute('/api/notifications/preferences', 'GET', async () => NextResponse.json({ initialized: true }))
  await (statefulRead as any)(request('staff', 'notifications/preferences'))
  assert.equal(await prisma.auditEvent.count({ where: { actorId: actors.staff.id, module: 'notifications', outcome: 'SUCCEEDED' } }), 1)
})
test('company feed isolation, pagination, export formula escaping and legacy source are enforced', async () => {
  const { recordAudit } = await import('../src/lib/platform/audit')
  for (let i = 0; i < 28; i++) await recordAudit({ companyId: companyIds[2], companyName: 'Customer B test', actorId: actors.foreign.id, actorName: 'foreign Tester', actorType: 'USER', module: 'test', action: 'test', summary: i === 0 ? '=HYPERLINK("evil")' : `Pagination ${i}` })
  const first = await (await events.GET(request('owner', `platform/events?companyId=${companyIds[2]}&module=test`))).json()
  const second = await (await events.GET(request('owner', `platform/events?companyId=${companyIds[2]}&module=test&page=2`))).json()
  assert.equal(first.total, 28); assert.equal(first.items.length, 25); assert.equal(second.items.length, 3)
  assert.equal(new Set([...first.items, ...second.items].map(r => r.id)).size, 28)
  assert.ok(first.items.every((r: any) => r.companyId === companyIds[2]))
  assert.equal((await events.GET(request('admin', 'platform/events'))).status, 403)
  const csv = await events.GET(request('owner', `platform/events?companyId=${companyIds[2]}&module=test&format=csv`))
  assert.equal(csv.status, 200); assert.match(await csv.text(), /'=HYPERLINK/)
  assert.equal((await events.GET(request('owner', 'platform/events?from=2026-02-31'))).status, 400)
  const legacy = await events.GET(request('owner', `platform/events?companyId=${companyIds[1]}&source=legacy`)); assert.equal(legacy.status, 200)
})
test('incomplete attempts are filtered and paginated in the database without a prefix cutoff', async () => {
  const common = { actorId: actors.foreign.id, actorName: 'foreign Tester', actorType: 'USER', module: 'test', action: 'test', outcome: 'STARTED', summary: 'Pending operation', createdAt: new Date(Date.now() - 600000) }
  await prisma.auditEvent.createMany({ data: Array.from({ length: 1002 }, () => ({ ...common, requestId: randomUUID(), companyId: companyIds[2], companyName: 'Customer B test' })) })
  const older = await prisma.auditEvent.create({ data: { ...common, requestId: randomUUID(), companyId: companyIds[1], companyName: 'Customer A test', createdAt: new Date(Date.now() - 1200000) } })
  const first = await (await events.GET(request('owner', `platform/events?incomplete=true&companyId=${companyIds[2]}`))).json()
  const last = await (await events.GET(request('owner', `platform/events?incomplete=true&companyId=${companyIds[2]}&page=41`))).json()
  assert.equal(first.total, 1002); assert.equal(first.items.length, 25); assert.equal(last.items.length, 2)
  const filtered = await (await events.GET(request('owner', `platform/events?incomplete=true&companyId=${companyIds[1]}&module=test&actor=foreign&search=Pending`))).json()
  assert.equal(filtered.total, 1); assert.equal(filtered.items[0].id, older.id)
  await prisma.auditEvent.create({ data: { ...common, requestId: older.requestId, companyId: companyIds[1], companyName: 'Customer A test', outcome: 'SUCCEEDED' } })
  const completed = await (await events.GET(request('owner', `platform/events?incomplete=true&companyId=${companyIds[1]}&module=test`))).json()
  assert.equal(completed.total, 0)
})
test('platform grants and MFA sessions are checked on every request', async () => {
  await prisma.platformSession.deleteMany({ where: { userId: actors.owner.id } })
  assert.equal((await companies.GET(request('owner', 'platform/companies'))).status, 403)
  await prisma.platformAdmin.delete({ where: { userId: actors.owner.id } })
  assert.equal((await companies.GET(request('owner', 'platform/companies'))).status, 403)
})
test('every existing API handler is in the checked-in authorization and audit coverage manifest', () => {
  const entries = JSON.parse(readFileSync('docs/platform-route-coverage.json', 'utf8')) as { route: string; method: string }[]
  for (const entry of entries) assert.ok((auditModules as readonly string[]).includes(entry.route.split('/')[2]), entry.route)
  function visit(dir: string) {
    for (const file of readdirSync(dir, { withFileTypes: true })) {
      const path = join(dir, file.name)
      if (file.isDirectory()) { if (file.name !== 'platform') visit(path); continue }
      if (file.name !== 'route.ts') continue
      const source = readFileSync(path, 'utf8'), route = '/' + dir.replace(/^src\/app\//, '')
      for (const match of source.matchAll(/export (?:async function|const) (GET|POST|PUT|PATCH|DELETE|HEAD)\b/g)) {
        assert.ok(source.includes(`auditedRoute('${route}', '${match[1]}'`), path)
        assert.ok(entries.some(e => e.route === route && e.method === match[1]), path)
      }
    }
  }
  visit('src/app/api')
})
