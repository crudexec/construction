import { expect, test, type APIRequestContext } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { hash } from 'bcryptjs'
import { randomUUID } from 'node:crypto'
import { login } from './helpers/auth'

const host = process.env.DATABASE_URL ? new URL(process.env.DATABASE_URL).hostname : ''
test.skip(process.env.ASSET_IDENTITY_TEST_DB !== '1' || !['127.0.0.1', 'localhost'].includes(host), 'Requires an explicitly configured disposable local database')
const prisma = new PrismaClient()
const password = 'AssetContext123!'
let companyIds: string[]
let fixture: { companyId: string; userId: string; email: string; projectId: string; yardId: string; otherUserId: string; otherProjectId: string; otherYardId: string; assetId: string }

test.beforeEach(async () => {
  companyIds = []
  const entries = []
  for (let index = 0; index < 2; index++) {
    const company = await prisma.company.create({ data: { name: `Context test ${randomUUID()}` } })
    companyIds.push(company.id)
    const email = `context-${randomUUID()}@example.com`
    const user = await prisma.user.create({ data: { companyId: company.id, email, password: await hash(password, 10), firstName: 'Alex', lastName: 'Driver', role: 'ADMIN' } })
    const stage = await prisma.stage.create({ data: { companyId: company.id, name: 'Active', color: '#123456', order: 0 } })
    const project = await prisma.card.create({ data: { companyId: company.id, stageId: stage.id, title: index ? 'Private job' : 'River Road Job' } })
    const yard = await prisma.assetYard.create({ data: { companyId: company.id, name: index ? 'Private yard' : 'Main Yard' } })
    entries.push({ company, user, project, yard })
  }
  const [own, other] = entries
  const asset = await prisma.asset.create({ data: { name: 'Context Excavator', type: 'EQUIPMENT', companyId: own.company.id, currentLocation: 'Legacy storage area' } })
  fixture = { companyId: own.company.id, userId: own.user.id, email: own.user.email, projectId: own.project.id, yardId: own.yard.id, otherUserId: other.user.id, otherProjectId: other.project.id, otherYardId: other.yard.id, assetId: asset.id }
})

test.afterEach(async () => {
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

test('snapshots reading context without moving the asset and preserves it after renames and moves', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  expect((await request.patch(url, { headers, data: { currentProjectId: fixture.projectId, currentYardId: null, currentAssigneeId: fixture.userId } })).ok()).toBeTruthy()
  const reading = await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 100, event: 'ARRIVAL' } })
  expect(reading.status()).toBe(201)
  const original = await reading.json()
  expect(original).toMatchObject({ contextRecorded: true, assignedPersonName: 'Alex Driver', locationName: 'River Road Job', event: 'ARRIVAL' })
  const departure = await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 110, event: 'DEPARTURE', yardId: fixture.yardId, projectId: null, assigneeId: null } })
  expect(departure.status()).toBe(201)
  expect(await departure.json()).toMatchObject({ assignedPersonId: null, locationName: 'Main Yard' })
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: fixture.projectId, currentAssigneeId: fixture.userId })

  expect((await request.patch(url, { headers, data: { currentYardId: fixture.yardId, currentProjectId: null, currentAssigneeId: null } })).ok()).toBeTruthy()
  await prisma.user.update({ where: { id: fixture.userId }, data: { firstName: 'Renamed' } })
  await prisma.card.update({ where: { id: fixture.projectId }, data: { title: 'Renamed job' } })
  const readings = await (await request.get(`${url}/meter-readings`, { headers })).json()
  expect(readings.find((item: { id: string }) => item.id === original.id)).toMatchObject({ assignedPersonName: 'Alex Driver', locationName: 'River Road Job' })
  const history = await (await request.get(`${url}/job-assignments`, { headers })).json()
  expect(history.filter((item: { removedAt: string | null }) => !item.removedAt)).toHaveLength(1)
  expect(history.find((item: { projectId: string | null }) => item.projectId === fixture.projectId)).toMatchObject({ locationName: 'River Road Job' })
})

