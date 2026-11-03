import { expect, test, Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomBytes, randomUUID, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { seal, unseal, totp } from '../src/lib/platform/crypto'

const url = process.env.PLATFORM_TEST_DATABASE_URL
test.use({ actionTimeout: 15000 })
test.skip(!url || !['localhost', '127.0.0.1'].includes(new URL(url).hostname), 'Disposable local database required')
process.env.PLATFORM_MFA_ENCRYPTION_KEY = '17'.repeat(32)
const prisma = new PrismaClient({ datasources: { db: { url: url || 'postgresql://invalid@127.0.0.1:1/invalid' } } })
const companyIds: string[] = []
let platform: string, customer: string, owner: any, enrollee: any, customerAdmin: any, ownerSession: string
const password = 'Local-platform-test-123'
const review = join(process.cwd(), '.impeccable/review/super-admin')
test.beforeAll(async () => {
  mkdirSync(review, { recursive: true })
  platform = (await prisma.company.create({ data: { name: 'Buildflo platform (demo)' } })).id
  customer = (await prisma.company.create({ data: { name: 'Allied Construction (demo)', email: 'operations@example.test' } })).id
  companyIds.push(platform, customer)
  const createUser = (companyId: string, firstName: string) => prisma.user.create({ data: { companyId, email: `${randomUUID()}@example.test`, firstName, lastName: 'Morgan', role: 'ADMIN', password: bcrypt.hashSync(password, 10) }, include: { company: true } })
  owner = await createUser(platform, 'Platform'); enrollee = await createUser(platform, 'Enrollment'); customerAdmin = await createUser(customer, 'Avery')
  await prisma.user.create({ data: { companyId: customer, email: `${randomUUID()}@example.test`, firstName: 'Jordan', lastName: 'Lee', password: bcrypt.hashSync(password, 10), role: 'STAFF' } })
  await prisma.platformAdmin.create({ data: { userId: owner.id, secret: seal('GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ'), mfaEnabledAt: new Date() } })
  await prisma.platformAdmin.create({ data: { userId: enrollee.id } })
  ownerSession = randomBytes(32).toString('hex')
  await prisma.platformSession.create({ data: { tokenHash: createHash('sha256').update(ownerSession).digest('hex'), userId: owner.id, userVersion: 0, companyVersion: 0, expiresAt: new Date(Date.now() + 7200000) } })
  for (const [module, summary, before, after] of [
    ['assets', 'Avery Morgan updated Excavator 12 from Available to Maintenance', { status: 'AVAILABLE' }, { status: 'UNDER_MAINTENANCE' }],
    ['team', 'Invited Jordan Lee to the company', {}, { role: 'STAFF' }],
    ['project', 'Updated North Site construction schedule', {}, { title: 'North Site schedule' }],
    ['feedback', 'Submitted a request to improve equipment search', {}, {}],
  ] as const) await prisma.auditEvent.create({ data: { requestId: randomUUID(), companyId: customer, companyName: 'Allied Construction (demo)', actorId: customerAdmin.id, actorName: 'Avery Morgan', actorType: 'USER', module, action: 'updated', summary, outcome: 'SUCCEEDED', before, after } })
  await prisma.feedbackRequest.create({ data: { companyId: customer, createdById: customerAdmin.id, createdByName: 'Avery Morgan', title: 'Improve equipment search', clientId: randomUUID(), messages: { create: { authorId: customerAdmin.id, authorName: 'Avery Morgan', body: 'Please include equipment serial numbers in asset search.', clientId: randomUUID() } } } })
})
test.afterAll(async () => { for (const id of companyIds.reverse()) await prisma.company.deleteMany({ where: { id } }); await prisma.$disconnect() })
async function signIn(page: Page, user: any, verified = false) {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, companyId: user.companyId, companyVersion: user.company.accessVersion, sessionVersion: user.sessionVersion }, 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: 'http://127.0.0.1:3000' }, ...(verified ? [{ name: 'platform-session', value: ownerSession, url: 'http://127.0.0.1:3000' }] : [])])
  const { password: ignored, ...safe } = user
  await page.addInitScript(value => localStorage.setItem('auth-storage', JSON.stringify({ state: value, version: 0 })), { user: safe, token, isAuthenticated: true })
}

