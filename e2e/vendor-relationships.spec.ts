import { expect, test, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { createContractComplianceFixture, deleteFixtureCompany, closePrisma, type ContractComplianceFixture } from './helpers/test-data'
import { login } from './helpers/auth'

const url = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL) : null
test.skip(process.env.VENDOR_TEST_DB !== '1' || !url || !['127.0.0.1', 'localhost'].includes(url.hostname) || url.pathname !== '/fleetio_maintenance_verify', 'Disposable local database only')
const db = new PrismaClient()
let fixture: ContractComplianceFixture
let destination: { id: string; companyName: string }
test.beforeEach(async () => {
  fixture = await createContractComplianceFixture()
  destination = await db.vendor.create({ data: { companyId: fixture.companyId, name: 'Destination', companyName: 'Destination Company' }, select: { id: true, companyName: true } })
})
test.afterEach(async () => { if (fixture) await deleteFixtureCompany(fixture.companyId) })
test.afterAll(async () => { await closePrisma(); await db.$disconnect() })
async function auth(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', { data: fixture.user })
  expect(response.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await response.json()).token}` }
}

test('contact moves preserve identity, comments and historic milestone vendor; primary updates serialize', async ({ request }) => {
  const headers = await auth(request), endpoint = `/api/vendors/${fixture.vendorId}/contacts`
  const created = await request.post(endpoint, { headers, data: { firstName: 'Alex', lastName: 'Contact', email: 'alex@example.com', notes: 'Original note', isPrimary: true, isBilling: true } })
  expect(created.status()).toBe(201)
  const contact = await created.json()
  const comment = await db.vendorContactComment.create({ data: { contactId: contact.id, authorId: fixture.user.id, content: 'History stays with person' } })
  const milestone = await db.projectMilestone.create({ data: { projectId: fixture.projectId, vendorId: fixture.vendorId, assignedContactId: contact.id, createdById: fixture.user.id, title: 'Historical responsibility' } })
  await db.vendorContact.create({ data: { vendorId: destination.id, firstName: 'Existing', lastName: 'Primary', isPrimary: true } })
  const moved = await request.put(`${endpoint}/${contact.id}`, { headers, data: { destinationVendorId: destination.id, updatedAt: contact.updatedAt } })
  expect(moved.ok()).toBeTruthy()
  expect(await moved.json()).toMatchObject({ id: contact.id, vendorId: destination.id, notes: 'Original note', isPrimary: false, isBilling: false })
  expect((await db.vendorContactComment.findUniqueOrThrow({ where: { id: comment.id } })).contactId).toBe(contact.id)
  expect(await db.projectMilestone.findUnique({ where: { id: milestone.id } })).toMatchObject({ vendorId: fixture.vendorId, assignedContactId: contact.id })
  expect((await request.get(`${endpoint}/${contact.id}`, { headers })).status()).toBe(404)
  expect((await request.get(`/api/vendors/${destination.id}/contacts/${contact.id}`, { headers })).ok()).toBeTruthy()
  const responses = await Promise.all(['First', 'Second'].map(firstName => request.post(endpoint, { headers, data: { firstName, lastName: 'Primary', isPrimary: true } })))
  expect(responses.map(r => r.status())).toEqual([201, 201])
  expect(await db.vendorContact.count({ where: { vendorId: fixture.vendorId, isPrimary: true } })).toBe(1)
  const invalid = await request.post(endpoint, { headers, data: { firstName: '', lastName: 'Invalid', isPrimary: true } })
  expect(invalid.status()).toBe(400)
  expect(await db.vendorContact.count({ where: { vendorId: fixture.vendorId, isPrimary: true } })).toBe(1)
})

test('relationship endpoints reject cross-company access and return only safe vendor choices', async ({ request }) => {
  const other = await createContractComplianceFixture()
  try {
    const headers = await auth(request)
    const created = await request.post(`/api/vendors/${fixture.vendorId}/contacts`, { headers, data: { firstName: 'Test', lastName: 'Person' } })
    const contact = await created.json()
    expect((await request.put(`/api/vendors/${fixture.vendorId}/contacts/${contact.id}`, { headers, data: { destinationVendorId: other.vendorId } })).status()).toBe(404)
    expect((await request.post(`/api/vendors/${fixture.vendorId}/suppliers`, { headers, data: { linkedVendorId: other.vendorId } })).status()).toBe(404)
    expect((await request.post(`/api/vendors/${other.vendorId}/contacts`, { headers, data: { firstName: 'X', lastName: 'Y' } })).status()).toBe(404)
    expect((await request.get('/api/vendors/options')).status()).toBe(401)
    const options = await (await request.get('/api/vendors/options', { headers })).json()
    expect(options.some((v: { id: string }) => v.id === other.vendorId)).toBe(false)
    expect(Object.keys(options[0]).sort()).toEqual(['companyName', 'id', 'name'])
  } finally { await deleteFixtureCompany(other.companyId) }
})

test('supplier creation is atomic, creates no login, checks duplicates and reuses existing links', async ({ request }) => {
  const headers = await auth(request), endpoint = `/api/vendors/${fixture.vendorId}/suppliers`
  const usersBefore = await db.user.count({ where: { companyId: fixture.companyId } })
  const before = await db.vendor.count({ where: { companyId: fixture.companyId } })
  expect((await request.post(endpoint, { headers, data: { name: 'Should rollback', contractId: 'missing' } })).status()).toBe(404)
  expect(await db.vendor.count({ where: { companyId: fixture.companyId } })).toBe(before)
  const response = await request.post(endpoint, { headers, data: { name: 'New Supply Company', phone: '555-0110', contractId: fixture.contractId } })
  expect(response.status()).toBe(201)
  const supplier = await response.json()
  const linked = await db.vendor.findUniqueOrThrow({ where: { id: supplier.linkedVendorId } })
  expect(linked).toMatchObject({ companyName: 'New Supply Company', companyId: fixture.companyId, portalEmail: null, portalPassword: null, portalToken: null })
  expect(await db.user.count({ where: { companyId: fixture.companyId } })).toBe(usersBefore)
  expect(await db.contractSupplier.count({ where: { contractId: fixture.contractId, vendorSupplierId: supplier.id } })).toBe(1)
  expect((await request.post(endpoint, { headers, data: { name: 'new supply company' } })).status()).toBe(409)
  const reused = await request.post(endpoint, { headers, data: { linkedVendorId: linked.id, contractId: fixture.contractId } })
  expect((await reused.json()).id).toBe(supplier.id)
  expect(await db.vendor.count({ where: { companyId: fixture.companyId } })).toBe(before + 1)
  expect((await request.delete(`${endpoint}?supplierId=${supplier.id}`, { headers })).status()).toBe(409)
  expect((await request.post(endpoint, { headers, data: { linkedVendorId: fixture.vendorId } })).status()).toBe(400)
})

test('linking a legacy supplier preserves existing contract and lien-release references', async ({ request }) => {
  const headers = await auth(request)
  const legacy = await db.vendorSupplier.findFirstOrThrow({ where: { vendorId: fixture.vendorId } })
  const releases = await db.lienRelease.findMany({ where: { vendorSupplierId: legacy.id }, select: { id: true, vendorSupplierId: true, contractId: true } })
  const response = await request.post(`/api/vendors/${fixture.vendorId}/suppliers`, { headers, data: { supplierId: legacy.id, linkedVendorId: destination.id } })
  expect(response.ok()).toBeTruthy()
  expect(await response.json()).toMatchObject({ id: legacy.id, name: legacy.name, linkedVendorId: destination.id })
  expect(await db.lienRelease.findMany({ where: { vendorSupplierId: legacy.id }, select: { id: true, vendorSupplierId: true, contractId: true } })).toEqual(releases)
  expect((await request.delete(`/api/contracts/${fixture.contractId}/suppliers?supplierId=${legacy.id}`, { headers })).status()).toBe(409)
})

test('browser adds, opens, edits and moves a company contact', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}?tab=contacts`)
  await page.getByRole('button', { name: 'Add Contact', exact: true }).click()
  let dialog = page.getByRole('dialog', { name: 'Add Contact', exact: true })
  await dialog.getByLabel('First name').fill('Alex')
  await dialog.getByLabel('Last name').fill('Tester')
  await dialog.getByLabel('Email', { exact: true }).fill('alex@example.com')
  await dialog.getByLabel('Notes', { exact: true }).fill('Preserve these notes')
  await dialog.getByLabel('Primary contact', { exact: true }).check()
  await dialog.getByRole('button', { name: 'Save Contact' }).click()
  dialog = page.getByRole('dialog', { name: 'Contact Details' })
  await expect(dialog.getByText('alex@example.com', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Edit Contact', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Edit Contact' })
  await dialog.getByLabel('Title / position').fill('Operations')
  await dialog.getByRole('button', { name: 'Save Contact' }).click()
  dialog = page.getByRole('dialog', { name: 'Contact Details' })
  await expect(dialog.getByText('Operations', { exact: true })).toBeVisible()
  await dialog.getByRole('button', { name: 'Move Contact', exact: true }).click()
  dialog = page.getByRole('dialog', { name: 'Move Contact' })
  await dialog.getByLabel('Destination company').selectOption(destination.id)
  await dialog.getByRole('button', { name: 'Confirm Move' }).click()
  await expect(dialog).not.toBeVisible()
  await expect(page.getByRole('button', { name: 'Alex Tester', exact: true })).toHaveCount(0)
  await page.goto(`/dashboard/vendors/${destination.id}?tab=contacts`)
  await page.getByRole('button', { name: 'Alex Tester', exact: true }).click()
  await expect(page.getByRole('dialog').getByText('Preserve these notes')).toBeVisible()
})

