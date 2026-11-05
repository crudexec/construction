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
  await expect(page.getByText('Showing 1–25 of 31 requests')).toBeVisible()
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
  await expect(page.getByText('Showing 1–25 of 31 requests')).toBeVisible()
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
  await page.goto('/dashboard/assets/requests'); await expect(page.getByText('Showing 1–25 of 31 requests')).toBeVisible()
  await page.screenshot({ path: `${screenshots}/requests-${width}.png`, fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
})


test('new request entry searches available assets and submits in place with the shared form', async ({ page }) => {
  await page.goto('/dashboard/assets/requests')
  await page.getByRole('button', { name: 'New Request', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search available assets' }).fill('IT-001')
  const choice = page.getByRole('button', { name: 'Request IT-001', exact: true })
  await expect(choice).toBeVisible({ timeout: 30000 })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.getByRole('region', { name: 'New asset request' }).screenshot({ path: `${screenshots}/new-request-picker-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await choice.click()
  const dialog = page.getByRole('dialog', { name: 'Request Asset', exact: true })
  await expect(dialog).toBeVisible({ timeout: 30000 })
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await dialog.screenshot({ path: `${screenshots}/new-request-form-${width}.png` })
  }
  await dialog.getByLabel('Purpose').fill('New request entry regression')
  await dialog.getByLabel('Start Date', { exact: true }).fill('2026-11-10')
  await dialog.getByLabel('End Date', { exact: true }).fill('2026-11-12')
  await dialog.getByRole('button', { name: 'Submit Request', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByText('Request submitted for approval.', { exact: true })).toBeVisible()
  const saved = await prisma.assetRequest.findFirstOrThrow({ where: { assetId, purpose: 'New request entry regression' } })
  expect(new URL(page.url()).pathname).toBe('/dashboard/assets/requests')
  expect(saved.status).toBe('PENDING')
  expect(saved.requesterId).toBe(user.id)
  expect(saved.startDate?.toISOString().slice(0, 10)).toBe('2026-11-10')
  expect(saved.endDate?.toISOString().slice(0, 10)).toBe('2026-11-12')
})


test('asset overview requests widget opens the compact request table and shared form', async ({ page }) => {
  await page.goto(`/dashboard/assets/${assetId}`)
  const widget = page.getByRole('region', { name: 'Asset requests summary' })
  await expect(widget).toContainText(`${await prisma.assetRequest.count({ where: { assetId } })} total`)
  await expect(widget).toContainText('pending approval')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await widget.screenshot({ path: `${screenshots}/requests-widget-${width}.png` })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await widget.getByRole('button', { name: 'View requests' }).click()
  await expect(page.getByRole('region', { name: 'Requests for this asset' })).toBeVisible()
  const pager = page.getByRole('navigation', { name: 'Asset request pages' })
  await expect(pager).toContainText('Page 1 of 2')
  await pager.getByRole('button', { name: 'Next', exact: true }).click()
  await expect(pager).toContainText('Page 2 of 2')
  await pager.getByRole('button', { name: 'Previous', exact: true }).click()
  await expect(pager).toContainText('Page 1 of 2')
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.evaluate(() => window.scrollTo(0, 0))
    await page.screenshot({ path: `${screenshots}/asset-detail-requests-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await widget.getByRole('button', { name: 'New Request', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Request Asset', exact: true })).toBeVisible()
  await page.getByRole('dialog').getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(widget.getByRole('button', { name: 'New Request', exact: true })).toBeFocused()
})

test('shared workspace sizing reaches core modules and preserves document content', async ({ page }) => {
  test.setTimeout(300000)
  await prisma.vendor.create({ data: { companyId, name: 'UI review vendor', companyName: 'UI review vendor' } })
  await prisma.inventoryMaterial.create({ data: { companyId, name: 'UI review material', unit: 'each', quantity: 12 } })
  for (const path of ['assets', 'vendors', 'projects', 'inventory', 'contacts', 'settings', 'assets/work-orders', 'purchase-orders']) {
    await page.goto(`/dashboard/${path}`)
    await expect(page.locator('main.app-workspace')).toBeVisible()
    await expect(page.locator('main h1').first()).toBeVisible({ timeout: 30000 })
    expect(await page.locator('main h1').first().evaluate(node => getComputedStyle(node).fontSize)).toBe('24px')
    if (path === 'vendors') await expect(page.getByText('UI review vendor').first()).toBeVisible({ timeout: 30000 })
    if (path === 'inventory') await expect(page.getByText('UI review material').first()).toBeVisible({ timeout: 30000 })
    const table = page.locator('main table').first()
    if (await table.count()) expect(await table.evaluate(node => getComputedStyle(node).fontSize)).toBe('12px')
    if (['vendors', 'inventory', 'settings'].includes(path)) {
      for (const width of [1440, 390]) {
        await page.setViewportSize({ width, height: 900 })
        await page.screenshot({ path: `${screenshots}/workspace-${path}-${width}.png`, fullPage: true })
      }
    }
  }
  await page.evaluate(() => {
    const preview = document.createElement('section')
    preview.setAttribute('data-ui-density', 'preserve')
    preview.innerHTML = '<h1 style="font-size: 32px">Document title</h1><table style="font-size: 16px"><tbody><tr><td>Document content</td></tr></tbody></table>'
    document.querySelector('main')!.append(preview)
  })
  expect(await page.locator('[data-ui-density="preserve"] h1').evaluate(node => getComputedStyle(node).fontSize)).toBe('32px')
  expect(await page.locator('[data-ui-density="preserve"] table').evaluate(node => getComputedStyle(node).fontSize)).toBe('16px')
})
