import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import { mkdirSync, rmSync } from 'node:fs'
import jwt from 'jsonwebtoken'

const url = process.env.ASSET_SETTINGS_TEST_DATABASE_URL
if (!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname)) throw new Error('Disposable local ASSET_SETTINGS_TEST_DATABASE_URL required')
const prisma = new PrismaClient({ datasources: { db: { url } } })
let companyId: string, assetId: string, user: any
const screenshots = '.impeccable/review/asset-attachments-issues'
const png = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aE5sAAAAASUVORK5CYII='

test.beforeAll(async () => {
  mkdirSync(screenshots, { recursive: true })
  companyId = (await prisma.company.create({ data: { name: 'Asset workflow test' } })).id
  user = await prisma.user.create({ data: { companyId, firstName: 'Alex', lastName: 'Morgan', email: `${randomUUID()}@example.test`, role: 'ADMIN', password: 'unused' }, include: { company: true } })
  assetId = (await prisma.asset.create({ data: { companyId, name: 'Site excavator', equipmentId: 'EX-009', type: 'EQUIPMENT', status: 'UNDER_MAINTENANCE' } })).id
  await prisma.assetIssueNotificationSetting.create({ data: { companyId, notifyAdmins: false, notifyStaff: false } })
})
test.afterAll(async () => {
  if (companyId) {
    await prisma.assetPersonAssignment.deleteMany({ where: { asset: { companyId } } })
    await prisma.asset.deleteMany({ where: { companyId } })
    await prisma.company.delete({ where: { id: companyId } })
  }
  if (assetId) for (const root of ['public', '.next/standalone/public']) rmSync(`${root}/uploads/assets/${assetId}`, { recursive: true, force: true })
  await prisma.$disconnect()
})
test.beforeEach(async ({ page, baseURL }) => {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, companyId }, 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: baseURL! }])
  const { password, ...safe } = user
  await page.addInitScript(value => localStorage.setItem('auth-storage', JSON.stringify({ state: value, version: 0 })), { user: safe, token, isAuthenticated: true })
  // Warm the local development server so compilation is outside UI request deadlines.
  for (const path of [`/api/assets/${assetId}`, '/api/assets?page=1&pageSize=25', '/api/asset-categories', '/api/asset-types', '/api/assets/issues', '/api/asset-issue-notification-settings', '/api/users', `/api/assets/${assetId}/issues`]) {
    await page.request.get(path, { headers: { Authorization: `Bearer ${token}` }, timeout: 120000 })
  }
})
async function drop(page: Page, category: string, files: { name: string; type: string; data: string }[]) {
  const transfer = await page.evaluateHandle(items => {
    const data = new DataTransfer()
    for (const item of items) data.items.add(new File([Uint8Array.from(atob(item.data), char => char.charCodeAt(0))], item.name, { type: item.type }))
    return data
  }, files)
  const target = page.getByRole('button', { name: `Drop ${category} or browse files` })
  await target.dispatchEvent('dragenter', { dataTransfer: transfer })
  await target.dispatchEvent('drop', { dataTransfer: transfer })
  await transfer.dispose()
}

