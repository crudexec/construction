import { expect, test } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomBytes, createHash } from 'node:crypto'
import fs from 'node:fs'
import path from 'node:path'
import jwt from 'jsonwebtoken'

const databaseUrl = process.env.REVIEW_TEST_DATABASE_URL
test.skip(!databaseUrl || !['127.0.0.1', 'localhost'].includes(new URL(databaseUrl).hostname), 'Requires a disposable local database')
const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl || 'postgresql://invalid@127.0.0.1:1/invalid' } } })
let companyId: string
test.beforeAll(async () => { companyId = (await prisma.company.create({ data: { name: 'Review browser test' } })).id })
test.afterAll(async () => { if (companyId) await prisma.company.delete({ where: { id: companyId } }); await prisma.$disconnect() })
async function fixture() {
  const token = randomBytes(32).toString('hex')
  const batch = await prisma.assetImportReview.create({ data: {
    companyId, title: 'Asset import review', tokenHash: createHash('sha256').update(token).digest('hex'), sourceDigest: token,
    expiresAt: new Date(Date.now() + 86400000), choices: { assets: [{ value: 'asset-one', label: 'EX1 · Excavator' }] },
    rows: { create: [
      { position: 0, sourceFile: 'issues', sourceRow: 2, kind: 'issue', title: 'EX1 · Hydraulic leak', reason: 'Choose the exact asset.', context: [{ label: 'Asset', value: 'EX1' }], fields: [{ key: 'assetId', label: 'Correct asset', type: 'select', choiceKey: 'assets', initial: '', required: true }], source: {} },
      { position: 1, sourceFile: 'contacts', sourceRow: 3, kind: 'contact', title: 'Guest User', reason: 'Confirm or exclude this generic contact.', context: [{ label: 'Name', value: 'Guest User' }], fields: [], source: {} },
    ] },
  }, include: { rows: { orderBy: { position: 'asc' } } } })
  return { token, batch }
}

