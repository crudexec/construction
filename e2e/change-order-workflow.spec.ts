import { expect, test, type APIRequestContext } from '@playwright/test'
import { createContractComplianceFixture, deleteFixtureCompany, closePrisma, type ContractComplianceFixture } from './helpers/test-data'
import { login } from './helpers/auth'

const database = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
test.skip(process.env.CHANGE_ORDER_TEST_DB !== '1' || !database || !['localhost', '127.0.0.1'].includes(database.hostname) || database.pathname !== '/change_order_workflow_verify', 'Requires the disposable change-order database')
let fixture: ContractComplianceFixture
let headers: Record<string, string>
let endpoint: string
test.beforeEach(async ({ request }) => {
  fixture = await createContractComplianceFixture()
  const response = await request.post('/api/auth/login', { data: fixture.user })
  expect(response.ok()).toBeTruthy()
  headers = { Authorization: `Bearer ${(await response.json()).token}` }
  endpoint = `/api/contracts/${fixture.contractId}/change-orders`
})
test.afterEach(async () => { if (fixture) await deleteFixtureCompany(fixture.companyId) })
test.afterAll(closePrisma)
const content = (unitPrice = 1000) => ({ title: 'Electrical scope', description: 'Add outlets', reason: 'Client request', lineItems: [{ description: 'Outlets', quantity: 2, unit: 'EA', unitPrice, notes: 'First floor' }] })
async function create(request: APIRequestContext, unitPrice = 1000) {
  const response = await request.post(endpoint, { headers, data: content(unitPrice) })
  expect(response.status(), await response.text()).toBe(201)
  return response.json()
}
async function patch(request: APIRequestContext, co: { id: string; version: number }, data: Record<string, unknown>) {
  const response = await request.patch(`${endpoint}/${co.id}`, { headers, data: { version: co.version, ...data } })
  expect(response.status(), await response.text()).toBe(200)
  return response.json()
}
async function currentValue(request: APIRequestContext) {
  const response = await request.get(`/api/contracts/${fixture.contractId}/summary`, { headers })
  expect(response.ok()).toBeTruthy()
  return (await response.json()).financials.currentContractValue
}

test('edits draft and pending content with credits, zero values, dated notes and before/after history', async ({ request }) => {
  let co = await create(request)
  expect(co.totalAmount).toBe(2000)
  expect(co.history[0]).toMatchObject({ action: 'Created', actorName: 'E2E Admin', before: null })
  const originalId = co.lineItems[0].id
  co = await patch(request, co, { action: 'edit', title: 'Revised scope', lineItems: [{ ...co.lineItems[0], unitPrice: -25 }] })
  expect(co.totalAmount).toBe(-50)
  expect(co.lineItems[0].id).toBe(originalId)
  expect(co.history[0]).toMatchObject({ action: 'Edited', before: { title: 'Electrical scope', totalAmount: 2000 }, after: { title: 'Revised scope', totalAmount: -50 } })
  co = await patch(request, co, { status: 'PENDING_APPROVAL' })
  co = await patch(request, co, { action: 'edit', lineItems: [{ ...co.lineItems[0], unitPrice: 0, notes: 'No additional charge', costCodeId: fixture.costCodeId }] })
  expect(co).toMatchObject({ status: 'PENDING_APPROVAL', totalAmount: 0 })
  co = await patch(request, co, { action: 'note', body: 'Confirmed with the client.\nKeep the original specification.' })
  expect(co.notes[0]).toMatchObject({ actorId: fixture.user.id, actorName: 'E2E Admin', body: 'Confirmed with the client.\nKeep the original specification.' })
  expect(Number.isNaN(Date.parse(co.notes[0].createdAt))).toBe(false)
  const loaded = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
  expect(loaded.notes).toEqual(co.notes)
  expect(await currentValue(request)).toBe(100000)
})