test('browser creates a supplier company and shows its clickable vendor link', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}`)
  const suppliers = page.getByRole('region', { name: 'Suppliers and subtiers' })
  await suppliers.getByRole('button', { name: 'Add Supplier', exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Supplier vendor company' })
  await dialog.getByLabel('Company choice').selectOption('new')
  await dialog.getByLabel('Company name').fill('Browser Supplier')
  await dialog.getByRole('button', { name: 'Add Supplier', exact: true }).click()
  await expect(dialog).not.toBeVisible()
  const link = suppliers.getByRole('link', { name: 'Browser Supplier', exact: true })
  await expect(link).toBeVisible()
  const href = await link.getAttribute('href')
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
})

test('contract summaries include approved value, zero estimate, retention and job navigation', async ({ page }) => {
  await db.vendorContract.update({ where: { id: fixture.contractId }, data: { title: 'Dashboard Contract', estimateAmount: 0, estimateReference: 'EST-ZERO' } })
  await db.changeOrder.create({ data: { contractId: fixture.contractId, changeOrderNumber: 1, title: 'Approved addition', totalAmount: 20000, status: 'APPROVED', createdById: fixture.user.id } })
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}?tab=contracts`)
  const card = page.getByRole('article').filter({ hasText: 'Dashboard Contract' })
  await expect(card.getByText('$120,000.00', { exact: true })).toBeVisible()
  await expect(card.getByText('10% · $12,000.00', { exact: true })).toBeVisible()
  await expect(card.getByText('$0.00', { exact: true })).toBeVisible()
  await expect(card.getByText('EST-ZERO', { exact: true })).toBeVisible()
  await expect(card.locator(`a[href="/dashboard/projects/${fixture.projectId}?tab=vendors"]`)).toBeVisible()
  await card.getByRole('link', { name: /Dashboard Contract/ }).click()
  await expect(page.getByText('10% · $12,000.00', { exact: true })).toBeVisible()
})

