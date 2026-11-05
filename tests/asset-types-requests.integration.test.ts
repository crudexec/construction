import assert from 'node:assert/strict'
import { before, after, test } from 'node:test'
import { NextRequest } from 'next/server'
import { randomUUID } from 'node:crypto'
const url = process.env.TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local TEST_DATABASE_URL required')
process.env.DATABASE_URL = url; process.env.JWT_SECRET = 'asset-types-test'
let prisma: typeof import('../src/lib/prisma').prisma
let types: typeof import('../src/app/api/asset-types/route'), update: typeof import('../src/app/api/asset-types/[key]/route'), assets: typeof import('../src/app/api/assets/route'), asset: typeof import('../src/app/api/assets/[id]/route'), requests: typeof import('../src/app/api/asset-requests/route')
const companies: string[] = [], users: Record<string, any> = {}; let legacy: string, customKey: string
function req(name: string, path: string, body?: object, method = 'POST') { return new NextRequest(`https://buildflo.test/api/${path}`, { method: body ? method : 'GET', headers: { origin: 'https://buildflo.test', cookie: `auth-token=${users[name]?.token || ''}`, 'content-type': 'application/json' }, ...(body ? { body: JSON.stringify(body) } : {}) }) }
const ctx = (key: string) => ({ params: Promise.resolve({ key }) })
before(async () => {
  ;({ prisma } = await import('../src/lib/prisma')); types = await import('../src/app/api/asset-types/route'); update = await import('../src/app/api/asset-types/[key]/route'); assets = await import('../src/app/api/assets/route'); asset = await import('../src/app/api/assets/[id]/route'); requests = await import('../src/app/api/asset-requests/route')
  const { generateToken } = await import('../src/lib/auth')
  for (const name of ['Types A', 'Types B']) companies.push((await prisma.company.create({ data: { name } })).id)
  for (const [name, role, index] of [['admin', 'ADMIN', 0], ['staff', 'STAFF', 0], ['other', 'ADMIN', 1]] as const) {
    const row = await prisma.user.create({ data: { email: `${randomUUID()}@example.test`, firstName: name, lastName: 'Tester', role, companyId: companies[index], password: 'unused' } }); users[name] = { ...row, token: generateToken({ userId: row.id, email: row.email, role, companyId: row.companyId }) }
  }
  legacy = (await prisma.asset.create({ data: { companyId: companies[0], name: 'Legacy truck', type: 'VEHICLE' } })).id
})
after(async () => { await prisma.asset.deleteMany({ where: { companyId: { in: companies } } }); for (const id of companies) await prisma.company.delete({ where: { id } }); await prisma.$disconnect() })
test('new companies receive Technology and only admins can manage company-specific types', async () => {
  const defaults = await (await types.GET(req('admin', 'asset-types'))).json()
  assert.equal(defaults.length, 4); assert.ok(defaults.some((type: any) => type.key === 'TECHNOLOGY'))
  assert.equal((await types.POST(req('staff', 'asset-types', { name: 'Safety gear' }))).status, 403)
  const response = await types.POST(req('admin', 'asset-types', { name: 'Safety gear' })); assert.equal(response.status, 201)
  customKey = (await response.json()).key
  assert.equal((await types.POST(req('admin', 'asset-types', { name: 'SAFETY GEAR' }))).status, 409)
  assert.ok(!(await (await types.GET(req('other', 'asset-types'))).json()).some((type: any) => type.key === customKey))
  assert.equal((await update.PATCH(req('other', `asset-types/${customKey}`, { name: 'Foreign rename' }, 'PATCH'), ctx(customKey))).status, 404)
})
test('Technology and custom types create, filter, rename, archive and retain existing assignments', async () => {
  const technology = await assets.POST(req('admin', 'assets', { name: 'Tablet', type: 'TECHNOLOGY' })); assert.equal(technology.status, 201, await technology.clone().text())
  const created = await assets.POST(req('admin', 'assets', { name: 'Harness', type: customKey })); assert.equal(created.status, 201, await created.clone().text()); const item = await created.json()
  assert.equal((await assets.POST(req('other', 'assets', { name: 'Foreign harness', type: customKey }))).status, 400)
  const filtered = await (await assets.GET(req('admin', `assets?page=1&type=${customKey}&sortField=type`))).json(); assert.equal(filtered.pagination.total, 1); assert.equal(filtered.data[0].id, item.id)
  assert.equal((await update.PATCH(req('admin', `asset-types/${customKey}`, { name: 'Safety equipment' }, 'PATCH'), ctx(customKey))).status, 200)
  await update.PATCH(req('admin', 'asset-types/VEHICLE', { name: 'Fleet' }, 'PATCH'), ctx('VEHICLE'))
  assert.equal((await prisma.asset.findUniqueOrThrow({ where: { id: legacy } })).type, 'VEHICLE')
  assert.equal((await update.PATCH(req('admin', `asset-types/${customKey}`, { isActive: false }, 'PATCH'), ctx(customKey))).status, 200)
  assert.equal((await assets.POST(req('admin', 'assets', { name: 'New harness', type: customKey }))).status, 400)
  const patched = await asset.PATCH(req('admin', `assets/${item.id}`, { name: 'Existing harness', type: customKey }, 'PATCH'), { params: Promise.resolve({ id: item.id }) }); assert.equal(patched.status, 200, await patched.clone().text())
  const options = await (await types.GET(req('admin', 'asset-types'))).json(); assert.equal(options.find((type: any) => type.key === customKey).assetCount, 1)
  await update.PATCH(req('admin', `asset-types/${customKey}`, { isActive: true }, 'PATCH'), ctx(customKey))
  assert.equal((await assets.POST(req('admin', 'assets', { name: 'Restored harness', type: customKey }))).status, 201)
})
test('asset requests paginate directly, filter on the server and keep other companies out', async () => {
  const foreign = await prisma.asset.create({ data: { companyId: companies[1], name: 'Foreign tablet', type: 'TECHNOLOGY' } })
  await prisma.assetRequest.createMany({ data: Array.from({ length: 31 }, (_, i) => ({ assetId: legacy, requesterId: users.staff.id, purpose: `Request ${i}`, startDate: new Date(), status: i < 27 ? 'PENDING' : 'RETURNED', createdAt: new Date('2026-01-01') })) })
  await prisma.assetRequest.create({ data: { assetId: foreign.id, requesterId: users.other.id, purpose: 'Foreign secret', startDate: new Date() } })
  const first = await (await requests.GET(req('admin', 'asset-requests?page=1'))).json(), second = await (await requests.GET(req('admin', 'asset-requests?page=2'))).json()
  assert.equal(first.total, 31); assert.equal(first.pendingCount, 27); assert.equal(first.items.length, 25); assert.equal(second.items.length, 6)
  assert.equal(new Set([...first.items, ...second.items].map((row: any) => row.id)).size, 31)
  assert.ok(!JSON.stringify(first).includes('Foreign secret'))
  const filtered = await (await requests.GET(req('admin', 'asset-requests?status=RETURNED&page=999'))).json(); assert.equal(filtered.total, 4); assert.equal(filtered.page, 1); assert.equal(filtered.pendingCount, 27)
  assert.equal((await requests.GET(req('admin', 'asset-requests?status=WRONG'))).status, 400)
  assert.equal((await requests.GET(req('missing', 'asset-requests'))).status, 401)
  const approve = await import('../src/app/api/asset-requests/[id]/approve/route')
  const pending = first.items.find((row: any) => row.status === 'PENDING')
  const approved = await approve.POST(req('admin', `asset-requests/${pending.id}/approve`, {}), { params: Promise.resolve({ id: pending.id }) }); assert.equal(approved.status, 200, await approved.clone().text())
  assert.equal((await prisma.assetRequest.findUniqueOrThrow({ where: { id: pending.id } })).status, 'APPROVED')
})
