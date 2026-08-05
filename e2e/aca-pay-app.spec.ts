import { expect, test, type APIRequestContext, type Locator } from '@playwright/test'
import { login } from './helpers/auth'
import {
  closePrisma,
  createContractComplianceFixture,
  deleteFixtureCompany,
  type ContractComplianceFixture,
} from './helpers/test-data'

let fixture: ContractComplianceFixture

async function loginToken(request: APIRequestContext) {
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: fixture.user.email,
      password: fixture.user.password,
    },
  })
  expect(loginResponse.ok()).toBeTruthy()
  const body = await loginResponse.json()
  return body.token as string
}

function fieldByLabel(container: Locator, label: string) {
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  return container.locator('label', { hasText: new RegExp(`^${escapedLabel}$`) }).locator('xpath=..').locator('input, textarea, select')
}

test.beforeEach(async () => {
  fixture = await createContractComplianceFixture()
})

test.afterEach(async () => {
  await deleteFixtureCompany(fixture.companyId)
})

test.afterAll(async () => {
  await closePrisma()
})

test('persists ACA payment fields, cost-code allocations, and lien release reconciliation links', async ({ request }) => {
  const token = await loginToken(request)

  const createResponse = await request.post(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      billingPeriodDate: '2026-05-31',
      reference: 'E2E-PAY-ACA',
      submittedBy: 'E2E AP',
      amountComplete: 80_000,
      lessRetention: 8_000,
      subtotal: 72_000,
      currentBilling: 27_000,
      earlyPayDiscountPercent: 2,
      earlyPayDiscount: 540,
      amountRequesting: 26_460,
      acaAmountRequesting: 26_460,
      acaDiscrepancyNote: 'ACA amount reviewed against vendor request.',
      currentRetention: 8_000,
      maxPayment: 92_000,
      amountApproved: 26_460,
      pmStatus: 'APPROVED',
      apStatus: 'PROCESSING',
      expectedLienReleaseCount: 2,
      costAllocations: [
        {
          costCodeId: fixture.costCodeId,
          amount: 26_460,
          notes: 'ACA approved allocation',
        },
      ],
      lienReleaseIds: [fixture.approvedLienReleaseId, fixture.pendingLienReleaseId],
    },
  })

  expect(createResponse.status()).toBe(201)
  const created = await createResponse.json()
  expect(created.reference).toBe('E2E-PAY-ACA')
  expect(created.earlyPayDiscountPercent).toBe(2)
  expect(created.earlyPayDiscount).toBe(540)
  expect(created.acaAmountRequesting).toBe(26_460)
  expect(created.hasAcaDiscrepancy).toBe(false)
  expect(created.costAllocations).toHaveLength(1)
  expect(created.costAllocations[0]).toMatchObject({
    costCodeId: fixture.costCodeId,
    amount: 26_460,
    notes: 'ACA approved allocation',
  })
  expect(created.costAllocations[0].costCode).toMatchObject({
    id: fixture.costCodeId,
    name: 'E2E Pay App Cost Code',
  })
  expect(created.lienReleaseLinks).toHaveLength(2)
  expect(created.lienReleaseLinks.map((link: { lienReleaseId: string }) => link.lienReleaseId).sort()).toEqual(
    [fixture.approvedLienReleaseId, fixture.pendingLienReleaseId].sort()
  )

  const listResponse = await request.get(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(listResponse.ok()).toBeTruthy()
  const payments = await listResponse.json()
  const saved = payments.find((payment: { id: string }) => payment.id === created.id)
  expect(saved).toBeTruthy()
  expect(saved).toMatchObject({
    reference: 'E2E-PAY-ACA',
    earlyPayDiscountPercent: 2,
    earlyPayDiscount: 540,
    acaAmountRequesting: 26_460,
    hasAcaDiscrepancy: false,
  })
  expect(saved.costAllocations).toHaveLength(1)
  expect(saved.lienReleaseLinks).toHaveLength(2)
})