test('atomically updates current context when requested and rejects foreign-company or invalid context', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  const response = await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 20, projectId: fixture.projectId, assigneeId: fixture.userId, updateAssetContext: true } })
  expect(response.status()).toBe(201)
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: fixture.projectId, currentAssigneeId: fixture.userId })
  const beforeCount = await prisma.assetMeterReading.count({ where: { assetId: fixture.assetId } })
  for (const input of [{ projectId: fixture.otherProjectId }, { yardId: fixture.otherYardId }, { assigneeId: fixture.otherUserId }]) {
    expect((await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 30, updateAssetContext: true, ...input } })).status()).toBe(404)
  }
  expect((await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 30, projectId: fixture.projectId, yardId: fixture.yardId } })).status()).toBe(400)
  expect((await request.patch(url, { headers, data: { currentYardId: fixture.otherYardId } })).status()).toBe(404)
  expect((await request.patch(url, { headers, data: { currentProjectId: fixture.projectId, currentYardId: fixture.yardId } })).status()).toBe(400)
  expect(await prisma.assetMeterReading.count({ where: { assetId: fixture.assetId } })).toBe(beforeCount)
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: fixture.projectId, currentAssigneeId: fixture.userId })
  const yards = await (await request.get('/api/asset-yards', { headers })).json()
  expect(yards.map((yard: { name: string }) => yard.name)).toEqual(['Main Yard'])
  for (const value of ['not-a-number', true, -1]) expect((await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value } })).status()).toBe(400)
})

test('historical entries leave current context and status alone and concurrent transfers keep one active location', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  expect((await request.patch(url, { headers, data: { currentProjectId: fixture.projectId, currentAssigneeId: fixture.userId, status: 'UNDER_MAINTENANCE' } })).ok()).toBeTruthy()
  expect((await request.post(`${url}/person-assignments`, { headers, data: { assigneeId: fixture.userId, assignedAt: '2026-01-01', removedAt: '2026-01-02' } })).status()).toBe(201)
  expect((await request.post(`${url}/job-assignments`, { headers, data: { yardId: fixture.yardId, assignedAt: '2026-01-01', removedAt: '2026-01-02' } })).status()).toBe(201)
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentAssigneeId: fixture.userId, currentProjectId: fixture.projectId, status: 'UNDER_MAINTENANCE' })
  const transfers = await Promise.all([
    request.patch(url, { headers, data: { currentYardId: fixture.yardId, currentProjectId: null } }),
    request.patch(url, { headers, data: { currentProjectId: fixture.projectId, currentYardId: null } }),
  ])
  for (const transfer of transfers) expect(transfer.ok()).toBeTruthy()
  const current = await prisma.asset.findUniqueOrThrow({ where: { id: fixture.assetId } })
  const active = await prisma.assetJobAssignment.findMany({ where: { assetId: fixture.assetId, removedAt: null } })
  expect(active).toHaveLength(1)
  expect(active[0]).toMatchObject({ projectId: current.currentProjectId, yardId: current.currentYardId })
  expect((await request.patch(`/api/assets/job-assignments/${active[0].id}`, { headers })).ok()).toBeTruthy()
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: null, currentYardId: null, currentAssigneeId: fixture.userId })
})

test('preserves legacy location text and marks historical reading context as unrecorded', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  await prisma.assetMeterReading.create({ data: { assetId: fixture.assetId, readingType: 'HOURS', value: 10 } })
  expect((await request.patch(url, { headers, data: { name: 'Edited legacy asset' } })).ok()).toBeTruthy()
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentLocation: 'Legacy storage area', currentProjectId: null, currentYardId: null })
  const readings = await (await request.get(`${url}/meter-readings`, { headers })).json()
  expect(readings[0]).toMatchObject({ contextRecorded: false, locationName: null, assignedPersonName: null })
  const current = await request.post(`${url}/meter-readings`, { headers, data: { readingType: 'HOURS', value: 11 } })
  expect(await current.json()).toMatchObject({ contextRecorded: true, locationName: 'Legacy storage area' })
})

test('issue and QR readings capture context without exposing it publicly', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  expect((await request.patch(url, { headers, data: { currentYardId: fixture.yardId, currentAssigneeId: fixture.userId } })).ok()).toBeTruthy()
  const issue = await request.post(`${url}/issues`, { headers, data: { title: 'Internal leak', meterReadingType: 'HOURS', meterReadingValue: 10 } })
  expect(issue.status()).toBe(201)
  const share = await request.post(`${url}/share`, { headers, data: {} })
  expect(share.ok()).toBeTruthy()
  const token = (await share.json()).shareToken
  const qr = await request.post(`/api/shared/asset/${token}`, { data: { title: 'QR leak', meterReadingType: 'HOURS', meterReadingValue: 11 } })
  expect(qr.status()).toBe(201)
  const readings = await (await request.get(`${url}/meter-readings`, { headers })).json()
  expect(readings).toHaveLength(2)
  for (const reading of readings) expect(reading).toMatchObject({ contextRecorded: true, assignedPersonName: 'Alex Driver', locationName: 'Main Yard' })
  const publicData = await (await request.get(`/api/shared/asset/${token}`)).json()
  for (const entry of publicData.issues) {
    expect(entry.meterReading).not.toHaveProperty('assignedPersonName')
    expect(entry.meterReading).not.toHaveProperty('locationName')
  }
})