test('multiple dropped attachments persist; partial failures retry only failed files; validation and browse work', async ({ page }) => {
  await page.goto(`/dashboard/assets/${assetId}?tab=attachments`)
  await expect(page.getByRole('button', { name: 'Drop photos or browse files' })).toBeVisible()
  let calls = 0
  await page.route(`**/api/assets/${assetId}/attachments`, async route => {
    if (route.request().method() !== 'POST') return route.continue()
    calls++
    if (calls === 2) return route.fulfill({ status: 503, json: { error: 'Temporary upload failure' } })
    await route.continue()
  })
  await drop(page, 'photos', [{ name: 'front.png', type: 'image/png', data: png }, { name: 'rear.png', type: 'image/png', data: png }])
  await expect(page.getByRole('alert').filter({ hasText: 'Some files could not be uploaded' })).toContainText('rear.png: Temporary upload failure', { timeout: 30000 })
  await page.getByRole('button', { name: 'Retry failed uploads' }).click()
  await expect(page.getByRole('img', { name: 'rear.png', exact: true })).toBeVisible()
  expect(calls).toBe(3)
  expect(await prisma.assetAttachment.count({ where: { assetId, fileName: 'front.png' } })).toBe(1)
  await drop(page, 'documents', [{ name: 'manual.txt', type: 'text/plain', data: Buffer.from('Manual').toString('base64') }, { name: 'warranty.txt', type: 'text/plain', data: Buffer.from('Warranty').toString('base64') }])
  await expect(page.getByRole('link', { name: 'warranty.txt' })).toBeVisible()
  await drop(page, 'photos', [{ name: 'not-a-photo.txt', type: 'text/plain', data: 'aGk=' }])
  await expect(page.getByRole('alert').filter({ hasText: 'Some files could not be uploaded' })).toContainText('Use JPEG, PNG, GIF or WebP')
  await expect(page.getByRole('button', { name: 'Retry failed uploads' })).toHaveCount(0)
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
  const chooser = page.waitForEvent('filechooser')
  await page.getByRole('button', { name: 'Drop documents or browse files' }).click()
  await (await chooser).setFiles([{ name: 'too-big.txt', mimeType: 'text/plain', buffer: Buffer.alloc(10 * 1024 * 1024 + 1) }, { name: 'receipt.txt', mimeType: 'text/plain', buffer: Buffer.from('Receipt') }])
  await expect(page.getByRole('alert').filter({ hasText: 'Some files could not be uploaded' })).toContainText('Maximum file size is 10 MB.')
  await expect(page.getByRole('link', { name: 'receipt.txt' })).toBeVisible()
  expect(await prisma.assetAttachment.count({ where: { assetId } })).toBe(5)
  await page.getByRole('button', { name: 'Dismiss', exact: true }).click()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.screenshot({ path: `${screenshots}/attachments-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
})

test('Add issue finds unavailable assets, retains failed drafts, and saves issue and meter reading in place', async ({ page }) => {
  await page.goto('/dashboard/assets/issues')
  await page.getByRole('button', { name: 'Add issue', exact: true }).click()
  await page.getByRole('textbox', { name: 'Search assets', exact: true }).fill('EX-009')
  const select = page.getByRole('button', { name: 'Select EX-009', exact: true })
  await expect(select).toBeEnabled()
  await expect(page.getByRole('cell', { name: 'Under maintenance', exact: true })).toBeVisible()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await page.screenshot({ path: `${screenshots}/issue-picker-${width}.png`, fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  await select.click()
  const dialog = page.getByRole('dialog', { name: 'Log an Issue' })
  await dialog.getByLabel('Title').fill('Hydraulic hose leak')
  await dialog.getByLabel('Description', { exact: true }).fill('Fluid visible beside the left track.')
  await dialog.getByLabel('Urgency', { exact: true }).selectOption('HIGH')
  await dialog.getByLabel('Initial Issue Status').selectOption('RESOLVED')
  await dialog.getByLabel('Issue meter reading', { exact: true }).fill('123.4')
  await expect(dialog.getByLabel('Notify admins')).toBeEnabled()
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 900 })
    await dialog.screenshot({ path: `${screenshots}/issue-form-${width}.png` })
    expect(await dialog.evaluate(element => element.scrollWidth <= element.clientWidth)).toBeTruthy()
  }
  let fail = true
  await page.route(`**/api/assets/${assetId}/issues`, route => route.request().method() === 'POST' && fail ? route.fulfill({ status: 503, json: { error: 'Please retry saving this issue' } }) : route.continue())
  await dialog.getByRole('button', { name: 'Log Issue', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Please retry saving this issue')
  await expect(dialog.getByLabel('Title')).toHaveValue('Hydraulic hose leak')
  fail = false
  await dialog.getByRole('button', { name: 'Log Issue', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'Hydraulic hose leak', exact: true })).toBeVisible()
  const saved = await prisma.assetIssue.findFirstOrThrow({ where: { assetId, title: 'Hydraulic hose leak' }, include: { meterReading: true } })
  expect(saved.status).toBe('RESOLVED'); expect(saved.urgency).toBe('HIGH'); expect(saved.reportedById).toBe(user.id)
  expect(Number(saved.meterReading?.value)).toBe(123.4)
  expect(new URL(page.url()).pathname).toBe('/dashboard/assets/issues')
})

test('asset detail keeps the shared creation flow and dialog keyboard dismissal', async ({ page }) => {
  await page.goto(`/dashboard/assets/${assetId}?tab=issues`)
  const opener = page.getByRole('button', { name: 'Log Issue', exact: true })
  await opener.click()
  const dialog = page.getByRole('dialog', { name: 'Log an Issue' })
  await expect(dialog).toBeVisible()
  await page.keyboard.press('Escape')
  await expect(dialog).toHaveCount(0); await expect(opener).toBeFocused()
  await opener.click()
  await dialog.getByLabel('Title').fill('Track inspection')
  await dialog.getByLabel('Issue meter reading', { exact: true }).fill('124')
  await dialog.getByRole('button', { name: 'Log Issue', exact: true }).click()
  await expect(dialog).toHaveCount(0)
  await expect(page.getByText('Track inspection', { exact: true })).toBeVisible()
  expect(await prisma.assetIssue.count({ where: { assetId, title: 'Track inspection' } })).toBe(1)
})
