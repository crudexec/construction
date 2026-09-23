import { expect, test, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { login } from './helpers/auth'

// Opt in explicitly and use a disposable local DB: these tests create/delete fixtures.
const databaseHost = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : ''
test.skip(process.env.ASSET_IDENTITY_TEST_DB !== '1' || !['127.0.0.1', 'localhost'].includes(databaseHost), 'Requires an explicitly configured disposable local database')

const prisma = new PrismaClient()
const password = 'AssetTest123!'
const companyIds: string[] = []
const emails: string[] = []

test.beforeAll(async () => {
  for (let index = 0; index < 2; index++) {
    const company = await prisma.company.create({ data: { name: `Asset identity test ${randomUUID()}` } })
    companyIds.push(company.id)
    const email = `asset-${randomUUID()}@example.com`
    emails.push(email)
    await prisma.user.create({ data: { companyId: company.id, email, password: await hash(password, 10), firstName: 'Asset', lastName: 'Tester', role: 'ADMIN' } })
  }
})

test.afterAll(async () => {
  await prisma.asset.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.user.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
  await prisma.$disconnect()
})

async function auth(request: APIRequestContext, index = 0) {
  const response = await request.post('/api/auth/login', { data: { email: emails[index], password } })
  expect(response.ok()).toBeTruthy()
  const { token } = await response.json()
  return { Authorization: `Bearer ${token}` }
}

test('persists identity, enforces company-scoped uniqueness, and preserves omitted fields', async ({ request }) => {
  const headers = await auth(request)
  const secondHeaders = await auth(request, 1)
  const create = await request.post('/api/assets', { headers, data: { name: 'Excavator', type: 'EQUIPMENT', equipmentId: '  EX-001  ', category: '  Excavator  ' } })
  expect(create.status()).toBe(201)
  const asset = await create.json()
  expect(asset).toMatchObject({ equipmentId: 'EX-001', category: 'Excavator' })

  const duplicate = await request.post('/api/assets', { headers, data: { name: 'Duplicate', type: 'EQUIPMENT', equipmentId: 'EX-001' } })
  expect(duplicate.status()).toBe(409)
  expect(await duplicate.json()).toMatchObject({ error: 'This Equipment ID is already in use in your company' })
  const anotherCompany = await request.post('/api/assets', { headers: secondHeaders, data: { name: 'Other company', type: 'EQUIPMENT', equipmentId: 'EX-001', category: 'Private category' } })
  expect(anotherCompany.status()).toBe(201)
  const other = await anotherCompany.json()
  expect((await request.patch(`/api/assets/${other.id}`, { headers, data: { equipmentId: 'TAKEN' } })).status()).toBe(404)

  const legacy = await request.post('/api/assets', { headers, data: { name: 'No ID yet', type: 'TOOL' } })
  expect(legacy.status()).toBe(201)
  const withoutId = await legacy.json()
  expect(withoutId).toMatchObject({ equipmentId: null, category: null })
  expect((await request.patch(`/api/assets/${withoutId.id}`, { headers, data: { equipmentId: 'EX-001' } })).status()).toBe(409)

  const rename = await request.patch(`/api/assets/${asset.id}`, { headers, data: { name: 'Renamed Excavator' } })
  expect(rename.ok()).toBeTruthy()
  expect(await rename.json()).toMatchObject({ id: asset.id, equipmentId: 'EX-001', category: 'Excavator' })
  for (const invalid of [{ equipmentId: 123 }, { equipmentId: 'x'.repeat(101) }, { category: ['Excavator'] }, { category: 'x'.repeat(101) }]) {
    expect((await request.patch(`/api/assets/${asset.id}`, { headers, data: invalid })).status()).toBe(400)
    expect((await request.post('/api/assets', { headers, data: { name: 'Invalid', type: 'TOOL', ...invalid } })).status()).toBe(400)
  }
  const cleared = await request.patch(`/api/assets/${asset.id}`, { headers, data: { equipmentId: '   ', category: null } })
  expect(cleared.ok()).toBeTruthy()
  expect(await cleared.json()).toMatchObject({ id: asset.id, equipmentId: null, category: null })
})

test('filters categories by company and type and combines asset filters', async ({ request }) => {
  const headers = await auth(request)
  for (const data of [
    { name: 'Filter excavator', type: 'EQUIPMENT', category: 'Earthmoving', status: 'AVAILABLE' },
    { name: 'Busy excavator', type: 'EQUIPMENT', category: 'earthmoving', status: 'IN_USE' },
    { name: 'Filter truck', type: 'VEHICLE', category: 'Hauling', status: 'AVAILABLE' },
  ]) expect((await request.post('/api/assets', { headers, data })).status()).toBe(201)
  const categories = await request.get('/api/asset-categories?type=EQUIPMENT', { headers })
  expect(categories.ok()).toBeTruthy()
  expect(await categories.json()).toEqual(['Earthmoving'])
  const vehicles = await request.get('/api/asset-categories?type=VEHICLE', { headers })
  expect(await vehicles.json()).toEqual(['Hauling'])
  const all = await request.get('/api/asset-categories', { headers })
  expect(await all.json()).not.toContain('Private category')
  expect((await request.get('/api/asset-categories?type=INVALID', { headers })).status()).toBe(400)

  const filtered = await request.get('/api/assets?type=EQUIPMENT&category=EARTHMOVING&status=AVAILABLE', { headers })
  expect(filtered.ok()).toBeTruthy()
  expect((await filtered.json()).map((asset: { name: string }) => asset.name)).toEqual(['Filter excavator'])
})

test('creates, finds, edits, and clears Equipment ID and category in the UI', async ({ page }, testInfo) => {
  await login(page, emails[0], password)
  await page.goto('/dashboard/assets/new')
  await page.getByLabel('Equipment ID', { exact: true }).fill('UI-EX-002')
  await page.getByLabel('Asset Name *').fill('UI identity excavator')
  await page.getByLabel('Category', { exact: true }).fill('Excavator')
  await page.getByRole('button', { name: 'Create Asset' }).click()
  await expect(page.getByRole('heading', { name: 'UI-EX-002 · UI identity excavator' })).toBeVisible()
  const assetUrl = page.url()

  await page.goto('/dashboard/assets')
  await page.getByLabel('Search assets').fill('ui-ex-002')
  await expect(page.getByRole('cell', { name: 'UI-EX-002', exact: true })).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByLabel('Filter by asset type').selectOption('EQUIPMENT')
  await page.getByLabel('Filter by category').selectOption('Excavator')
  await expect(page.getByRole('cell', { name: 'UI identity excavator', exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('equipment-id-category-dashboard.png'), fullPage: true })
  await page.getByLabel('Filter by status').selectOption('IN_USE')
  await expect(page.getByText('No assets found', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Clear', exact: true }).click()
  await expect(page.getByLabel('Filter by category')).toHaveValue('')
  await expect(page.getByRole('cell', { name: 'UI-EX-002', exact: true })).toBeVisible()

  await page.goto(assetUrl)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Equipment ID', { exact: true }).fill('UI-EX-003')
  await page.getByLabel('Category', { exact: true }).fill('Mini Excavator')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('heading', { name: 'UI-EX-003 · UI identity excavator' })).toBeVisible()
  await page.reload()
  await expect(page.getByText('Mini Excavator', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Equipment ID', { exact: true }).fill('')
  await page.getByLabel('Category', { exact: true }).fill('')
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.getByRole('heading', { name: 'UI identity excavator', exact: true })).toBeVisible()
  await expect(page.getByText('Not assigned', { exact: true })).toBeVisible()
  await expect(page).toHaveURL(assetUrl)
})