test('request approval and return use the same assignment and location history', async ({ request }) => {
  const headers = await auth(request)
  const url = `/api/assets/${fixture.assetId}`
  const created = await request.post(`${url}/requests`, { headers, data: { purpose: 'Move to job', projectId: fixture.projectId } })
  expect(created.status()).toBe(201)
  const id = (await created.json()).id
  expect((await request.post(`/api/asset-requests/${id}/approve`, { headers })).ok()).toBeTruthy()
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: fixture.projectId, currentAssigneeId: fixture.userId })
  expect((await request.post(`/api/asset-requests/${id}/return`, { headers, data: { condition: 'GOOD', currentYardId: fixture.yardId, currentProjectId: null } })).ok()).toBeTruthy()
  expect(await prisma.asset.findUnique({ where: { id: fixture.assetId } })).toMatchObject({ currentProjectId: null, currentYardId: fixture.yardId, currentAssigneeId: null })
  expect(await prisma.assetPersonAssignment.count({ where: { assetId: fixture.assetId, removedAt: null } })).toBe(0)
  expect(await prisma.assetJobAssignment.count({ where: { assetId: fixture.assetId, removedAt: null } })).toBe(1)
})

test('records arrival, moves to a new yard, and displays the original person and job on prior readings', async ({ page }, testInfo) => {
  await login(page, fixture.email, password)
  await page.goto(`/dashboard/assets/${fixture.assetId}`)
  await page.getByRole('button', { name: 'Edit', exact: true }).click()
  await page.getByLabel('Location (job or yard)', { exact: true }).selectOption(`project:${fixture.projectId}`)
  await page.locator('label', { hasText: 'Assignment (person)' }).locator('..').locator('select').selectOption(fixture.userId)
  await page.getByRole('button', { name: 'Save Changes' }).click()
  await expect(page.locator('[aria-label="Asset profile values"] [data-field-key="locationSelection"]')).toContainText('River Road Job')
  await page.getByRole('button', { name: 'Add meter reading', exact: true }).click()
  await expect(page.getByLabel('Assignment (person)', { exact: true })).toHaveValue(fixture.userId)
  await page.getByLabel('Reading event').selectOption('ARRIVAL')
  await page.locator('form input[type="number"]').fill('100')
  await page.locator('form').getByRole('button', { name: 'Log Reading', exact: true }).click()
  await expect(page.getByRole('row', { name: /100.*Arrival.*Alex Driver.*River Road Job/ })).toBeVisible()

  await page.getByRole('button', { name: 'Log Reading', exact: true }).click()
  await page.getByRole('button', { name: '+ Add yard', exact: true }).click()
  await page.getByLabel('New yard name').fill('Service Yard')
  await page.getByRole('button', { name: 'Save yard', exact: true }).click()
  await expect(page.getByLabel('Location (job or yard)', { exact: true }).locator('option:checked')).toHaveText('Service Yard')
  await page.getByLabel('Assignment (person)', { exact: true }).selectOption('')
  await page.getByLabel('Reading event').selectOption('DEPARTURE')
  await page.locator('form input[type="number"]').fill('120')
  await page.getByRole('checkbox').check()
  await page.locator('form').getByRole('button', { name: 'Log Reading', exact: true }).click()
  await expect(page.getByRole('row', { name: /120.*Departure.*Unassigned.*Service Yard/ })).toBeVisible()
  await expect(page.getByRole('row', { name: /100.*Arrival.*Alex Driver.*River Road Job/ })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath('meter-reading-context.png'), fullPage: true })
  await page.getByRole('button', { name: 'Overview', exact: true }).click()
  await expect(page.locator('[aria-label="Asset profile values"] [data-field-key="locationSelection"]')).toContainText('Service Yard')
  await page.getByRole('button', { name: 'Locations', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Location History' })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'River Road Job', exact: true })).toBeVisible()
  await expect(page.getByRole('cell', { name: 'Service Yard', exact: true })).toBeVisible()
})