test('lets AP clear an ACA discrepancy before marking a payment paid', async ({ request }) => {
  const token = await loginToken(request)

  const createResponse = await request.post(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      billingPeriodDate: '2026-05-31',
      reference: 'E2E-PAY-DISCREPANCY',
      amountRequesting: 10_000,
      acaAmountRequesting: 9_500,
      acaDiscrepancyNote: 'Vendor request differs from ACA approved amount.',
      amountApproved: 10_000,
      expectedLienReleaseCount: 0,
      pmStatus: 'APPROVED',
      apStatus: 'PROCESSING',
    },
  })
  expect(createResponse.status()).toBe(201)
  const created = await createResponse.json()
  expect(created.hasAcaDiscrepancy).toBe(true)

  const paidWhileDiscrepantResponse = await request.patch(`/api/contracts/${fixture.contractId}/payments/${created.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      billingPeriodDate: '2026-05-31',
      reference: 'E2E-PAY-DISCREPANCY',
      amountRequesting: 10_000,
      acaAmountRequesting: 9_500,
      acaDiscrepancyNote: 'Vendor request differs from ACA approved amount.',
      amountApproved: 10_000,
      expectedLienReleaseCount: 0,
      pmStatus: 'APPROVED',
      apStatus: 'PAID',
    },
  })
  expect(paidWhileDiscrepantResponse.status()).toBe(400)
  await expect(paidWhileDiscrepantResponse.json()).resolves.toEqual({
    error: 'AP status cannot be set to Paid while Amount Approved differs from ACA Amount Requesting',
  })

  const clearDiscrepancyResponse = await request.patch(`/api/contracts/${fixture.contractId}/payments/${created.id}`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      billingPeriodDate: '2026-05-31',
      reference: 'E2E-PAY-DISCREPANCY',
      amountRequesting: 10_000,
      acaAmountRequesting: 10_000,
      acaDiscrepancyNote: 'AP updated ACA amount to match approved amount.',
      amountApproved: 10_000,
      expectedLienReleaseCount: 0,
      pmStatus: 'APPROVED',
      apStatus: 'PAID',
    },
  })
  expect(clearDiscrepancyResponse.ok()).toBeTruthy()
  const updated = await clearDiscrepancyResponse.json()
  expect(updated).toMatchObject({
    acaAmountRequesting: 10_000,
    amountApproved: 10_000,
    hasAcaDiscrepancy: false,
    apStatus: 'PAID',
  })
})

test('rejects approved payment allocations that reference cost codes outside the company', async ({ request }) => {
  const token = await loginToken(request)

  const response = await request.post(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      reference: 'E2E-PAY-BAD-COST-CODE',
      amountRequesting: 5_000,
      acaAmountRequesting: 5_000,
      amountApproved: 5_000,
      expectedLienReleaseCount: 0,
      pmStatus: 'APPROVED',
      apStatus: 'PROCESSING',
      costAllocations: [
        {
          costCodeId: 'missing-cost-code',
          amount: 5_000,
        },
      ],
    },
  })

  expect(response.status()).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'One or more cost codes were not found',
  })
})

test('uses the computed max payment consistently in the grid and modal', async ({ page, request }) => {
  const token = await loginToken(request)
  const createResponse = await request.post(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
    data: {
      paymentDate: '2026-07-01',
      billingPeriodDate: '2026-06-30',
      submittedBy: 'E2E Max Check',
      amountComplete: 20_000,
      lessRetention: 2_000,
      subtotal: 18_000,
      currentBilling: 18_000,
      amountRequesting: 18_000,
      acaAmountRequesting: 18_000,
      amountApproved: 18_000,
      maxPayment: -12_345,
      expectedLienReleaseCount: 0,
      pmStatus: 'PENDING',
      apStatus: 'PROCESSING',
    },
  })
  expect(createResponse.status()).toBe(201)

  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)

  const payments = page.getByTestId('contract-payments')
  const row = payments.locator('tr', { hasText: 'E2E Max Check' }).first()
  await expect(row.locator('td').nth(17)).toHaveText('$18,000.00')

  await row.locator('button[title="Edit payment row"]').click()
  const dialog = page.getByRole('dialog', { name: 'Edit Payment Row' })
  await expect(dialog.locator('div').filter({ hasText: /^Max Payment\$18,000\.00$/ }).first()).toBeVisible()
})

test('shows ACA workflow fields in the payment grid and detail modal', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)

  const payments = page.getByTestId('contract-payments')
  await expect(payments).toContainText('Gross PTD')
  await expect(payments).toContainText('Net PTD')
  await expect(payments).toContainText('Current Retention Held')
  await expect(payments).toContainText('Early Pay Discount')
  await expect(payments).toContainText('ACA Amount Requesting')
  await expect(payments).toContainText('Discrepancy')
  await expect(payments).toContainText('Lien Releases')
  await expect(payments).toContainText('Release Docs')
  await expect(payments).toContainText('Cost Codes')
  await expect(payments.getByRole('button', { name: 'Void Request' })).toHaveCount(0)
  await expect(payments.getByRole('button', { name: 'Delete Row' })).toHaveCount(0)

  await payments.locator('button[title="Edit payment row"]').first().click()
  const dialog = page.getByRole('dialog', { name: 'Edit Payment Row' })

  await expect(dialog).toContainText('Early Pay Discount %')
  await expect(dialog).toContainText('Early Pay Discount $')
  await expect(dialog).toContainText('ACA Amount Requesting')
  await expect(dialog).toContainText('Lien Release Reconciliation')
  await expect(dialog).toContainText('Approved Amount Cost Codes')
  await expect(dialog).toContainText('Net PTD Preview')
  await expect(dialog).toContainText('Gross PTD Preview')
  await expect(dialog).not.toContainText('Paid to Date Preview')
  await expect(fieldByLabel(dialog, 'Conditional')).toHaveCount(0)
  await expect(fieldByLabel(dialog, 'Unconditional')).toHaveCount(0)
  await expect(dialog.getByText('Conditional Lien Release', { exact: true })).toHaveCount(0)
  await expect(dialog.getByText('Unconditional Lien Release', { exact: true })).toHaveCount(0)
  await fieldByLabel(dialog, 'Current Billing').fill('45000')
  await fieldByLabel(dialog, 'Early Pay Discount %').fill('5')
  await expect(fieldByLabel(dialog, 'Early Pay Discount $')).toHaveValue('2250')
  await fieldByLabel(dialog, 'Current Billing').fill('0')
  await fieldByLabel(dialog, 'Amount Requesting').fill('10000')
  await fieldByLabel(dialog, 'Early Pay Discount %').fill('5')
  await expect(fieldByLabel(dialog, 'Early Pay Discount $')).toHaveValue('500')
  await expect(dialog.getByRole('button', { name: 'Void Request' })).toBeVisible()
  await expect(dialog.getByRole('button', { name: 'Delete Row' })).toBeVisible()
})

test('creates and updates an ACA payment row through the browser workflow', async ({ page, request }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)

  const payments = page.getByTestId('contract-payments')
  await payments.getByRole('button', { name: 'Add' }).click()

  const dialog = page.getByRole('dialog', { name: 'Add Payment Row' })
  await expect(dialog).toBeVisible()

  await fieldByLabel(dialog, 'Submitted By').fill('E2E AP UI')
  await fieldByLabel(dialog, 'Amount Complete').fill('70000')
  await fieldByLabel(dialog, 'Current Billing').fill('25000')
  await fieldByLabel(dialog, 'Early Pay Discount %').fill('2')
  await expect(fieldByLabel(dialog, 'Early Pay Discount $')).toHaveValue('500')
  await expect(fieldByLabel(dialog, 'Amount Requesting')).toHaveValue('24500')
  await fieldByLabel(dialog, 'Amount Approved').fill('24000')

  await expect(fieldByLabel(dialog, 'AP Status').locator('option[value="PAID"]')).toBeDisabled()
  await expect(dialog.getByRole('button', { name: 'Create Row' })).toBeEnabled()
  await expect(dialog).toContainText('AP status is blocked from Paid')

  await dialog.getByRole('button', { name: 'Discrepancy' }).click()
  await expect(dialog.getByRole('button', { name: 'Discrepancy Active' })).toBeVisible()
  await expect(fieldByLabel(dialog, 'ACA Amount Requesting')).toHaveValue('24500')
  await fieldByLabel(dialog, 'ACA Amount Requesting').fill('24000')
  await expect(dialog).not.toContainText('AP status is blocked from Paid')
  await fieldByLabel(dialog, 'AP Status').selectOption('PAID')

  await dialog.getByRole('checkbox').first().check()
  await dialog.getByRole('checkbox').nth(1).check()

  await dialog.getByRole('button', { name: 'Add Allocation' }).click()
  await dialog.locator('select').last().selectOption(fixture.costCodeId)
  await dialog.locator('input[placeholder="Amount"]').fill('24000')
  await dialog.locator('input[placeholder="Notes"]').fill('UI allocation saved')

  await dialog.getByRole('button', { name: 'Create Row' }).click()
  await expect(page.getByRole('dialog', { name: 'Add Payment Row' })).toHaveCount(0)
  await expect(payments).toContainText('E2E AP UI')
  await expect(payments).toContainText('$500')
  await expect(payments).toContainText('$24,000')
  await expect(payments).toContainText('1 / $24,000')
  await expect(payments).toContainText('1/2')
  await expect(payments).toContainText('0/2')
  await expect(payments).toContainText('PAID')

  const token = await loginToken(request)
  const listResponse = await request.get(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${token}`,
    },
  })
  expect(listResponse.ok()).toBeTruthy()
  const createdPayment = (await listResponse.json()).find((payment: { submittedBy?: string | null }) => payment.submittedBy === 'E2E AP UI')
  expect(createdPayment).toMatchObject({
    currentBilling: 25_000,
    earlyPayDiscountPercent: 2,
    earlyPayDiscount: 500,
    amountRequesting: 24_500,
    acaAmountRequesting: 24_000,
    amountApproved: 24_000,
    hasAcaDiscrepancy: false,
    apStatus: 'PAID',
  })
  expect(createdPayment.costAllocations).toHaveLength(1)
  expect(createdPayment.lienReleaseLinks).toHaveLength(2)

  await payments.locator('tr', { hasText: 'E2E AP UI' }).locator('button[title="Edit payment row"]').click()
  const editDialog = page.getByRole('dialog', { name: 'Edit Payment Row' })
  await expect(fieldByLabel(editDialog, 'ACA Amount Requesting')).toHaveValue('24000')
  await expect(fieldByLabel(editDialog, 'AP Status')).toHaveValue('PAID')
  await expect(editDialog).toContainText('Approved 1 of 2 linked/expected releases')
  await expect(editDialog).toContainText('Release Documents Uploaded')
  await expect(editDialog).toContainText('0/2')
  await expect(editDialog.locator('select').last()).toHaveValue(fixture.costCodeId)
  await expect(editDialog.locator('input[placeholder="Amount"]')).toHaveValue('24000')
  await expect(editDialog.locator('input[placeholder="Notes"]')).toHaveValue('UI allocation saved')
})