test('contract supplier picker links an existing company and creates a new company', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)
  const suppliers = page.locator('div.bg-white').filter({ has: page.getByRole('heading', { name: 'Subtiers / Suppliers', exact: true }) }).last()
  for (const existing of [true, false]) {
    await suppliers.getByRole('button', { name: 'Add', exact: true }).click()
    await page.getByRole('button', { name: 'New supplier', exact: true }).click()
    const dialog = page.getByRole('dialog', { name: 'Supplier vendor company' })
    if (existing) {
      // A possible duplicate can be selected instead of creating another company.
      await dialog.getByLabel('Company choice').selectOption('new')
      await dialog.getByLabel('Company name').fill('Destination')
      await dialog.getByRole('button', { name: 'Destination Company', exact: true }).click()
      await expect(dialog.getByRole('combobox', { name: 'Vendor company', exact: true })).toHaveValue(destination.id)
    } else {
      await dialog.getByLabel('Company choice').selectOption('new')
      await dialog.getByLabel('Company name').fill('Contract New Supplier')
    }
    await dialog.getByRole('button', { name: 'Add Supplier', exact: true }).click()
    await expect(dialog).not.toBeVisible()
    const name = existing ? destination.companyName : 'Contract New Supplier'
    await expect(suppliers.getByRole('link', { name, exact: true })).toBeVisible()
  }
  expect(await db.vendor.count({ where: { companyId: fixture.companyId, companyName: destination.companyName } })).toBe(1)
  const link = suppliers.getByRole('link', { name: 'Contract New Supplier', exact: true })
  const href = await link.getAttribute('href')
  await link.click()
  await expect(page).toHaveURL(new RegExp(`${href}$`))
})
