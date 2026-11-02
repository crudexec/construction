import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { NextRequest } from 'next/server'
import type { AssetListResponse } from '../src/lib/assets/list'

// Run against an explicitly supplied disposable PostgreSQL database, never .env.
if (!process.env.TEST_DATABASE_URL) throw new Error('TEST_DATABASE_URL must point to a disposable test database')
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL
process.env.JWT_SECRET = 'asset-pagination-test-secret'
let prisma: typeof import('../src/lib/prisma').prisma
let GET: typeof import('../src/app/api/assets/route').GET
let token: string
let companyId: string
let foreignCompanyId: string
const seed = Array.from({ length: 61 }, (_, index) => ({
  id: `pagination-${index + 1}`,
  equipmentId: `EQ-${String(index + 1).padStart(3, '0')}`,
  name: `Asset ${String(index + 1).padStart(3, '0')}`,
  type: index < 30 ? 'EQUIPMENT' as const : 'VEHICLE' as const,
  category: index < 30 ? 'Excavator' : 'Truck',
  status: index < 30 ? 'AVAILABLE' as const : 'IN_USE' as const,
  serialNumber: `Serial_${index + 1}`,
  make: index % 2 ? 'CAT' : 'Deere', model: `Model ${index + 1}`, year: 2020,
  currentLocation: index % 2 ? 'Site A' : null,
  purchaseCost: 1000,
  createdAt: new Date('2026-01-01T00:00:00Z'),
}))

before(async () => {
  ;({ prisma } = await import('../src/lib/prisma'))
  ;({ GET } = await import('../src/app/api/assets/route'))
  const { generateToken } = await import('../src/lib/auth')
  companyId = (await prisma.company.create({ data: { name: 'Pagination test' } })).id
  foreignCompanyId = (await prisma.company.create({ data: { name: 'Other pagination test' } })).id
  const user = await prisma.user.create({ data: {
    companyId, email: `${companyId}@example.test`, firstName: 'Test', lastName: 'Admin', password: 'unused', role: 'ADMIN',
  } })
  token = generateToken({ userId: user.id, email: user.email, companyId, role: 'ADMIN' })
  const status = await prisma.assetStatusDefinition.create({ data: { name: 'Ready to go', baseStatus: 'AVAILABLE', companyId } })
  const yard = await prisma.assetYard.create({ data: { name: 'Main yard', companyId } })
  await prisma.asset.createMany({ data: seed.map((asset, index) => ({
    ...asset, companyId,
    statusDefinitionId: index === 0 ? status.id : null,
    currentAssigneeId: index < 30 ? user.id : null,
    currentYardId: index === 0 ? yard.id : null,
  })) })
  await prisma.asset.create({ data: { name: 'Foreign asset', type: 'TOOL', equipmentId: 'EQ-000', companyId: foreignCompanyId, purchaseCost: 999999 } })
})

after(async () => {
  if (companyId) await prisma.company.delete({ where: { id: companyId } })
  if (foreignCompanyId) await prisma.company.delete({ where: { id: foreignCompanyId } })
  await prisma?.$disconnect()
})

function request(query = 'page=1', authenticated = true) {
  return new NextRequest(`https://example.test/api/assets?${query}`, {
    headers: authenticated ? { authorization: `Bearer ${token}` } : {},
  })
}
async function list(query = 'page=1'): Promise<AssetListResponse> {
  const response = await GET(request(query))
  assert.equal(response.status, 200, await response.clone().text())
  return response.json()
}

test('returns bounded, non-overlapping pages and complete company-scoped summaries', async () => {
  const first = await list()
  const second = await list('page=2')
  const last = await list('page=3')
  assert.equal(first.data.length, 25)
  assert.equal(second.data.length, 25)
  assert.equal(last.data.length, 11)
  assert.deepEqual(first.pagination, { page: 1, pageSize: 25, total: 61, totalPages: 3 })
  assert.deepEqual(first.summary, { availableCount: 30, inUseCount: 31, maintenanceCount: 0, totalValue: 61000 })
  assert.deepEqual(last.summary, first.summary)
  const ids = [...first.data, ...second.data, ...last.data].map(asset => asset.id)
  assert.equal(new Set(ids).size, 61)
  assert.deepEqual(ids, seed.map(asset => asset.id))
  for (const omitted of ['attachments', '_count', 'notes', 'shareToken', 'financedAmount']) {
    assert.equal(omitted in first.data[0], false)
  }
})