test('approved revisions preserve effective value until approval, then replace rather than add', async ({ request }) => {
  let co = await patch(request, await create(request), { status: 'APPROVED' })
  expect(await currentValue(request)).toBe(102000)
  co = await patch(request, co, { action: 'edit', title: 'Replacement scope', lineItems: [{ ...co.lineItems[0], unitPrice: 1500 }] })
  expect(co).toMatchObject({ status: 'APPROVED', totalAmount: 2000, title: 'Electrical scope', revisionNumber: 1, revisionStatus: 'DRAFT', proposedRevision: { totalAmount: 3000, title: 'Replacement scope' } })
  expect(await currentValue(request)).toBe(102000)
  const payment = await request.post(`/api/contracts/${fixture.contractId}/payments`, { headers, data: { paymentDate: '2026-09-29', amountApproved: 100, acaAmountRequesting: 100, apStatus: 'PROCESSING', pmStatus: 'APPROVED' } })
  expect(payment.status()).toBe(201)
  expect((await payment.json()).maxPayment).toBe(91800)
  expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { action: 'revision-status', version: co.version, status: 'APPROVED' } })).status()).toBe(400)
  co = await patch(request, co, { action: 'revision-status', status: 'PENDING_APPROVAL' })
  co = await patch(request, co, { action: 'revision-status', status: 'REJECTED', rejectionReason: 'Needs revised pricing' })
  expect(co.revisionStatus).toBe('REJECTED')
  expect(co.history[0].after.revisionRejectionReason).toBe('Needs revised pricing')
  expect(await currentValue(request)).toBe(102000)
  co = await patch(request, co, { action: 'edit', lineItems: [{ ...co.lineItems[0], unitPrice: -100 }] })
  expect(co.revisionStatus).toBe('DRAFT')
  co = await patch(request, co, { action: 'revision-status', status: 'PENDING_APPROVAL' })
  co = await patch(request, co, { action: 'revision-status', status: 'APPROVED' })
  expect(co).toMatchObject({ status: 'APPROVED', totalAmount: -200, proposedRevision: null, revisionStatus: null })
  expect(await currentValue(request)).toBe(99800)
  const nextPayment = await request.post(`/api/contracts/${fixture.contractId}/payments`, { headers, data: { paymentDate: '2026-09-30', amountApproved: 100, acaAmountRequesting: 100, apStatus: 'PROCESSING', pmStatus: 'APPROVED' } })
  expect(nextPayment.status()).toBe(201)
  expect((await nextPayment.json()).maxPayment).toBe(89820)
  expect(co.history[0]).toMatchObject({ action: 'Revision Approved', before: { totalAmount: 2000, proposedRevision: { totalAmount: -200 } }, after: { totalAmount: -200, proposedRevision: null } })
  co = await patch(request, co, { action: 'edit', title: 'Another revision' })
  expect(co.revisionNumber).toBe(2)
  co = await patch(request, co, { action: 'discard-revision' })
  expect(co.proposedRevision).toBeNull()
  expect(co.history[0].action).toBe('Revision discarded')
  expect(await currentValue(request)).toBe(99800)
})

test('rejects stale and simultaneous saves and prevents mixed edit/approval requests', async ({ request }) => {
  const co = await create(request)
  const results = await Promise.all(['First edit', 'Second edit'].map(title => request.patch(`${endpoint}/${co.id}`, { headers, data: { version: co.version, title } })))
  expect(results.map(r => r.status()).sort()).toEqual([200, 409])
  expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { version: co.version, status: 'APPROVED' } })).status()).toBe(409)
  const latest = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
  expect(latest.history).toHaveLength(2)
  expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { version: latest.version, title: 'Unreviewed change', status: 'APPROVED' } })).status()).toBe(400)
  expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { title: 'No version' } })).status()).toBe(409)
})

test('validates content, tenant access and cost codes without partial writes', async ({ request, playwright, baseURL }) => {
  const co = await create(request)
  const other = await createContractComplianceFixture()
  try {
    for (const data of [{ title: ' ' }, { lineItems: [{ description: 'Bad', quantity: -1, unit: 'EA', unitPrice: 1 }] }, { lineItems: [{ description: 'Bad', quantity: 1, unit: 'EA', unitPrice: '1' }] }, { lineItems: [{ description: 'Bad', quantity: 1e9, unit: 'EA', unitPrice: 1e12 }] }]) {
      expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { version: co.version, ...data } })).status()).toBe(400)
    }
    expect((await request.patch(`${endpoint}/${co.id}`, { headers, data: { version: co.version, lineItems: [{ ...co.lineItems[0], costCodeId: other.costCodeId }] } })).status()).toBe(404)
    const foreign = `/api/contracts/${other.contractId}/change-orders/${co.id}`
    expect((await request.get(foreign, { headers })).status()).toBe(404)
    expect((await request.patch(foreign, { headers, data: { action: 'note', body: 'Cross-company' } })).status()).toBe(404)
    const anonymous = await playwright.request.newContext({ baseURL })
    try {
      expect((await anonymous.get(`${endpoint}/${co.id}`)).status()).toBe(401)
      expect((await anonymous.patch(`${endpoint}/${co.id}`, { data: { action: 'note', body: 'Unauthenticated' } })).status()).toBe(401)
    } finally { await anonymous.dispose() }
    const latest = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
    expect(latest.version).toBe(co.version)
    expect(latest.history).toHaveLength(1)
  } finally { await deleteFixtureCompany(other.companyId) }
})

test('line-item APIs record history and cannot bypass approved revisions', async ({ request }) => {
  let co = await create(request)
  const originalId = co.lineItems[0].id
  const edit = await request.patch(`${endpoint}/${co.id}/line-items/${originalId}`, { headers, data: { version: co.version, unitPrice: 12.345, costCodeId: fixture.costCodeId } })
  expect(edit.ok()).toBeTruthy()
  expect(await edit.json()).toMatchObject({ id: originalId, unitPrice: 12.345, totalPrice: 24.69 })
  co = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
  expect(co.history[0].after.totalAmount).toBe(24.69)
  const add = await request.post(`${endpoint}/${co.id}/line-items`, { headers, data: { version: co.version, description: 'Credit', quantity: 1, unit: 'LS', unitPrice: -5 } })
  expect(add.status()).toBe(201)
  const extra = await add.json()
  co = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
  expect((await request.delete(`${endpoint}/${co.id}/line-items/${extra.id}?version=${co.version}`, { headers })).ok()).toBeTruthy()
  co = await (await request.get(`${endpoint}/${co.id}`, { headers })).json()
  co = await patch(request, co, { status: 'APPROVED' })
  expect((await request.patch(`${endpoint}/${co.id}/line-items/${originalId}`, { headers, data: { version: co.version, unitPrice: 9999 } })).status()).toBe(409)
  expect((await request.post(`${endpoint}/${co.id}/line-items`, { headers, data: { version: co.version, ...content().lineItems[0] } })).status()).toBe(409)
  expect((await request.delete(`${endpoint}/${co.id}/line-items/${originalId}?version=${co.version}`, { headers })).status()).toBe(409)
})

