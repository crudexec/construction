import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { login } from './helpers/auth'

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
test.skip(process.env.FLEETIO_TEST_DB !== '1' || !url || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/fleetio_maintenance_verify', 'Disposable local database only')
const db = new PrismaClient()
const password = 'FleetioImportTest123!'
let fixture: { companyId: string; userId: string; email: string; assetId: string; otherAssetId: string; otherCompanyId: string; orderId: string }

test.beforeAll(async () => {
  const company = await db.company.create({ data: { name: `Import test ${randomUUID()}` } })
  const other = await db.company.create({ data: { name: `Other import test ${randomUUID()}` } })
  const user = await db.user.create({ data: { companyId: company.id, email: `import-${randomUUID()}@example.com`, password: await hash(password, 10), firstName: 'Import', lastName: 'Administrator', role: 'ADMIN' } })
  const asset = await db.asset.create({ data: { companyId: company.id, name: 'Imported excavator', type: 'EQUIPMENT' } })
  const otherAsset = await db.asset.create({ data: { companyId: other.id, name: 'Private asset', type: 'EQUIPMENT' } })
  const order = await db.workOrder.create({ data: { companyId: company.id, assetId: asset.id, title: 'Fleetio WO #42', status: 'COMPLETED', createdById: user.id, sourceCreatedByName: 'Original Author', completedAt: new Date('2025-01-02'), sourceData: { system: 'Fleetio', source: { Number: '42' }, lineItems: [{ description: 'Original filter replacement', cost: '0' }], subLineItems: [] } } })
  await db.assetServiceEntry.create({ data: { id: randomUUID(), assetId: asset.id, sourceId: 'service-42', title: 'Historical filter service', performedDate: new Date('2025-01-02'), createdAt: new Date('2025-01-01'), cost: 0, recordedByName: 'Original Author', workOrderId: order.id, sourceData: { system: 'Fleetio', source: { Summary: 'Preserved historical note' } } } })
  await db.inventoryMaterial.create({ data: { companyId: company.id, name: 'Imported filter', sku: 'TEST-FILTER', unit: 'Each', quantity: 2, unitCost: 3, sourceData: { system: 'Fleetio', locations: [{ Location: 'Farm', 'Total Quantity': '0' }, { Location: 'Shop', 'Total Quantity': '2' }] } } })
  fixture = { companyId: company.id, userId: user.id, email: user.email, assetId: asset.id, otherCompanyId: other.id, otherAssetId: otherAsset.id, orderId: order.id }
})
test.afterAll(async () => {
  if (fixture) {
    const companyId = { in: [fixture.companyId, fixture.otherCompanyId] }
    await db.assetServiceEntry.deleteMany({ where: { asset: { companyId } } })
    await db.workOrder.deleteMany({ where: { companyId } })
    await db.asset.deleteMany({ where: { companyId } })
    await db.inventoryMaterial.deleteMany({ where: { companyId } })
    await db.user.deleteMany({ where: { companyId } })
    await db.company.deleteMany({ where: { id: companyId } })
  }
  await db.$disconnect()
})

test('API isolates service history, protects linked orders and includes direct orders in history', async ({ request }) => {
  expect((await request.get(`/api/assets/${fixture.assetId}/maintenance`)).status()).toBe(401)
  const signedIn = await request.post('/api/auth/login', { data: { email: fixture.email, password } })
  expect(signedIn.ok()).toBeTruthy()
  const headers = { Authorization: `Bearer ${(await signedIn.json()).token}` }
  const response = await request.get(`/api/assets/${fixture.assetId}/maintenance`, { headers })
  expect(response.ok()).toBeTruthy()
  const data = await response.json()
  expect(data.records).toEqual([])
  expect(data.importedRecords).toHaveLength(1)
  expect(data.importedRecords[0]).toMatchObject({ recordedByName: 'Original Author', cost: 0, workOrder: { id: fixture.orderId } })
  expect((await request.get(`/api/assets/${fixture.otherAssetId}/maintenance`, { headers })).status()).toBe(404)
  expect((await request.delete(`/api/work-orders/${fixture.orderId}`, { headers })).status()).toBe(409)
  const history = await (await request.get(`/api/assets/${fixture.assetId}/history`, { headers })).json()
  expect(history.events.filter((e: { type: string }) => e.type === 'WORK_ORDER')).toHaveLength(2)
  expect(history.events.find((e: { action: string }) => e.action === 'Work order created').actor).toBe('Original Author')
})

test('imported service and work-order source details are visible and linked', async ({ page }) => {
  await login(page, fixture.email, password)
  await page.goto(`/dashboard/assets/${fixture.assetId}?tab=maintenance`)
  const history = page.getByRole('region', { name: 'Imported service history' })
  await expect(history.getByText('Historical filter service')).toBeVisible()
  await expect(history.getByText(/Recorded by: Original Author/)).toBeVisible()
  await history.getByText('Fleetio source details', { exact: true }).click()
  await expect(history.getByText('Preserved historical note')).toBeVisible()
  await history.getByRole('link', { name: 'Included in Fleetio WO #42' }).click()
  await expect(page.getByRole('heading', { name: 'Fleetio WO #42' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Imported excavator' })).toBeVisible()
  await page.getByText('Fleetio source details', { exact: true }).click()
  await expect(page.getByText('Original filter replacement')).toBeVisible()
})

test('inventory shows per-location opening snapshots including zero', async ({ page }) => {
  await login(page, fixture.email, password)
  await page.goto('/dashboard/inventory')
  await expect(page.getByText('Imported filter', { exact: true })).toBeVisible()
  await page.getByText('Opening stock snapshot', { exact: true }).click()
  const locations = page.getByRole('region', { name: 'Opening stock by location (import snapshot)' })
  await expect(locations.getByText('Farm', { exact: true })).toBeVisible()
  await expect(locations.getByText('0', { exact: true })).toBeVisible()
  await expect(locations.getByText('Shop', { exact: true })).toBeVisible()
})