test('guest can correct, save, reload, exclude and submit without changing live assets', async ({ page }) => {
  const { token, batch } = await fixture()
  await page.goto(`/import-review/${token}`)
  await expect(page.getByRole('heading', { name: 'Asset import review' })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Submit review', exact: true })).toBeDisabled()
  await page.getByLabel('Your name', { exact: true }).fill('Brian Deller')
  await page.getByLabel('Use these corrections', { exact: true }).check()
  await page.getByRole('button', { name: 'Save response', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Correct asset is required')
  await page.getByLabel('Correct asset', { exact: false }).selectOption('asset-one')
  await page.getByRole('button', { name: 'Save response', exact: true }).click()
  await expect(page.getByText('Response saved.', { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Guest User', exact: true })).toBeVisible()
  await expect(page.getByText('1 of 2 reviewed', { exact: false })).toBeVisible()
  await page.getByLabel('Your name', { exact: true }).fill('Brian Deller')
  await page.getByLabel('Exclude this row', { exact: true }).check()
  await page.getByLabel('Why should this row be excluded?', { exact: false }).fill('Generic account, not a person.')
  await page.getByRole('button', { name: 'Save & next', exact: true }).click()
  await expect(page.getByText('2 of 2 reviewed', { exact: false })).toBeVisible()
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Submit review', exact: true }).click()
  await expect(page.getByText('Thank you. Your answers have been submitted', { exact: false })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Save response', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(page.getByText('Submitted by Brian Deller')).toBeVisible()
  expect(await prisma.asset.count({ where: { companyId } })).toBe(0)
  expect(await prisma.assetImportReviewEvent.count({ where: { reviewId: batch.id } })).toBe(3)
})

test('failed save keeps corrections and retry works; revocation removes access', async ({ page }) => {
  const { token, batch } = await fixture()
  await page.goto(`/import-review/${token}`)
  await page.getByLabel('Your name', { exact: true }).fill('Reviewer')
  await page.getByLabel('I need help', { exact: true }).check()
  await page.getByLabel('What do you need help with?', { exact: false }).fill('Is this EX1 or EX2?')
  await page.route(`**/api/shared/import-review/${token}`, async route => {
    if (route.request().method() === 'POST') await route.fulfill({ status: 503, json: { error: 'Temporary save failure. Try again.' } })
    else await route.continue()
  })
  await page.getByRole('button', { name: 'Save response', exact: true }).click()
  await expect(page.getByRole('main').getByRole('alert')).toContainText('Temporary save failure')
  await expect(page.getByLabel('What do you need help with?', { exact: false })).toHaveValue('Is this EX1 or EX2?')
  await page.unroute(`**/api/shared/import-review/${token}`)
  await page.getByRole('button', { name: 'Save response', exact: true }).click()
  await expect(page.getByText('Response saved.', { exact: true })).toBeVisible()
  await prisma.assetImportReview.update({ where: { id: batch.id }, data: { revokedAt: new Date() } })
  await page.reload()
  await expect(page.getByRole('heading', { name: 'Review unavailable' })).toBeVisible()
  await expect(page.getByText('Hydraulic leak', { exact: false })).toHaveCount(0)
})

for (const width of [1440, 390]) {
  test(`all 67 rows and the correction forms fit at ${width}px`, async ({ page }, testInfo) => {
    const info = JSON.parse(fs.readFileSync(path.resolve('.import-reports/review-ui-fixture/client-review-link.json'), 'utf8'))
    const token = new URL(info.url).pathname.split('/').at(-1)
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(`/import-review/${token}`)
    await expect(page.getByText('0 of 67 reviewed', { exact: false })).toBeVisible()
    await page.getByLabel('Your name', { exact: true }).fill('Brian Deller')
    await page.getByLabel('Use these corrections', { exact: true }).check()
    await expect(page.getByLabel('First name', { exact: false })).toBeVisible()
    await page.screenshot({ path: testInfo.outputPath(`import-review-${width}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    page.on('dialog', dialog => dialog.accept())
    for (const [kind, field] of [['assignment', 'Start date and time'], ['issue', 'Correct asset'], ['line_item', 'Parent work order'], ['service', 'Total service cost'], ['part', 'Opening quantity']]) {
      await page.getByLabel('Filter row type', { exact: true }).selectOption(kind)
      await page.getByRole('complementary', { name: 'Review rows' }).getByRole('button').first().click()
      await page.getByLabel('Use these corrections', { exact: true }).check()
      await expect(page.getByLabel(field, { exact: false })).toBeVisible()
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
    }
  })
}

test('admin can view answers, export them and manage the temporary link', async ({ page, baseURL }, testInfo) => {
  const { batch } = await fixture()
  await prisma.assetImportReview.update({ where: { id: batch.id }, data: { title: 'Client review example' } })
  await prisma.assetImportReviewRow.update({ where: { id: batch.rows[0].id }, data: { decision: 'question', reviewer: 'Brian Deller', notes: 'Please confirm whether this is EX1 or EX2.' } })
  const user = await prisma.user.create({ data: { companyId, email: `review-admin-${randomBytes(6).toString('hex')}@example.test`, firstName: 'Team', lastName: 'Admin', password: 'unused', role: 'ADMIN' }, include: { company: true } })
  const token = jwt.sign({ userId: user.id, companyId, role: 'ADMIN', email: user.email }, process.env.REVIEW_TEST_JWT_SECRET || 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: baseURL! }])
  await page.addInitScript(({ user, token }) => localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token, isAuthenticated: true }, version: 0 })), { user, token })
  await page.goto('/dashboard/assets/import-reviews')
  await page.getByRole('row').filter({ hasText: 'Client review example' }).getByRole('button', { name: 'View responses' }).click()
  await page.getByText('1. EX1 · Hydraulic leak', { exact: false }).click()
  await expect(page.getByText('Please confirm whether this is EX1 or EX2.')).toBeVisible()
  await expect(page.getByRole('link', { name: 'Export answers' })).toHaveAttribute('href', `/api/asset-import-reviews/${batch.id}?download=1`)
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.screenshot({ path: testInfo.outputPath(`import-review-admin-${width}.png`), fullPage: true })
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  }
  page.on('dialog', dialog => dialog.accept())
  await page.getByRole('button', { name: 'Create new link', exact: true }).click()
  await expect(page.getByLabel('Client review link', { exact: true })).toHaveValue(/\/import-review\/[a-f0-9]{64}$/)
  await page.getByRole('button', { name: 'Revoke link', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Revoke link', exact: true })).toBeDisabled()
})
