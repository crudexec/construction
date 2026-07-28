import { expect, test } from '@playwright/test'
import {
  closePrisma,
  createContractComplianceFixture,
  deleteFixtureCompany,
  type ContractComplianceFixture,
} from './helpers/test-data'
import { login } from './helpers/auth'

let fixture: ContractComplianceFixture

test.beforeEach(async () => {
  fixture = await createContractComplianceFixture()
})

test.afterEach(async () => {
  await deleteFixtureCompany(fixture.companyId)
})

test.afterAll(async () => {
  await closePrisma()
})

test('shows lien release compliance blockers and exports the spreadsheet grid', async ({ page }) => {
  await login(page, fixture.user.email, fixture.user.password)
  await page.goto(`/dashboard/vendors/${fixture.vendorId}/contracts/${fixture.contractId}`)

  const compliance = page.getByTestId('lien-release-compliance')
  await expect(compliance).toContainText('Expected Releases')
  await expect(compliance).toContainText('Approved Releases')
  await expect(compliance).toContainText('Missing / Unfinished')
  await expect(compliance).toContainText('Blocked Rows')
  await expect(compliance).toContainText('E2E-PAY-001')
  await expect(compliance).toContainText('1/2')
  await expect(compliance).toContainText('1 missing/unfinished release')
  await expect(compliance).toContainText('E2E Conditional April Release')
  await expect(compliance).toContainText('E2E Unconditional April Release')

  await compliance.getByRole('button', { name: 'MISSING' }).click()
  await expect(compliance).toContainText('E2E-PAY-001')

  const downloadPromise = page.waitForEvent('download')
  await compliance.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toBe(`${fixture.contractNumber}-lien-release-compliance.csv`)

  const stream = await download.createReadStream()
  const chunks: Buffer[] = []
  await new Promise<void>((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)))
    stream.on('end', resolve)
    stream.on('error', reject)
  })
  const csv = Buffer.concat(chunks).toString('utf8')
  expect(csv).toContain('Project')
  expect(csv).toContain('Vendor/Subtier')
  expect(csv).toContain('E2E-PAY-001')
  expect(csv).toContain('1 missing/unfinished release')
})

test('blocks paid AP status when ACA amount differs from approved amount', async ({ request }) => {
  const loginResponse = await request.post('/api/auth/login', {
    data: {
      email: fixture.user.email,
      password: fixture.user.password,
    },
  })
  expect(loginResponse.ok()).toBeTruthy()
  const loginBody = await loginResponse.json()

  const response = await request.post(`/api/contracts/${fixture.contractId}/payments`, {
    headers: {
      Authorization: `Bearer ${loginBody.token}`,
    },
    data: {
      paymentDate: '2026-06-01',
      billingPeriodDate: '2026-05-31',
      reference: 'E2E-PAY-BLOCKED',
      amountRequesting: 10_000,
      acaAmountRequesting: 9_500,
      amountApproved: 10_000,
      expectedLienReleaseCount: 0,
      pmStatus: 'APPROVED',
      apStatus: 'PAID',
    },
  })

  expect(response.status()).toBe(400)
  await expect(response.json()).resolves.toEqual({
    error: 'AP status cannot be set to Paid while Amount Approved differs from ACA Amount Requesting',
  })
})
