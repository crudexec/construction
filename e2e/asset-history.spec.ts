import { expect, test, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import Papa from 'papaparse'
import { login } from './helpers/auth'
import { assetHistoryCsv, selectHistoryEvents, type AssetHistory, type AssetHistoryEvent } from '../src/lib/assets/history'

const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : ''
test.skip(process.env.ASSET_IDENTITY_TEST_DB !== '1' || !['127.0.0.1', 'localhost'].includes(host), 'Requires an explicitly configured disposable local database')
const prisma = new PrismaClient()
const password = 'AssetHistory123!'
let companyIds: string[] = []
let fixture: { companyId: string; userId: string; email: string; assetId: string; otherAssetId: string; orderId: string; issueId: string; projectId: string }

test.beforeEach(async () => {
  companyIds = []
  const entries = []
  for (let index = 0; index < 2; index++) {
    const company = await prisma.company.create({ data: { name: `History test ${randomUUID()}` } })
    companyIds.push(company.id)
    const user = await prisma.user.create({ data: { companyId: company.id, email: `history-${randomUUID()}@example.com`, password: await hash(password, 10), firstName: 'Taylor', lastName: 'Manager', role: 'ADMIN' } })
    const asset = await prisma.asset.create({ data: { companyId: company.id, name: index ? 'Private asset' : 'History Excavator', equipmentId: 'EQ-HISTORY', type: 'EQUIPMENT', purchaseDate: new Date('2025-01-02'), purchaseCost: 0, invoiceNumber: 'Invoice "one",\nsecond line' } })
    entries.push({ company, user, asset })
  }
  const [own, other] = entries
  const stage = await prisma.stage.create({ data: { companyId: own.company.id, name: 'Active', color: '#123456', order: 0 } })
  const project = await prisma.card.create({ data: { companyId: own.company.id, stageId: stage.id, title: 'Renamed job' } })
  const yard = await prisma.assetYard.create({ data: { companyId: own.company.id, name: 'Main Yard' } })
  await prisma.assetMeterReading.createMany({ data: [
    { assetId: own.asset.id, readingType: 'HOURS', value: 10, recordedAt: new Date('2025-01-03'), notes: 'Legacy reading' },
    { assetId: own.asset.id, readingType: 'HOURS', value: 20, recordedAt: new Date('2025-01-05'), recordedById: own.user.id, contextRecorded: true, assignedPersonName: 'Original Driver', locationName: 'Original Job', event: 'ARRIVAL' },
  ] })
  await prisma.assetPersonAssignment.create({ data: { assetId: own.asset.id, assigneeId: own.user.id, createdById: own.user.id, assignedAt: new Date('2025-01-03'), removedAt: new Date('2025-01-07') } })
  await prisma.assetJobAssignment.createMany({ data: [
    { assetId: own.asset.id, projectId: project.id, locationName: 'Original Job', createdById: own.user.id, assignedAt: new Date('2025-01-03'), removedAt: new Date('2025-01-06') },
    { assetId: own.asset.id, yardId: yard.id, locationName: 'Main Yard', createdById: own.user.id, assignedAt: new Date('2025-01-06') },
  ] })
  const issue = await prisma.assetIssue.create({ data: { assetId: own.asset.id, title: 'Hydraulic leak', createdAt: new Date('2025-01-04'), reportedById: own.user.id, status: 'RESOLVED', resolvedAt: new Date('2025-01-08'), resolvedById: own.user.id } })
  const secondIssue = await prisma.assetIssue.create({ data: { assetId: own.asset.id, title: 'Public report', reporterName: 'QR Reporter', createdAt: new Date('2025-01-05') } })
  const order = await prisma.workOrder.create({ data: {
    companyId: own.company.id, createdById: own.user.id, title: 'Repair hydraulics', status: 'COMPLETED',
    createdAt: new Date('2025-01-06'), completedAt: new Date('2025-01-08'),
    issues: { create: [{ issueId: issue.id }, { issueId: secondIssue.id }] },
  } })
  // Even a malformed cross-company association must not leak an order.
  await prisma.workOrder.create({ data: { companyId: other.company.id, createdById: other.user.id, title: 'PRIVATE foreign order', issues: { create: { issueId: issue.id } } } })
  await prisma.workOrder.create({ data: { companyId: own.company.id, createdById: own.user.id, title: 'Unrelated order' } })
  fixture = { companyId: own.company.id, userId: own.user.id, email: own.user.email, assetId: own.asset.id, otherAssetId: other.asset.id, orderId: order.id, issueId: issue.id, projectId: project.id }
})

test.afterEach(async () => {
  await prisma.workOrder.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.asset.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.card.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.stage.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.notification.deleteMany({ where: { user: { companyId: { in: companyIds } } } })
  await prisma.user.deleteMany({ where: { companyId: { in: companyIds } } })
  await prisma.company.deleteMany({ where: { id: { in: companyIds } } })
})
test.afterAll(() => prisma.$disconnect())

async function auth(request: APIRequestContext) {
  const response = await request.post('/api/auth/login', { data: { email: fixture.email, password } })
  expect(response.ok()).toBeTruthy()
  return { Authorization: `Bearer ${(await response.json()).token}` }
}

test('combines all six event types, preserves unknown actors and snapshots, and deduplicates work orders', async ({ request }) => {
  const headers = await auth(request)
  const response = await request.get(`/api/assets/${fixture.assetId}/history`, { headers })
  expect(response.ok()).toBeTruthy()
  expect(response.headers()['cache-control']).toContain('no-store')
  const history: AssetHistory = await response.json()
  expect(history.events).toHaveLength(13)
  expect(new Set(history.events.map(event => event.type))).toEqual(new Set(['PURCHASE', 'METER_READING', 'ASSIGNMENT', 'LOCATION', 'ISSUE', 'WORK_ORDER']))
  expect(new Set(history.events.map(event => event.id)).size).toBe(13)
  expect(history.events).toEqual(selectHistoryEvents(history.events, 'ALL', 'desc'))
  expect(history.events.filter(event => event.type === 'WORK_ORDER')).toHaveLength(2)
  expect(JSON.stringify(history)).not.toMatch(/PRIVATE|Unrelated order|Private asset/)
  expect(history.events.find(event => event.type === 'PURCHASE')).toMatchObject({ occurredAt: '2025-01-02T00:00:00.000Z', actor: null, dateOnly: true, details: expect.stringContaining('Cost: 0 USD') })
  expect(history.events.find(event => event.action === 'Arrival reading')).toMatchObject({ person: 'Original Driver', location: 'Original Job', actor: 'Taylor Manager' })
  expect(history.events.find(event => event.details.includes('Legacy reading'))).toMatchObject({ person: 'Not recorded', location: 'Not recorded', actor: null })
  expect(history.events.find(event => event.action === 'Person assignment ended')?.actor).toBeNull()
  expect(history.events.find(event => event.action === 'Left location')).toMatchObject({ location: 'Original Job', actor: null })
  expect(history.events.find(event => event.action === 'Work order completed')?.actor).toBeNull()
  expect(history.events.find(event => event.details === 'Public report')?.actor).toBe('QR Reporter (public report)')
  expect(history.events.find(event => event.action === 'Issue resolved / closed')?.actor).toBe('Taylor Manager')
  expect(history.events.find(event => event.type === 'WORK_ORDER')?.reference.href).toBe(`/dashboard/assets/work-orders/${fixture.orderId}`)
  expect(history.notices.join(' ')).toContain('not a complete audit log')
})

test('requires authentication and isolates companies for history and export source data', async ({ request }) => {
  expect((await request.get(`/api/assets/${fixture.assetId}/history`)).status()).toBe(401)
  const headers = await auth(request)
  expect((await request.get(`/api/assets/${fixture.otherAssetId}/history`, { headers })).status()).toBe(404)
  expect((await request.get('/api/assets/does-not-exist/history', { headers })).status()).toBe(404)
})

test('does not invent a purchase date or lose location snapshots after project deletion', async ({ request }) => {
  await prisma.asset.update({ where: { id: fixture.assetId }, data: { purchaseDate: null, currentLocation: 'Unmapped legacy location' } })
  await prisma.card.delete({ where: { id: fixture.projectId } })
  const headers = await auth(request)
  const history: AssetHistory = await (await request.get(`/api/assets/${fixture.assetId}/history`, { headers })).json()
  expect(history.events.filter(event => event.type === 'PURCHASE')).toHaveLength(0)
  expect(history.events.filter(event => event.type === 'LOCATION' && event.location === 'Original Job')).toHaveLength(2)
  expect(JSON.stringify(history.events)).not.toContain('Unmapped legacy location')
  expect(history.notices).toContain('No purchase date is recorded, so no purchase event is shown.')
})

test('CSV safely round-trips multiline text and formula-like input, with stable filtering and sorting', async ({ request }) => {
  const headers = await auth(request)
  const history: AssetHistory = await (await request.get(`/api/assets/${fixture.assetId}/history`, { headers })).json()
  const ascending = selectHistoryEvents(history.events, 'ALL', 'asc')
  expect(selectHistoryEvents([...history.events].reverse(), 'ALL', 'asc')).toEqual(ascending)
  expect(ascending[0].type).toBe('PURCHASE')
  const dangerous: AssetHistoryEvent = { ...ascending[0], details: '=HYPERLINK("https://example.invalid")', actor: '\t=1+1', person: '+SUM(1,2)', location: '  @SUM(1,2)' }
  const csv = assetHistoryCsv({ ...history.asset, name: '-1+2', equipmentId: '=1+1' }, [dangerous, ...ascending])
  const parsed = Papa.parse<string[]>(csv, { skipEmptyLines: true })
  expect(parsed.errors).toEqual([])
  expect(parsed.data).toHaveLength(15)
  expect(parsed.data[1][1]).toBe("'=1+1")
  expect(parsed.data[1][2]).toBe("'-1+2")
  for (const column of [7, 8, 9, 10]) expect(parsed.data[1][column]).toMatch(/^'/)
  expect(parsed.data[2][4]).toBe('2025-01-02')
  expect(parsed.data[2][7]).toContain('Invoice "one",\nsecond line')
  const onlyReadings = selectHistoryEvents(history.events, 'METER_READING', 'desc')
  expect(onlyReadings).toHaveLength(2)
  expect(onlyReadings[0].occurredAt).toBe('2025-01-05T00:00:00.000Z')
  expect(Papa.parse<string[]>(assetHistoryCsv(history.asset, []), { skipEmptyLines: true }).data).toHaveLength(1)
})

test('browser filters, sorts, paginates, exports all matching events, and opens related records', async ({ page }, testInfo) => {
  await prisma.assetMeterReading.createMany({ data: Array.from({ length: 60 }, (_, index) => ({ assetId: fixture.assetId, readingType: 'HOURS' as const, value: index + 100, recordedAt: new Date(Date.UTC(2025, 1, 1, 0, index)) })) })
  await login(page, fixture.email, password)
  await page.goto(`/dashboard/assets/${fixture.assetId}`)
  await page.getByRole('button', { name: 'History', exact: true }).click()
  const region = page.getByRole('region', { name: 'Asset history', exact: true })
  await expect(region.getByRole('table')).toBeVisible()
  for (const type of ['PURCHASE', 'ASSIGNMENT', 'LOCATION', 'ISSUE', 'WORK_ORDER']) {
    await region.getByLabel('Event type').selectOption(type)
    await expect(region.locator('tbody tr')).not.toHaveCount(0)
    const labels: Record<string, string> = { PURCHASE: 'Purchase', ASSIGNMENT: 'Assignment', LOCATION: 'Location', ISSUE: 'Issue', WORK_ORDER: 'Work order' }
    for (const cell of await region.locator('tbody tr td:nth-child(2)').allTextContents()) expect(cell).toBe(labels[type])
  }
  await region.getByLabel('Event type').selectOption('METER_READING')
  await region.getByLabel('Date order').selectOption('asc')
  await expect(region.locator('tbody tr')).toHaveCount(50)
  await expect(region.locator('tbody tr').first()).toContainText('Legacy reading')
  await region.getByRole('button', { name: 'Next page' }).click()
  await expect(region.locator('tbody tr')).toHaveCount(12)
  const downloading = page.waitForEvent('download')
  await region.getByRole('button', { name: 'Export CSV' }).click()
  const download = await downloading
  expect(download.suggestedFilename()).toBe('asset-EQ-HISTORY-history.csv')
  const downloadedPath = await download.path()
  expect(downloadedPath).toBeTruthy()
  const csv = await readFile(downloadedPath!, 'utf8')
  const parsed = Papa.parse<string[]>(csv, { header: false, skipEmptyLines: true })
  expect(parsed.errors).toEqual([])
  expect(parsed.data).toHaveLength(63)
  expect(parsed.data.slice(1).every(row => row[5] === 'Meter reading')).toBe(true)
  const dates = parsed.data.slice(1).map(row => row[4])
  expect(dates).toEqual([...dates].sort())
  await region.getByLabel('Event type').selectOption('WORK_ORDER')
  await expect(region.locator('tbody tr')).toHaveCount(2)
  await region.getByRole('link', { name: 'Repair hydraulics' }).first().click()
  await expect(page).toHaveURL(new RegExp(`/work-orders/${fixture.orderId}$`))
  await expect(page.getByRole('heading', { name: 'Repair hydraulics' })).toBeVisible()
  await page.goto(`/dashboard/assets/${fixture.assetId}?tab=history`)
  await region.getByLabel('Event type').selectOption('PURCHASE')
  await region.getByRole('link', { name: 'Purchase details' }).click()
  await expect(page).toHaveURL(/tab=purchase/)
  await expect(page.getByRole('heading', { name: 'Purchase Information' })).toBeVisible()
  await page.goto(`/dashboard/assets/${fixture.assetId}?tab=history`)
  await region.getByLabel('Event type').selectOption('LOCATION')
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.screenshot({ path: testInfo.outputPath('asset-history-desktop.png') })
  await page.setViewportSize({ width: 390, height: 844 })
  await page.screenshot({ path: testInfo.outputPath('asset-history-mobile.png') })
})

test('browser refreshes after edits, retries errors, and distinguishes empty history from empty filters', async ({ page }) => {
  await login(page, fixture.email, password)
  await page.goto(`/dashboard/assets/${fixture.assetId}?tab=history`)
  const region = page.getByRole('region', { name: 'Asset history', exact: true })
  await expect(region.locator('tbody tr')).toHaveCount(13)
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await prisma.assetMeterReading.create({ data: { assetId: fixture.assetId, readingType: 'MILES', value: 999, notes: 'New history entry' } })
  await page.getByRole('button', { name: 'History', exact: true }).click()
  await expect(region.locator('tbody tr')).toHaveCount(14)
  await expect(region).toContainText('New history entry')

  const pattern = `**/api/assets/${fixture.assetId}/history`
  await page.route(pattern, route => route.fulfill({ status: 500, json: { error: 'Test failure' } }))
  await region.getByRole('button', { name: 'Refresh', exact: true }).click()
  await expect(region.getByRole('alert')).toContainText('History could not be refreshed')
  await expect(region.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  await page.unroute(pattern)
  await region.getByRole('button', { name: 'Retry', exact: true }).click()
  await expect(region.getByRole('alert')).toHaveCount(0)
  await expect(region.getByRole('button', { name: 'Export CSV' })).toBeEnabled()

  await prisma.asset.update({ where: { id: fixture.assetId }, data: { purchaseDate: null } })
  await region.getByRole('button', { name: 'Refresh', exact: true }).click()
  await region.getByLabel('Event type').selectOption('PURCHASE')
  await expect(region).toContainText('No events match this event type.')
  await expect(region.getByRole('button', { name: 'Export CSV' })).toBeDisabled()
  const empty = await prisma.asset.create({ data: { companyId: fixture.companyId, name: 'Empty history asset', type: 'TOOL' } })
  await page.goto(`/dashboard/assets/${empty.id}?tab=history`)
  await expect(region).toContainText('No history events have been recorded yet.')
})