test('clamps out-of-range pages and handles zero results and different page sizes', async () => {
  const clamped = await list('page=999')
  assert.equal(clamped.pagination.page, 3)
  assert.equal(clamped.data.length, 11)
  const fifty = await list('page=2&pageSize=50')
  assert.equal(fifty.data.length, 11)
  assert.equal(fifty.pagination.totalPages, 2)
  const empty = await list('page=999&search=missing')
  assert.deepEqual(empty.pagination, { page: 1, pageSize: 25, total: 0, totalPages: 1 })
  assert.deepEqual(empty.data, [])
  assert.equal(empty.summary.totalValue, 61000)
})

test('filters and searches the whole company before paging, treating wildcard characters literally', async () => {
  const filtered = await list('page=2&type=EQUIPMENT&category=EXCAVATOR&status=AVAILABLE')
  assert.equal(filtered.pagination.total, 30)
  assert.equal(filtered.data.length, 5)
  assert.equal(filtered.summary.totalValue, 30000)
  for (const search of ['eq-061', 'ASSET 061', 'Serial_61', 'Model 61']) {
    const result = await list(`page=1&search=${encodeURIComponent(search)}`)
    assert.deepEqual(result.data.map(asset => asset.id), ['pagination-61'])
  }
  assert.equal((await list('page=1&search=CAT')).pagination.total, 30)
  assert.equal((await list('page=1&search=site%20a')).pagination.total, 30)
  assert.equal((await list('page=1&search=truck')).pagination.total, 31)
  for (const search of ['%', '\\', "' OR TRUE --", 'Foreign asset']) {
    assert.equal((await list(`page=1&search=${encodeURIComponent(search)}`)).pagination.total, 0)
  }
})

test('sorts every table column in PostgreSQL with stable ties and relationship labels', async () => {
  const keys = {
    equipmentId: (index: number) => seed[index].equipmentId.toLowerCase(),
    name: (index: number) => seed[index].name.toLowerCase(),
    category: (index: number) => seed[index].category.toLowerCase(),
    makeModel: (index: number) => `${seed[index].make} ${seed[index].model} 2020`.toLowerCase(),
    type: (index: number) => seed[index].type,
    status: (index: number) => index === 0 ? 'Ready to go' : seed[index].status,
    location: (index: number) => index === 0 ? 'main yard' : seed[index].currentLocation?.toLowerCase() || 'zzz',
    assignee: (index: number) => index < 30 ? 'test admin' : 'zzz',
    cost: () => 1000,
  }
  for (const [sortField, value] of Object.entries(keys)) {
    for (const sortDirection of ['asc', 'desc']) {
      const expected = seed.map((asset, index) => ({ id: asset.id, value: value(index) })).sort((a, b) => {
        const comparison = a.value < b.value ? -1 : a.value > b.value ? 1 : 0
        return comparison * (sortDirection === 'asc' ? 1 : -1) || (a.id < b.id ? -1 : 1)
      })
      const result = await list(`page=2&sortField=${sortField}&sortDirection=${sortDirection}`)
      assert.deepEqual(result.data.map(asset => asset.id), expected.slice(25, 50).map(asset => asset.id), `${sortField} ${sortDirection}`)
    }
  }
})

test('rejects invalid inputs and unauthenticated requests', async () => {
  assert.equal((await GET(request('page=1', false))).status, 401)
  for (const query of ['page=0', 'page=-1', 'page=1.5', 'page=abc', 'page=', 'pageSize=101', 'pageSize=0', 'page=1&sortField=__proto__', 'page=1&sortDirection=DROP', 'page=1&type=INVALID', 'page=1&status=INVALID', `page=1&search=${'a'.repeat(201)}`]) {
    assert.equal((await GET(request(query))).status, 400, query)
  }
})

test('preserves the array response used by existing asset request screens', async () => {
  const response = await GET(request('type=EQUIPMENT'))
  assert.equal(response.status, 200)
  const result = await response.json()
  assert.equal(Array.isArray(result), true)
  assert.equal(result.length, 30)
  assert.ok('attachments' in result[0])
})
