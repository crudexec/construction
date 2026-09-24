import { expect, test, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { login } from './helpers/auth'
import { defaultAssetFieldOrder, resolveAssetFieldOrder, type AssetFieldLayout } from '../src/lib/assets/field-layout'

const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : ''
test.skip(process.env.ASSET_IDENTITY_TEST_DB !== '1' || !['127.0.0.1', 'localhost'].includes(host), 'Requires an explicitly configured disposable local database')
const prisma = new PrismaClient()
const password = 'AssetLayout123!'
let companies: string[] = []
let fixture: { companyId: string; email: string; staffEmail: string; otherEmail: string; customId: string; inactiveId: string; otherCustomId: string; assetId: string }

test.beforeEach(async () => {
  companies = []
  const entries = []
  for (let index = 0; index < 2; index++) {
    const company = await prisma.company.create({ data: { name: `Layout test ${randomUUID()}` } })
    companies.push(company.id)
    const user = await prisma.user.create({ data: { companyId: company.id, email: `layout-${randomUUID()}@example.com`, password: await hash(password, 10), firstName: 'Layout', lastName: 'Admin', role: 'ADMIN' } })
    const custom = await prisma.assetCustomFieldDefinition.create({ data: { companyId: company.id, name: 'Unit Tag', fieldType: 'TEXT', sortOrder: 0 } })
    entries.push({ company, user, custom })
  }
  const [own, other] = entries
  const staff = await prisma.user.create({ data: { companyId: own.company.id, email: `staff-${randomUUID()}@example.com`, password: await hash(password, 10), firstName: 'Layout', lastName: 'Staff', role: 'STAFF' } })
  const inactive = await prisma.assetCustomFieldDefinition.create({ data: { companyId: own.company.id, name: 'Retired Identifier', fieldType: 'TEXT', isActive: false, sortOrder: 1 } })
  const asset = await prisma.asset.create({ data: { companyId: own.company.id, name: 'Layout Excavator', equipmentId: 'LAYOUT-1', type: 'EQUIPMENT', purchaseCost: 0, notes: 'Keep these notes', customFieldValues: { create: [{ fieldDefinitionId: own.custom.id, value: 'UNIT-9' }, { fieldDefinitionId: inactive.id, value: 'Legacy value' }] } } })
  fixture = { companyId: own.company.id, email: own.user.email, staffEmail: staff.email, otherEmail: other.user.email, customId: own.custom.id, inactiveId: inactive.id, otherCustomId: other.custom.id, assetId: asset.id }
})
test.afterEach(async () => {
  await prisma.asset.deleteMany({ where: { companyId: { in: companies } } })
  await prisma.notification.deleteMany({ where: { user: { companyId: { in: companies } } } })
  await prisma.user.deleteMany({ where: { companyId: { in: companies } } })
  await prisma.company.deleteMany({ where: { id: { in: companies } } })
})
test.afterAll(() => prisma.$disconnect())

async function auth(request: APIRequestContext, email = fixture.email) {
  const response = await request.post('/api/auth/login', { data: { email, password } })
  expect(response.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await response.json()).token}` }
}
async function layout(request: APIRequestContext, headers: Record<string, string>): Promise<AssetFieldLayout> {
  const response = await request.get('/api/asset-field-layout', { headers })
  expect(response.ok()).toBeTruthy()
  return response.json()
}
function nearTop(current: AssetFieldLayout) {
  return ['equipmentId', 'name', `custom:${fixture.customId}`, ...current.order.filter(key => !['equipmentId', 'name', `custom:${fixture.customId}`].includes(key))]
}

test('enforces admin-only writes, tenant scope, and exact field lists without changing asset values', async ({ request }) => {
  expect((await request.get('/api/asset-field-layout')).status()).toBe(401)
  const headers = await auth(request)
  const current = await layout(request, headers)
  expect(current.version).toBe(0)
  expect(current.order).toEqual(defaultAssetFieldOrder(current.customFields))
  expect(current.customFields.map(field => field.id)).not.toContain(fixture.otherCustomId)
  const before = await prisma.asset.findUnique({ where: { id: fixture.assetId }, include: { customFieldValues: true } })
  for (const order of [[], [...current.order, current.order[0]], current.order.slice(1), current.order.map(key => key === `custom:${fixture.customId}` ? `custom:${fixture.otherCustomId}` : key), ['__proto__', ...current.order.slice(1)]]) {
    expect((await request.put('/api/asset-field-layout', { headers, data: { order, version: 0 } })).status()).toBe(400)
  }
  const saved = await request.put('/api/asset-field-layout', { headers, data: { order: nearTop(current), version: 0 } })
  expect(saved.ok()).toBeTruthy()
  expect((await layout(request, headers)).order).toEqual(nearTop(current))
  const staff = await auth(request, fixture.staffEmail)
  expect((await layout(request, staff)).order).toEqual(nearTop(current))
  expect((await request.put('/api/asset-field-layout', { headers: staff, data: { order: current.order, version: 1 } })).status()).toBe(403)
  expect((await request.put('/api/asset-field-layout', { headers: staff, data: { reset: true, version: 1 } })).status()).toBe(403)
  const other = await auth(request, fixture.otherEmail)
  const otherLayout = await layout(request, other)
  expect(otherLayout.version).toBe(0)
  expect(otherLayout.order).not.toContain(`custom:${fixture.customId}`)
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId }, include: { customFieldValues: true } })).toEqual(before)
})

test('rejects stale saves and resets, appends new fields, retains inactive positions, and ignores deleted definitions', async ({ request }) => {
  const headers = await auth(request)
  const current = await layout(request, headers)
  const results = await Promise.all([1, 2].map(() => request.put('/api/asset-field-layout', { headers, data: { order: nearTop(current), version: 0 } })))
  expect(results.map(result => result.status()).sort()).toEqual([200, 409])
  expect((await request.put('/api/asset-field-layout', { headers, data: { reset: true, version: 0 } })).status()).toBe(409)
  const added = await prisma.assetCustomFieldDefinition.create({ data: { companyId: fixture.companyId, name: 'New field', fieldType: 'TEXT', sortOrder: 2 } })
  const withNew = await layout(request, headers)
  expect(withNew.order.at(-1)).toBe(`custom:${added.id}`)
  expect(withNew.order.indexOf(`custom:${fixture.inactiveId}`)).toBe(current.order.indexOf(`custom:${fixture.inactiveId}`))
  await prisma.assetCustomFieldDefinition.delete({ where: { id: added.id } })
  const reset = await request.put('/api/asset-field-layout', { headers, data: { reset: true, version: 1 } })
  expect(reset.ok()).toBeTruthy()
  expect((await reset.json()).order).toEqual(current.order)
  expect(resolveAssetFieldOrder(['deleted', 'name', 'name'], current.customFields)).toEqual(['name', ...current.order.filter(key => key !== 'name')])
})

test('creates custom values atomically and rejects invalid or foreign-company fields', async ({ request }) => {
  const headers = await auth(request)
  const base = { name: 'Created with layout', type: 'EQUIPMENT', equipmentId: 'NEW-LAYOUT' }
  const before = await prisma.asset.count({ where: { companyId: fixture.companyId } })
  for (const customFieldValues of [{ [fixture.otherCustomId]: 'foreign' }, { [fixture.inactiveId]: 'inactive' }, { [fixture.customId]: { invalid: true } }]) {
    expect((await request.post('/api/assets', { headers, data: { ...base, customFieldValues } })).ok()).toBeFalsy()
  }
  expect((await request.post('/api/assets', { headers, data: { ...base, purchasedFromVendorId: 'foreign-vendor' } })).status()).toBe(404)
  expect(await prisma.asset.count({ where: { companyId: fixture.companyId } })).toBe(before)
  const numeric = await prisma.assetCustomFieldDefinition.create({ data: { companyId: fixture.companyId, name: 'Rating', fieldType: 'NUMBER' } })
  const boolean = await prisma.assetCustomFieldDefinition.create({ data: { companyId: fixture.companyId, name: 'Insured', fieldType: 'BOOLEAN' } })
  const date = await prisma.assetCustomFieldDefinition.create({ data: { companyId: fixture.companyId, name: 'Review date', fieldType: 'DATE' } })
  const select = await prisma.assetCustomFieldDefinition.create({ data: { companyId: fixture.companyId, name: 'Priority', fieldType: 'SELECT', selectOptions: ['High', 'Low'] } })
  for (const values of [{ [numeric.id]: 'invalid' }, { [boolean.id]: 'yes' }, { [date.id]: '2025-02-30' }, { [select.id]: 'invalid' }]) {
    expect((await request.post('/api/assets', { headers, data: { ...base, customFieldValues: values } })).status()).toBe(400)
  }
  const response = await request.post('/api/assets', { headers, data: { ...base, purchaseCost: 0, financedAmount: 0, financingType: 'CASH', poNumber: 'PO-1', customFieldValues: { [fixture.customId]: 'Created value', [numeric.id]: '0.5', [boolean.id]: 'false', [date.id]: '2025-01-01', [select.id]: 'High' } } })
  expect(response.status()).toBe(201)
  const id = (await response.json()).id
  const saved = await prisma.asset.findUniqueOrThrow({ where: { id }, include: { customFieldValues: true } })
  expect(saved).toMatchObject({ purchaseCost: 0, financedAmount: 0, financingType: 'CASH', poNumber: 'PO-1' })
  expect(saved.customFieldValues).toHaveLength(5)
})

test('browser saves mixed field order across create, overview and edit, preserves draft values, and resets', async ({ page, request }, testInfo) => {
  const headers = await auth(request)
  const current = await layout(request, headers)
  expect((await request.put('/api/asset-field-layout', { headers, data: { order: nearTop(current), version: 0 } })).ok()).toBeTruthy()
  await login(page, fixture.email, password)
  await page.goto('/dashboard/assets/new')
  await page.getByLabel('Asset Name *').fill('UI layout asset')
  await page.getByLabel('Equipment ID', { exact: true }).fill('UI-LAYOUT')
  await page.getByLabel('Unit Tag', { exact: true }).fill('UI-TAG')
  await page.getByRole('button', { name: 'Arrange fields', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Arrange asset fields' })
  await dialog.getByRole('button', { name: 'Move Unit Tag (custom) up', exact: true }).click()
  await dialog.getByRole('button', { name: 'Move Unit Tag (custom) up', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save field order', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.locator('[aria-label="Asset profile fields"] > [data-field-key]').first()).toHaveAttribute('data-field-key', `custom:${fixture.customId}`)
  await expect(page.getByLabel('Asset Name *')).toHaveValue('UI layout asset')
  await expect(page.getByLabel('Unit Tag', { exact: true })).toHaveValue('UI-TAG')
  await page.getByRole('button', { name: 'Create Asset', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'UI-LAYOUT · UI layout asset', exact: true })).toBeVisible()
  await expect(page.locator('[aria-label="Asset profile values"] > [data-field-key]').first()).toHaveAttribute('data-field-key', `custom:${fixture.customId}`)
  await expect(page.locator('[data-field-key="custom:' + fixture.customId + '"]')).toContainText('UI-TAG')
  await page.reload()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.locator('[aria-label="Asset profile fields"] > [data-field-key]').first()).toHaveAttribute('data-field-key', `custom:${fixture.customId}`)
  await page.getByLabel('Unit Tag', { exact: true }).fill('UI-TAG-EDITED')
  await page.getByRole('button', { name: 'Arrange fields', exact: true }).click()
  await dialog.getByRole('button', { name: 'Reset to default', exact: true }).click()
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await expect(page.getByLabel('Unit Tag', { exact: true })).toHaveValue('UI-TAG-EDITED')
  await expect(page.locator('[aria-label="Asset profile fields"] > [data-field-key]').first()).toHaveAttribute('data-field-key', `custom:${fixture.customId}`)
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await page.getByRole('button', { name: 'Arrange fields', exact: true }).click()
  await dialog.getByRole('button', { name: 'Reset to default', exact: true }).click()
  await dialog.getByRole('button', { name: 'Save field order', exact: true }).click()
  await expect(page.locator('[aria-label="Asset profile values"] > [data-field-key]').first()).toHaveAttribute('data-field-key', 'equipmentId')
  await expect(page.locator('[data-field-key="custom:' + fixture.customId + '"]')).toContainText('UI-TAG-EDITED')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('asset-field-order-overview.png') })
})

test('staff sees the shared order but no layout editor; inactive values stay visible and read-only', async ({ page, request }) => {
  const headers = await auth(request)
  const current = await layout(request, headers)
  const order = [`custom:${fixture.inactiveId}`, `custom:${fixture.customId}`, ...current.order.filter(key => !key.startsWith('custom:'))]
  expect((await request.put('/api/asset-field-layout', { headers, data: { order, version: 0 } })).ok()).toBeTruthy()
  await login(page, fixture.staffEmail, password)
  await page.goto(`/dashboard/assets/${fixture.assetId}`)
  await expect(page.getByRole('button', { name: 'Arrange fields', exact: true })).toHaveCount(0)
  await expect(page.locator('[aria-label="Asset profile values"] > [data-field-key]').first()).toContainText('Legacy value')
  await expect(page.getByText('Retired Identifier (inactive):', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await expect(page.getByLabel('Retired Identifier')).toHaveCount(0)
  await expect(page.locator('[aria-label="Asset profile fields"] > [data-field-key]').first()).toHaveAttribute('data-field-key', `custom:${fixture.customId}`)
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(page.getByText('Legacy value', { exact: true })).toBeVisible()
})

test('browser recovers from layout loading errors and stale admin edits without losing asset drafts', async ({ page, request }, testInfo) => {
  await login(page, fixture.email, password)
  const pattern = '**/api/asset-field-layout'
  await page.route(pattern, route => route.fulfill({ status: 500, json: { error: 'Test error' } }))
  await page.goto('/dashboard/assets/new')
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Unable to load company field layout')
  await expect(page.getByRole('button', { name: 'Create Asset', exact: true })).toBeDisabled()
  await page.unroute(pattern)
  await page.getByRole('button', { name: 'Retry layout', exact: true }).click()
  await page.getByLabel('Asset Name *').fill('Keep draft during conflict')
  await page.getByRole('button', { name: 'Arrange fields', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Arrange asset fields' })
  await dialog.getByRole('button', { name: 'Move Equipment ID down', exact: true }).click()
  const headers = await auth(request)
  const current = await layout(request, headers)
  expect((await request.put('/api/asset-field-layout', { headers, data: { order: nearTop(current), version: current.version } })).ok()).toBeTruthy()
  await dialog.getByRole('button', { name: 'Save field order', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('The layout changed')
  await dialog.getByRole('button', { name: 'Reload layout', exact: true }).click()
  await expect(dialog.getByRole('alert')).toHaveCount(0)
  await dialog.getByRole('button', { name: 'Move Equipment ID down', exact: true }).click()
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('asset-field-order-mobile-editor.png') })
  await page.keyboard.press('Escape')
  await expect(dialog).not.toBeVisible()
  await expect(page.getByLabel('Asset Name *')).toHaveValue('Keep draft during conflict')
})
