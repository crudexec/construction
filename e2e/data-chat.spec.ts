import { test, expect, type Page } from '@playwright/test'
import { PrismaClient } from '@prisma/client'
import { randomUUID, createHash } from 'node:crypto'
import { mkdirSync } from 'node:fs'
import { join } from 'node:path'
import jwt from 'jsonwebtoken'
const url = process.env.AI_TEST_DATABASE_URL
// Run against the explicitly configured local OpenRouter fixture server.
test.skip(!url || !['127.0.0.1', 'localhost'].includes(new URL(url).hostname), 'Disposable local AI_TEST_DATABASE_URL required')
const prisma = new PrismaClient({ datasources: { db: { url: url || 'postgresql://invalid@127.0.0.1:1/invalid' } } })
const ids: string[] = []; let owner: any, admin: any, staff: any, session: string, companyId: string
const review = join(process.cwd(), '.impeccable/review/data-assistant'), model = 'qwen/buildflo-test-fixture'
test.beforeAll(async () => {
  mkdirSync(review, { recursive: true })
  ids.push((await prisma.company.create({ data: { name: 'Buildflo platform demo' } })).id)
  companyId = (await prisma.company.create({ data: { name: 'Allied Construction (demo)' } })).id; ids.push(companyId)
  const create = (id: string, name: string, role: 'ADMIN' | 'STAFF') => prisma.user.create({ data: { companyId: id, firstName: name, lastName: 'Morgan', email: `${randomUUID()}@example.test`, role, password: 'test-only-unused' }, include: { company: true } })
  owner = await create(ids[0], 'Platform', 'STAFF'); admin = await create(companyId, 'Avery', 'ADMIN'); staff = await create(companyId, 'Jordan', 'STAFF')
  await prisma.platformAdmin.create({ data: { userId: owner.id, mfaEnabledAt: new Date() } }); session = randomUUID()
  await prisma.platformSession.create({ data: { userId: owner.id, tokenHash: createHash('sha256').update(session).digest('hex'), expiresAt: new Date(Date.now() + 3600000), userVersion: 0, companyVersion: 0 } })
  await prisma.companyAiConfig.create({ data: { companyId, model, enabled: true, systemPrompt: 'Give concise answers for equipment managers.', updatedById: owner.id } })
  await prisma.asset.createMany({ data: [{ companyId, name: 'Excavator 12', type: 'EQUIPMENT' }, { companyId, name: 'Retired crane', type: 'EQUIPMENT', status: 'RETIRED' }] })
})
test.afterAll(async () => { for (const id of ids.reverse()) await prisma.company.deleteMany({ where: { id } }); await prisma.$disconnect() })
async function signIn(page: Page, user: any, platform = false) {
  const token = jwt.sign({ userId: user.id, email: user.email, role: user.role, companyId: user.companyId }, 'local-verification-only')
  await page.context().addCookies([{ name: 'auth-token', value: token, url: 'http://127.0.0.1:3000' }, ...(platform ? [{ name: 'platform-session', value: session, url: 'http://127.0.0.1:3000' }] : [])])
  const { password, ...safe } = user
  await page.addInitScript(value => localStorage.setItem('auth-storage', JSON.stringify({ state: value, version: 0 })), { user: safe, token, isAuthenticated: true })
}
async function openChat(page: Page) { await page.goto('/dashboard/settings'); await page.getByRole('button', { name: 'Open chat', exact: true }).click(); await page.getByRole('tab', { name: 'Buildflo Assist', exact: true }).click() }
async function newQuestion(page: Page) {
  await page.getByRole('button', { name: 'New chat', exact: true }).click()
  await page.getByLabel('Message Buildflo Assist').fill('How many assets do we have?')
  await page.getByRole('button', { name: 'Send question', exact: true }).click()
  await expect(page.getByRole('log')).toContainText('The company has 2 assets.')
}
test('company administrators get grounded answers, follow-ups and persistent private conversations', async ({ page }) => {
  await signIn(page, admin); await openChat(page); await newQuestion(page)
  await expect(page.getByRole('log')).not.toContainText('Data checked'); await expect(page.getByRole('log')).not.toContainText('Prompt version'); await expect(page.getByRole('dialog')).not.toContainText('sent through OpenRouter')
  await page.getByLabel('Message Buildflo Assist').fill('Does that include retired equipment?')
  await page.getByLabel('Message Buildflo Assist').press('Shift+Enter')
  await expect(page.getByLabel('Message Buildflo Assist')).toHaveValue('Does that include retired equipment?\n')
  await page.getByRole('button', { name: 'Close chat', exact: true }).click()
  await page.getByRole('button', { name: 'Open chat', exact: true }).click()
  await expect(page.getByLabel('Message Buildflo Assist')).toHaveValue('Does that include retired equipment?\n')
  await page.getByLabel('Message Buildflo Assist').press('Enter')
  await expect(page.getByRole('log').getByText(/The company has 2 assets\./)).toHaveCount(2)
  await page.reload(); await page.getByRole('button', { name: 'Open chat', exact: true }).click(); await page.getByRole('tab', { name: 'Buildflo Assist', exact: true }).click()
  await page.getByRole('button', { name: 'Conversations', exact: true }).click(); await page.getByRole('button', { name: /How many assets do we have\?/ }).first().click(); await expect(page.getByRole('log')).toContainText('Does that include retired equipment?')
})
test('staff retain feedback chat without data chat access', async ({ page }) => {
  await signIn(page, staff); await page.goto('/dashboard/settings'); await page.getByRole('button', { name: 'Open feedback chat' }).click()
  await expect(page.getByRole('button', { name: 'New feedback', exact: true })).toBeVisible(); await expect(page.getByRole('tab', { name: 'Buildflo Assist', exact: true })).toHaveCount(0)
  expect((await page.request.get('/api/data-chat')).status()).toBe(403)
})
test('platform owner tests an unsaved company prompt before publishing a new version', async ({ page }) => {
  await signIn(page, owner, true); await page.goto(`/dashboard/platform?company=${companyId}&tab=ai`)
  await page.getByLabel('Company system prompt', { exact: true }).fill('Use fleet operations terminology and concise bullet points.')
  await page.getByRole('button', { name: 'Run test', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Test answer', exact: true })).toBeVisible()
  expect((await prisma.companyAiConfig.findUniqueOrThrow({ where: { companyId } })).systemPrompt).toBe('Give concise answers for equipment managers.')
  await page.getByLabel('Reason for change', { exact: true }).fill('Use the client’s fleet terminology')
  await page.getByRole('button', { name: 'Save company settings', exact: true }).click(); await expect(page.getByText(/Saved version 2/)).toBeVisible()
  expect((await prisma.companyAiConfig.findUniqueOrThrow({ where: { companyId } })).systemPrompt).toBe('Use fleet operations terminology and concise bullet points.')
  await page.getByLabel('Company system prompt', { exact: true }).fill('Keep this unsaved draft.')
  await page.clock.install()
  await prisma.companyAiConfig.update({ where: { companyId }, data: { systemPrompt: 'Updated in another window.', version: { increment: 1 } } })
  // Queries become stale after the application's one-minute cache window.
  await page.clock.fastForward(61000)
  await page.evaluate(() => window.dispatchEvent(new Event('visibilitychange')))
  await expect(page.getByText(/Your draft is preserved/)).toBeVisible()
  await expect(page.getByLabel('Company system prompt', { exact: true })).toHaveValue('Keep this unsaved draft.')
  await page.getByRole('button', { name: 'Reload saved settings', exact: true }).click()
  await expect(page.getByLabel('Company system prompt', { exact: true })).toHaveValue('Updated in another window.')
})
for (const width of [1440, 390]) test(`data assistant settings and chat fit ${width}px`, async ({ page, browser }) => {
  await signIn(page, owner, true); await page.setViewportSize({ width, height: 1000 }); await page.goto(`/dashboard/platform?company=${companyId}&tab=ai`)
  await page.getByRole('button', { name: 'Run test', exact: true }).click(); await expect(page.getByRole('heading', { name: 'Test answer', exact: true })).toBeVisible()
  await page.evaluate(() => window.scrollTo({ top: 0, behavior: 'instant' })); await page.screenshot({ path: join(review, `settings-${width}.png`), fullPage: true, animations: 'disabled' })
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  const context = await browser.newContext({ viewport: { width, height: 1000 } }), chat = await context.newPage(); await signIn(chat, admin); await openChat(chat); await newQuestion(chat)
  const log = await chat.getByRole('log').boundingBox(); expect(log!.height).toBeGreaterThan(450)
  await expect(chat.getByRole('button', { name: 'Send question', exact: true })).toBeInViewport()
  await chat.screenshot({ path: join(review, `chat-${width}.png`), fullPage: true, animations: 'disabled' }); expect(await chat.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width)
  await context.close()
})
