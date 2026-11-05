import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'
import { mkdirSync } from 'node:fs'
const url = process.env.ASSET_SETTINGS_TEST_DATABASE_URL
if (!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname)) throw new Error('Disposable local ASSET_SETTINGS_TEST_DATABASE_URL required')
const prisma = new PrismaClient({ datasources: { db: { url } } })
let companyId: string, user: any, assetId: string
const screenshots = '.impeccable/review/asset-types-requests'
test.beforeAll(async () => {
  mkdirSync(screenshots, { recursive: true })
  companyId = (await prisma.company.create({ data: { name: 'Allied Construction (test)' } })).id
  user = await prisma.user.create({ data: { companyId, firstName: 'Avery', lastName: 'Morgan', email: `${randomUUID()}@example.test`, role: 'ADMIN', password: 'unused' }, include: { company: true } })
  assetId = (await prisma.asset.create({ data: { companyId, name: 'Site tablet', type: 'TECHNOLOGY', equipmentId: 'IT-001' } })).id
  await prisma.assetRequest.createMany({ data: Array.from({ length: 31 }, (_, i) => ({ assetId, requesterId: user.id, purpose: `Site inspection ${i + 1}`, startDate: new Date(), createdAt: new Date(Date.now() - i * 1000) })) })
})
test.afterAll(async () => { await prisma.assetPersonAssignment.deleteMany({ where: { asset: { companyId } } }); await prisma.asset.deleteMany({ where: { companyId } }); await prisma.company.delete({ where: { id: companyId } }); await prisma.$disconnect() })
async function signIn(page: Page, baseURL: string) {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, companyId }, 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: baseURL }])
  const { password, ...safe } = user
  await page.addInitScript(value => localStorage.setItem('auth-storage', JSON.stringify({ state: value, version: 0 })), { user: safe, token, isAuthenticated: true })
}
test.beforeEach(async ({ page, baseURL }) => signIn(page, baseURL!))
test('request screen uses one paginated list and supports approval and return', async ({ page }) => {
  const legacyCalls: string[] = []
  page.on('request', request => { const path = new URL(request.url()).pathname; if (path === '/api/assets' || /^\/api\/assets\/[^/]+\/requests$/.test(path)) legacyCalls.push(path) })
  await page.goto('/dashboard/assets/requests')
  await expect(page.getByText('31 requests · Page 1 of 2')).toBeVisible()
  await expect(page.locator('tbody tr')).toHaveCount(25)
  await page.getByRole('button', { name: 'Next', exact: true }).click(); await expect(page.locator('tbody tr')).toHaveCount(6)
  await page.getByRole('button', { name: 'Previous', exact: true }).click()
  await page.getByRole('button', { name: 'Approve', exact: true }).first().click()
  await page.getByLabel('Filter requests by status').selectOption('APPROVED')
  await expect(page.locator('tbody tr')).toHaveCount(1)
  await page.getByRole('button', { name: 'Mark Returned' }).click()
  await expect(page.getByText('No requests found')).toBeVisible()
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })).status).toBe('AVAILABLE')
  expect(legacyCalls).toEqual([])
})
test('failed request loads show a recoverable error rather than an endless spinner', async ({ page }) => {
  let fail = true
  await page.route('**/api/asset-requests?*', route => fail ? route.fulfill({ status: 503, json: { error: 'Requests temporarily unavailable' } }) : route.continue())
  await page.goto('/dashboard/assets/requests')
  await expect(page.getByRole('alert').filter({ hasText: 'Requests temporarily unavailable' })).toBeVisible()
  fail = false; await page.getByRole('button', { name: 'Try again', exact: true }).click()
  await expect(page.getByText('31 requests · Page 1 of 2')).toBeVisible()
})
test('admins add and rename types, use them on assets, and archive without losing records', async ({ page }) => {
  await page.goto('/dashboard/settings?tab=asset-types')
  await expect(page.getByRole('heading', { name: 'Asset types', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Add type' }).click(); await page.getByLabel('Type name', { exact: true }).fill('Safety gear'); await page.getByRole('button', { name: 'Save type' }).click()
  await expect(page.getByRole('button', { name: 'Rename Safety gear' })).toBeVisible()
  await page.getByRole('button', { name: 'Rename Technology' }).click(); await page.getByLabel('Type name', { exact: true }).fill('IT equipment'); await page.getByRole('button', { name: 'Save type' }).click()
  await expect(page.getByRole('button', { name: 'Rename IT equipment' })).toBeVisible()
  await page.goto('/dashboard/assets/new')
  await expect(page.locator('#profile-type')).toBeEnabled()
  await page.locator('#profile-type').selectOption('TECHNOLOGY')
  await expect(page.locator('#profile-type option:checked')).toHaveText('IT equipment')
  await expect(page.locator('#profile-type option').filter({ hasText: 'Safety gear' })).toHaveCount(1)
  await page.goto('/dashboard/assets')
  await expect(page.getByRole('cell', { name: 'IT equipment', exact: true })).toBeVisible()
  await page.goto('/dashboard/settings?tab=asset-types')
  const row = page.getByRole('listitem').filter({ has: page.getByRole('button', { name: 'Rename IT equipment' }) })
  await row.getByRole('button', { name: 'Archive', exact: true }).click()
  await expect(row.getByRole('button', { name: 'Restore', exact: true })).toBeVisible()
  expect((await prisma.asset.findUniqueOrThrow({ where: { id: assetId } })).type).toBe('TECHNOLOGY')
  await page.goto('/dashboard/assets/new')
  await expect(page.locator('#profile-type')).toBeEnabled()
  await expect(page.locator('#profile-type option[value="TECHNOLOGY"]')).toHaveCount(0)
})
for (const width of [1440, 390]) test(`settings and request list fit ${width}px`, async ({ page }) => {
  await page.setViewportSize({ width, height: 900 })
  await page.goto('/dashboard/settings?tab=asset-types')
  await expect(page.getByRole('button', { name: 'Rename IT equipment' })).toBeVisible()
  await page.screenshot({ path: `${screenshots}/types-${width}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.goto('/dashboard/assets/requests'); await expect(page.getByText('31 requests · Page 1 of 2')).toBeVisible()
  await page.screenshot({ path: `${screenshots}/requests-${width}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
})