test('protects approved history against order and parent-contract deletion; draft deletion remains available', async ({ request }) => {
  let co = await patch(request, await create(request), { status: 'APPROVED' })
  co = await patch(request, co, { action: 'note', body: 'Approved record must remain' })
  expect((await request.delete(`${endpoint}/${co.id}?version=${co.version}`, { headers })).status()).toBe(409)
  expect((await request.delete(`/api/contracts/${fixture.contractId}`, { headers })).status()).toBe(409)
  expect((await request.get(`${endpoint}/${co.id}`, { headers })).ok()).toBeTruthy()
  const draft = await create(request)
  expect((await request.delete(`${endpoint}/${draft.id}?version=${draft.version}`, { headers })).ok()).toBeTruthy()
  expect((await request.get(`${endpoint}/${draft.id}`, { headers })).status()).toBe(404)
})

test('concurrent creation allocates distinct order numbers', async ({ request }) => {
  const [one, two] = await Promise.all([create(request), create(request)])
  expect([one.changeOrderNumber, two.changeOrderNumber].sort()).toEqual([1, 2])
})

test('browser creates, edits, notes, approval and revision history persist after refresh', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)
  const panel = page.getByTestId('contract-change-orders')
  await panel.getByRole('button', { name: 'Add CO', exact: true }).click()
  const createEditor = panel.getByRole('form', { name: 'Change order editor' })
  await createEditor.getByLabel('Title', { exact: true }).fill('Electrical scope')
  await createEditor.getByLabel('Description', { exact: true }).first().fill('Add outlets')
  await createEditor.getByLabel('Reason', { exact: true }).fill('Client request')
  const line = createEditor.getByRole('group', { name: 'Line item 1', exact: true })
  await line.getByLabel('Description', { exact: true }).fill('Outlets')
  await line.getByLabel('Quantity', { exact: true }).fill('2')
  await line.getByLabel('Unit price', { exact: true }).fill('1000')
  await line.getByLabel('Line notes', { exact: true }).fill('First floor')
  await createEditor.getByRole('button', { name: 'Save changes', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Change order 1', exact: true })
  await dialog.getByRole('button', { name: 'Edit change order', exact: true }).click()
  let editor = dialog.getByRole('form', { name: 'Change order editor' })
  await editor.getByLabel('Title', { exact: true }).fill('Client requested outlets')
  await editor.getByLabel('Unit price', { exact: true }).fill('1200')
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click()
  await expect(editor).not.toBeVisible()
  await dialog.getByLabel('New note').fill('Reviewed onsite with the client.')
  await dialog.getByRole('button', { name: 'Add note', exact: true }).click()
  await expect(dialog.getByRole('region', { name: 'Change order notes' }).getByText('Reviewed onsite with the client.')).toBeVisible()
  await dialog.getByRole('button', { name: 'Approve directly', exact: true }).click()
  await dialog.getByRole('button', { name: 'Create revision', exact: true }).click()
  editor = dialog.getByRole('form', { name: 'Change order editor' })
  await editor.getByLabel('Title', { exact: true }).fill('Revised approved scope')
  await editor.getByLabel('Unit price', { exact: true }).fill('1500')
  await editor.getByRole('button', { name: 'Save changes', exact: true }).click()
  const proposal = dialog.getByRole('region', { name: 'Proposed revision' })
  await expect(proposal).toContainText('The approved $2,400.00 remains')
  await dialog.getByRole('button', { name: 'Submit revision', exact: true }).click()
  await dialog.getByRole('button', { name: 'Approve revision', exact: true }).click()
  await expect(proposal).not.toBeVisible()
  await dialog.getByRole('region', { name: 'Update history' }).locator('summary').filter({ hasText: 'Revision Approved' }).click()
  await expect(dialog.getByRole('region', { name: 'Update history' })).toContainText('$2,400.00')
  await expect(dialog.getByRole('region', { name: 'Update history' })).toContainText('$3,000.00')
  await page.screenshot({ path: '/private/tmp/change-order-workflow-desktop.png', fullPage: false })
  await page.reload()
  await panel.getByRole('button', { name: 'CO #1 — Revised approved scope', exact: true }).click()
  await expect(dialog.getByRole('region', { name: 'Change order notes' })).toContainText('Reviewed onsite with the client.')
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(dialog).toBeVisible()
  expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth)).toBe(true)
  await page.screenshot({ path: '/private/tmp/change-order-workflow-mobile.png', fullPage: false })
})
