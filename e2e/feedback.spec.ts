import { expect, test, Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import jwt from 'jsonwebtoken'

const url = process.env.FEEDBACK_TEST_DATABASE_URL
test.use({ actionTimeout: 15000 })
test.skip(!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Explicit disposable local database required')
const prisma = new PrismaClient({ datasources: { db: { url: url || 'postgresql://invalid@127.0.0.1:1/invalid' } } })
let companyId: string, staff: any, admin: any
test.beforeAll(async () => {
  companyId = (await prisma.company.create({ data: { name: 'Construction demo' } })).id
  for (const role of ['STAFF', 'ADMIN'] as const) {
    const user = await prisma.user.create({ data: { companyId, email: `${randomUUID()}@example.test`, role, firstName: role === 'STAFF' ? 'Alex' : 'Morgan', lastName: role === 'STAFF' ? 'Parker' : 'Lee', password: 'unused' }, include: { company: true } })
    if (role === 'STAFF') staff = user; else admin = user
  }
})
test.afterAll(async () => { if (companyId) await prisma.company.delete({ where: { id: companyId } }); await prisma.$disconnect() })
async function signIn(page: Page, user: any) {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, companyId: user.companyId }, 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: 'http://127.0.0.1:3000' }])
  const { password, ...safe } = user
  await page.addInitScript(value => localStorage.setItem('auth-storage', JSON.stringify({ state: value, version: 0 })), { user: safe, token, isAuthenticated: true })
}
async function fixture(title: string, status: 'TODO' | 'IN_PROGRESS' | 'DONE' = 'TODO') {
  return prisma.feedbackRequest.create({ data: { companyId, createdById: staff.id, createdByName: 'Alex Parker', clientId: randomUUID(), title, status, pagePath: '/dashboard/assets', messages: { create: { authorId: staff.id, authorName: 'Alex Parker', clientId: randomUUID(), body: 'When I search for an equipment serial number, the asset does not appear. Could we include serial numbers in search?' } } } })
}