test('company administrator has no platform entry and cannot open the platform API', async ({ page }) => {
  await signIn(page, customerAdmin); await page.goto('/dashboard/settings')
  await expect(page.getByRole('heading', { name: 'Settings', exact: true })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Platform administration', exact: true })).toHaveCount(0)
  expect((await page.request.get('/api/platform/companies')).status()).toBe(403)
  await page.goto('/dashboard/platform'); await expect(page.getByText('Platform administrator access required.', { exact: true })).toBeVisible()
})
test('owner enrolls an authenticator, unlocks the workspace and locks it again', async ({ page }) => {
  await signIn(page, enrollee); await page.goto('/dashboard/platform')
  await expect(page.getByRole('heading', { name: 'Protect platform access' })).toBeVisible()
  await page.getByLabel('Current password').fill(password); await page.getByRole('button', { name: 'Set up authenticator' }).click()
  await expect(page.getByLabel('Authenticator code')).toBeVisible()
  const grant = await prisma.platformAdmin.findUniqueOrThrow({ where: { userId: enrollee.id } })
  await page.getByLabel('Authenticator code').fill(totp(unseal(grant.pendingSecret!), Math.floor(Date.now() / 30000)))
  await page.getByRole('button', { name: 'Unlock platform administration' }).click()
  await expect(page.getByRole('heading', { name: 'Platform overview', exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Lock workspace' }).click()
  await expect(page.getByRole('heading', { name: 'Verify your authenticator' })).toBeVisible()
})
test('create company, inspect initial invitation, edit settings and revoke invitation with an audit reason', async ({ page }) => {
  await signIn(page, owner, true); await page.goto('/dashboard/platform?view=companies')
  await page.getByRole('button', { name: 'New company' }).click()
  await page.getByLabel('Company name', { exact: true }).fill('New customer demo')
  await page.getByLabel('Administrator email').fill(`${randomUUID()}@example.test`)
  await page.getByLabel('Administrator first name').fill('Casey'); await page.getByLabel('Administrator last name').fill('Taylor')
  await page.getByLabel('Reason for creation').fill('Approved onboarding test')
  await page.getByRole('button', { name: 'Create company and invitation' }).click()
  await expect(page.getByLabel('Invitation link')).toHaveValue(/\/invite\/[a-f0-9]+$/)
  await page.getByRole('link', { name: 'Open company', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'New customer demo', exact: true })).toBeVisible()
  const id = new URL(page.url()).searchParams.get('company')!; companyIds.push(id)
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Settings', exact: true }).click()
  await page.getByLabel('Company name', { exact: true }).fill('New customer renamed')
  await page.getByLabel('Reason for change').fill('Corrected company name')
  await page.getByRole('button', { name: 'Save company details' }).click()
  await expect(page.getByRole('status')).toContainText('Company details saved')
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Users & invitations' }).click()
  await page.getByRole('button', { name: /^Revoke invitation for/ }).click()
  const dialog = page.getByRole('dialog'); await dialog.getByLabel('Reason', { exact: true }).fill('Invitation no longer needed')
  await dialog.getByRole('button', { name: 'Confirm change' }).click()
  await expect(page.getByText('No pending invitations.')).toBeVisible()
  expect(await prisma.auditEvent.count({ where: { companyId: id, action: 'revoked', reason: 'Invitation no longer needed' } })).toBe(1)
})
test('suspend/reactivate preserves data while invalidating company sessions', async ({ page, browser }) => {
  await signIn(page, owner, true); await page.goto(`/dashboard/platform?company=${customer}`)
  const otherContext = await browser.newContext(), other = await otherContext.newPage(); await signIn(other, customerAdmin)
  await page.getByRole('button', { name: 'Suspend company' }).click()
  await page.getByRole('dialog').getByLabel('Reason', { exact: true }).fill('Temporary account review')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm change' }).click()
  await expect(page.getByRole('button', { name: 'Reactivate company' })).toBeVisible()
  expect((await other.request.get('/api/feedback/access')).status()).toBe(401)
  expect(await prisma.feedbackRequest.count({ where: { companyId: customer } })).toBe(1)
  await page.getByRole('button', { name: 'Reactivate company' }).click()
  await page.getByRole('dialog').getByLabel('Reason', { exact: true }).fill('Account review complete')
  await page.getByRole('dialog').getByRole('button', { name: 'Confirm change' }).click()
  await expect(page.getByRole('button', { name: 'Suspend company' })).toBeVisible()
  expect((await other.request.get('/api/feedback/access')).status()).toBe(401)
  const login = await other.request.post('/api/auth/login', { headers: { origin: 'http://127.0.0.1:3000' }, data: { email: customerAdmin.email, password } })
  expect(login.status()).toBe(200)
  const fresh = await login.json()
  await otherContext.clearCookies()
  expect((await other.request.get('/api/feedback/access', { headers: { Authorization: `Bearer ${fresh.token}` } })).status()).toBe(200)
  await otherContext.close()
})
test('company activity filters and exports; platform-only grant manages cross-company feedback', async ({ page }) => {
  await signIn(page, owner, true); await page.goto(`/dashboard/platform?company=${customer}&tab=activity`)
  await expect(page.getByText('Avery Morgan updated Excavator 12 from Available to Maintenance', { exact: true })).toBeVisible()
  await page.getByText('Filters and dates', { exact: true }).click()
  await page.getByLabel('Module', { exact: true }).selectOption('assets')
  await expect(page.getByText('Updated North Site construction schedule', { exact: true })).toHaveCount(0)
  const download = page.waitForEvent('download'); await page.getByRole('button', { name: 'Export filtered activity' }).click()
  expect((await download).suggestedFilename()).toBe('buildflo-activity.csv')
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Feedback', exact: true }).click()
  await expect(page.getByText('Allied Construction (demo) · Newest requests first', { exact: true })).toBeVisible()
  await page.getByLabel('Status for Improve equipment search').selectOption('IN_PROGRESS')
  await expect(page.getByRole('region', { name: 'In progress', exact: true }).getByRole('button', { name: 'Improve equipment search', exact: true })).toBeVisible()
})
async function capture(page: Page, name: string) {
  await page.evaluate(async () => { window.scrollTo({ top: 0, left: 0, behavior: 'instant' }); await new Promise<void>(resolve => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))) })
  await page.screenshot({ path: join(review, name), fullPage: true, animations: 'disabled' })
}
for (const width of [1440, 390]) test(`platform overview and company activity fit ${width}px`, async ({ page }) => {
  await signIn(page, owner, true); await page.setViewportSize({ width, height: 1000 }); await page.goto('/dashboard/platform')
  await expect(page.getByRole('heading', { name: 'Needs attention', exact: true })).toBeVisible()
  await capture(page, `overview-${width}.png`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.goto(`/dashboard/platform?company=${customer}&tab=activity`)
  await expect(page.getByText('Avery Morgan updated Excavator 12 from Available to Maintenance', { exact: true })).toBeVisible()
  await capture(page, `company-activity-${width}.png`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Users & invitations' }).click()
  await expect(page.getByText(customerAdmin.email, { exact: true })).toBeVisible()
  await capture(page, `company-users-${width}.png`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  const jordan = await prisma.user.findFirstOrThrow({ where: { companyId: customer, firstName: 'Jordan' } })
  await page.getByLabel(`Role for ${jordan.email}`, { exact: true }).selectOption('ADMIN')
  const dialog = page.getByRole('dialog')
  await expect(dialog).toContainText('Change Jordan Lee’s role')
  await expect(dialog).toContainText(`${jordan.email}: STAFF → ADMIN`)
  await capture(page, `role-confirmation-${width}.png`)
  await dialog.getByRole('button', { name: 'Cancel', exact: true }).click()
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Activity', exact: true }).click()
  await page.getByText('Filters and dates', { exact: true }).click()
  await page.getByLabel('Module', { exact: true }).selectOption('procurement')
  await expect(page.getByText('No activity matches these filters.')).toBeVisible()
  expect(await page.getByLabel('Module', { exact: true }).locator('option[value="purchase-orders"]').count()).toBe(1)
  await capture(page, `module-filter-${width}.png`)
  await page.getByRole('navigation', { name: 'Company sections' }).getByRole('link', { name: 'Feedback', exact: true }).click()
  await expect(page.getByText('Allied Construction (demo) · Newest requests first', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Improve equipment search', exact: true })).toBeVisible()
  await capture(page, `company-feedback-${width}.png`)
})
