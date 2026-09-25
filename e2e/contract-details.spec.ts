import { expect, test, type APIRequestContext } from '@playwright/test'
import { createContractComplianceFixture, deleteFixtureCompany, closePrisma, type ContractComplianceFixture } from './helpers/test-data'
import { login } from './helpers/auth'

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
test.skip(process.env.CONTRACT_TEST_DB !== '1' || !url || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/fleetio_maintenance_verify', 'Requires disposable local database')
let fixture: ContractComplianceFixture
test.beforeEach(async () => { fixture = await createContractComplianceFixture() })
test.afterEach(async () => { if (fixture) await deleteFixtureCompany(fixture.companyId) })
test.afterAll(closePrisma)
async function auth(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', { data: fixture.user })
  expect(response.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await response.json()).token}` }
}

test('contract API validates edits, preserves zero, protects manual original and detects stale saves', async ({ request }) => {
  const headers = await auth(request), endpoint = `/api/contracts/${fixture.contractId}`
  const initial = await (await request.get(endpoint, { headers })).json()
  const update = await request.patch(endpoint, { headers, data: { updatedAt: initial.updatedAt, totalSum: 0, estimateAmount: 0, estimateReference: 'EST-42', title: 'Updated contract', description: 'Scope', startDate: '2026-01-01', endDate: '2026-04-01', retentionPercent: 5 } })
  expect(update.ok()).toBeTruthy()
  expect(await update.json()).toMatchObject({ totalSum: 0, estimateAmount: 0, estimateReference: 'EST-42', originalValueIsManual: true, retentionPercent: 5 })
  expect((await request.patch(endpoint, { headers, data: { updatedAt: initial.updatedAt, title: 'Stale' } })).status()).toBe(409)
  for (const data of [{ endDate: '2025-01-01' }, { retentionPercent: 101 }, { totalSum: -1 }, { startDate: '2026-02-30' }]) expect((await request.patch(endpoint, { headers, data })).status()).toBe(400)
  const item = await request.post(`${endpoint}/line-items`, { headers, data: { description: 'New scope', quantity: 1, unit: 'EA', unitPrice: 300 } })
  expect(item.status()).toBe(201)
  const itemId = (await item.json()).id
  expect((await request.patch(`${endpoint}/line-items/${itemId}`, { headers, data: { unitPrice: 500 } })).ok()).toBeTruthy()
  let summary = await (await request.get(`${endpoint}/summary`, { headers })).json()
  expect(summary.financials).toMatchObject({ originalContractValue: 0, estimateAmount: 0, currentContractValue: 0 })
  expect((await request.delete(`${endpoint}/line-items/${itemId}`, { headers })).ok()).toBeTruthy()
  expect((await request.patch(endpoint, { headers, data: { estimateAmount: null, endDate: null } })).ok()).toBeTruthy()
  summary = await (await request.get(`${endpoint}/summary`, { headers })).json()
  expect(summary.financials.estimateAmount).toBeNull()
  expect((await request.get(endpoint, { headers })).ok()).toBeTruthy()
})

test('contract editing is company-scoped and requires authentication', async ({ request }) => {
  expect((await request.patch(`/api/contracts/${fixture.contractId}`, { data: { title: 'Unauthenticated' } })).status()).toBe(401)
  const other = await createContractComplianceFixture()
  try {
    const headers = await auth(request)
    expect((await request.patch(`/api/contracts/${other.contractId}`, { headers, data: { totalSum: 0 } })).status()).toBe(404)
  } finally { await deleteFixtureCompany(other.companyId) }
})

test('edit contract covers dates, amounts, metadata and returns to project vendors', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)
  const back = page.getByRole('link', { name: /^Back to / })
  await expect(back).toHaveAttribute('href', `/dashboard/projects/${fixture.projectId}?tab=vendors`)
  await page.getByRole('button', { name: 'Edit Contract', exact: true }).click()
  const editor = page.getByRole('group', { name: 'Edit contract details' })
  await editor.getByLabel('Title', { exact: true }).fill('Reviewed contract')
  await editor.getByLabel('Original Contract Amount').fill('120000')
  await editor.getByLabel('Estimated Amount (optional)').fill('0')
  await editor.getByLabel('Estimate Reference').fill('EST-CLIENT')
  await editor.getByLabel('Start Date').fill('2026-03-07')
  await editor.getByLabel('End Date (optional)').fill('2026-03-09')
  await editor.getByLabel('Retention %').fill('5')
  await expect(editor.getByText('2 days', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Save Changes', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Reviewed contract' })).toBeVisible()
  await page.getByRole('button', { name: 'Edit Contract', exact: true }).click()
  await expect(editor.getByLabel('Estimated Amount (optional)')).toHaveValue('0')
  await expect(editor.getByLabel('Original Contract Amount')).toHaveValue('120000')
  await page.getByRole('button', { name: 'Cancel', exact: true }).click()
  await back.click()
  await expect(page).toHaveURL(new RegExp(`/dashboard/projects/${fixture.projectId}\\?tab=vendors`))
})

test('older payment preview uses only earlier paid retention and max cannot be overridden', async ({ page, request }) => {
  const headers = await auth(request), endpoint = `/api/contracts/${fixture.contractId}/payments`
  for (const [paymentDate, lessRetention] of [['2026-03-01', 1000], ['2026-07-01', 9000]] as const) {
    const response = await request.post(endpoint, { headers, data: { paymentDate, lessRetention, amountApproved: 100, acaAmountRequesting: 100, apStatus: 'PAID', pmStatus: 'APPROVED', maxPayment: -1 } })
    expect(response.status()).toBe(201)
    expect((await response.json()).maxPayment).toBe(90000)
  }
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)
  // May's seeded application sits between March and July in the descending grid.
  const rows = page.getByTestId('contract-payments').locator('tbody tr')
  await expect(rows).toHaveCount(3)
  await rows.nth(1).locator('button[title="Edit payment row"]').click()
  const dialog = page.getByRole('dialog', { name: 'Edit Payment Row' })
  await expect(dialog.locator('div').filter({ hasText: /^Previously Held Retention\$1,000\.00$/ }).first()).toBeVisible()
  await expect(dialog.locator('div').filter({ hasText: /^Max Payment\$90,000\.00$/ }).first()).toBeVisible()
  const saved = page.waitForResponse(response => response.request().method() === 'PATCH' && response.url().endsWith(`/payments/${fixture.paymentId}`))
  await dialog.getByRole('button', { name: 'Save Changes', exact: true }).click()
  const response = await saved
  expect(response.ok()).toBeTruthy()
  // Opening/saving an old row must not turn its saved 5,000 balance into 6,000.
  expect((await response.json()).currentRetention).toBe(5000)
})