test('staff submits feedback, manager moves and replies, submitter sees persisted progress', async ({ page, browser }) => {
  await signIn(page, staff); await page.goto('/dashboard/feedback')
  await expect(page.getByText('This board is for feedback managers')).toBeVisible()
  await page.getByRole('button', { name: 'Open feedback chat' }).click()
  const chat = page.getByRole('dialog', { name: 'Feedback', exact: true })
  await chat.getByRole('button', { name: 'New feedback', exact: true }).click()
  await page.getByLabel('Subject', { exact: true }).fill('Find equipment by serial number')
  await page.getByLabel('What would you like us to know?').fill('Searching for a serial number returns no equipment.')
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Conversation', exact: true }).getByText('Searching for a serial number returns no equipment.')).toBeVisible()
  const row = await prisma.feedbackRequest.findFirstOrThrow({ where: { companyId, title: 'Find equipment by serial number' } })
  const managerContext = await browser.newContext(), manager = await managerContext.newPage()
  await signIn(manager, admin); await manager.goto('/dashboard/feedback')
  await expect(manager).toHaveURL(/\/dashboard\/settings\?tab=feedback$/)
  await expect(manager.getByRole('navigation', { name: 'Settings categories' }).getByRole('link', { name: 'Feedback', exact: true })).toHaveAttribute('aria-current', 'page')
  await expect(manager.locator('nav:not([aria-label])').getByRole('link', { name: 'Feedback', exact: true })).toHaveCount(0)
  await manager.getByLabel('Status for Find equipment by serial number').selectOption('IN_PROGRESS')
  await expect(manager.getByRole('region', { name: 'In progress', exact: true }).getByRole('button', { name: 'Find equipment by serial number', exact: true })).toBeVisible()
  await manager.getByRole('button', { name: 'Find equipment by serial number', exact: true }).click()
  await manager.getByRole('dialog').getByLabel('Reply', { exact: true }).fill('Thanks, Alex. We have started working on this.')
  await manager.getByRole('button', { name: 'Send reply' }).click()
  await expect(manager.getByRole('dialog').getByLabel('Reply', { exact: true })).toHaveValue('')
  await expect(manager.getByRole('dialog').getByText('Thanks, Alex. We have started working on this.')).toBeVisible()
  await page.reload(); await page.getByRole('button', { name: 'Open feedback chat' }).click()
  await page.getByRole('dialog').getByRole('button', { name: /Find equipment by serial number/ }).click()
  await expect(page.getByRole('dialog').getByText('Thanks, Alex. We have started working on this.')).toBeVisible()
  await expect(page.getByRole('dialog').getByText('In progress', { exact: true })).toBeVisible()
  expect((await prisma.feedbackRequest.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('IN_PROGRESS')
  await managerContext.close()
})

test('failed sends retain draft; closing and reopening preserves it; Escape restores launcher focus', async ({ page }) => {
  await signIn(page, staff); await page.goto('/dashboard/feedback')
  await page.getByRole('button', { name: 'Open feedback chat' }).click(); await page.getByRole('button', { name: 'New feedback', exact: true }).click()
  await page.getByLabel('Subject', { exact: true }).fill('Keep my feedback draft')
  await page.getByLabel('What would you like us to know?').fill('This draft should survive a failed send.')
  await page.route('**/api/feedback', async route => route.request().method() === 'POST' ? route.fulfill({ status: 503, json: { error: 'Temporary connection issue. Try again.' } }) : route.continue())
  await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('dialog').getByRole('alert')).toContainText('Temporary connection issue')
  await expect(page.getByLabel('What would you like us to know?')).toHaveValue('This draft should survive a failed send.')
  await page.keyboard.press('Escape'); await expect(page.getByRole('button', { name: 'Open feedback chat' })).toBeFocused()
  await page.getByRole('button', { name: 'Open feedback chat' }).click(); await expect(page.getByLabel('Subject', { exact: true })).toHaveValue('Keep my feedback draft')
  await page.unroute('**/api/feedback'); await page.getByRole('button', { name: 'Send feedback', exact: true }).click()
  await expect(page.getByRole('dialog', { name: 'Conversation', exact: true }).getByText('This draft should survive a failed send.')).toBeVisible()
})

test('keyboard drag moves a request to the next lane and persists after reload', async ({ page }) => {
  const row = await fixture('Keyboard move request')
  await signIn(page, admin); await page.goto('/dashboard/feedback')
  const handle = page.getByRole('button', { name: 'Move Keyboard move request', exact: true })
  await handle.focus(); await page.keyboard.press('Space');
  await expect(page.locator('[id^=rfd-announcement]')).toContainText('lifted')
  await page.keyboard.press('ArrowRight');
  await expect(page.locator('[id^=rfd-announcement]')).toContainText('IN_PROGRESS')
  await page.keyboard.press('Space')
  await expect.poll(async () => (await prisma.feedbackRequest.findUniqueOrThrow({ where: { id: row.id } })).status).toBe('IN_PROGRESS')
  await page.reload(); await expect(page.getByRole('region', { name: 'In progress', exact: true }).getByRole('button', { name: 'Keyboard move request', exact: true })).toBeVisible()
})

for (const width of [1440, 390]) test(`feedback board and chat fit at ${width}px`, async ({ page }, testInfo) => {
  const prefix = `Visual ${width}`
  const rows = await Promise.all([fixture(`${prefix}: Search equipment by serial number`), fixture(`${prefix}: Keep filters when returning to assets`, 'IN_PROGRESS'), fixture(`${prefix}: Show retired assets only when selected`, 'DONE')])
  await signIn(page, admin); await page.setViewportSize({ width, height: 1000 }); await page.goto('/dashboard/feedback')
  const searches = ['TODO', 'IN_PROGRESS', 'DONE'].map(status => page.waitForResponse(response => response.url().includes('status=' + status) && response.url().includes('search=')))
  await page.getByLabel('Search feedback', { exact: true }).fill(prefix)
  await Promise.all(searches)
  await expect(page.getByText('Loading requests…', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('region', { name: 'To do', exact: true }).getByRole('article')).toHaveCount(1)
  await page.screenshot({ path: testInfo.outputPath(`feedback-board-${width}.png`), fullPage: true })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.getByRole('button', { name: `${prefix}: Search equipment by serial number`, exact: true }).click()
  await expect(page.getByRole('dialog').getByLabel('Reply', { exact: true })).toBeVisible()
  await page.screenshot({ path: testInfo.outputPath(`feedback-chat-${width}.png`), fullPage: true })
  const bounds = await page.getByRole('dialog').boundingBox(); expect(bounds!.x).toBeGreaterThanOrEqual(0); expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(width)
  expect(bounds!.y + bounds!.height).toBeLessThanOrEqual(1000)
  await prisma.feedbackRequest.deleteMany({ where: { id: { in: rows.map(row => row.id) } } })
})
