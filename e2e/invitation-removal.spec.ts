import { expect, test, type Page } from '@playwright/test'

async function mockInvitations(page: Page, baseURL: string, role = 'ADMIN') {
  const company = { id: 'company', name: 'Example Construction', appName: 'BuildFlo', currency: 'USD' }
  const user = { id: 'admin', firstName: 'Team', lastName: 'Member', email: 'admin@example.test', companyId: company.id, company, role }
  await page.context().addCookies([{ name: 'auth-token', value: 'mock-ui-session', url: baseURL }])
  await page.addInitScript(({ user }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'mock-ui-session', isAuthenticated: true }, version: 0 }))
  }, { user })
  const state = { removals: [] as string[], fail: false }
  let invitations = [
    { id: 'pending', email: 'pending@example.test', firstName: 'Pending', lastName: 'Person', role: 'STAFF', expiresAt: new Date(Date.now() + 86400000).toISOString() },
    { id: 'expired', email: 'expired@example.test', firstName: 'Expired', lastName: 'Person', role: 'STAFF', expiresAt: '2020-01-08T00:00:00Z' },
  ]
  await page.route('**/api/**', async route => {
    const { pathname, searchParams } = new URL(route.request().url())
    let response: unknown = []
    if (pathname === '/api/company/settings') response = { company }
    if (pathname === '/api/users') response = [user]
    if (pathname.includes('/notifications')) response = { notifications: [], unreadCount: 0 }
    if (pathname === '/api/team/invite') {
      if (route.request().method() === 'DELETE') {
        state.removals.push(searchParams.get('id')!)
        if (state.fail) return route.fulfill({ status: 500, json: { error: 'Failed to remove invitation' } })
        invitations = invitations.filter(invite => invite.id !== searchParams.get('id'))
        response = { success: true }
      } else response = invitations
    }
    await route.fulfill({ json: response })
  })
  return state
}

for (const width of [1440, 390]) {
  test(`confirms removal of pending and expired invitations at ${width}px`, async ({ page, baseURL }, testInfo) => {
    const state = await mockInvitations(page, baseURL!)
    await page.setViewportSize({ width, height: 900 })
    await page.goto('/dashboard/settings?tab=team')
    const section = page.getByRole('region', { name: 'Invitations', exact: true })
    const remove = section.getByRole('button', { name: 'Remove invitation for pending@example.test', exact: true })
    await expect(remove).toBeVisible()
    const resend = section.getByRole('button', { name: 'Resend invitation for pending@example.test', exact: true })
    for (const button of [resend, remove]) {
      await expect(button.locator('svg')).toHaveCount(1)
      await expect(button).toHaveAttribute('title', /invitation for pending@example.test/)
      const bounds = await button.boundingBox()
      expect(bounds!.height).toBeGreaterThanOrEqual(width < 640 ? 44 : 36)
      expect(bounds!.width).toBeGreaterThanOrEqual(44)
    }
    await remove.scrollIntoViewIfNeeded()
    await page.screenshot({ path: testInfo.outputPath('invitation-actions.png'), fullPage: true })
    await remove.click()
    await expect(page.getByRole('heading', { name: 'Remove invitation?' })).toBeVisible()
    await expect(page.getByText(/Their invitation links will stop working/)).toContainText('pending@example.test')
    await page.getByRole('button', { name: 'Cancel', exact: true }).click()
    expect(state.removals).toEqual([])
    await expect(section.getByText('pending@example.test', { exact: true })).toBeVisible()
    await remove.click()
    await page.getByRole('button', { name: 'Remove invitation', exact: true }).click()
    await expect(section.getByText('pending@example.test', { exact: true })).toHaveCount(0)
    await expect(section.getByText('expired@example.test', { exact: true })).toBeVisible()
    await section.getByRole('button', { name: 'Remove invitation for expired@example.test', exact: true }).click()
    await page.getByRole('button', { name: 'Remove invitation', exact: true }).click()
    await expect(section.getByText('No outstanding invitations.')).toBeVisible()
    expect(state.removals).toEqual(['pending', 'expired'])
  })
}

test('keeps an invitation on failure and allows removal to be retried', async ({ page, baseURL }) => {
  const state = await mockInvitations(page, baseURL!)
  state.fail = true
  await page.goto('/dashboard/settings?tab=team')
  const remove = page.getByRole('button', { name: 'Remove invitation for pending@example.test', exact: true })
  await remove.click()
  await page.getByRole('button', { name: 'Remove invitation', exact: true }).click()
  await expect(page.getByText('Failed to remove invitation', { exact: true })).toBeVisible()
  await expect(remove).toBeEnabled()
  state.fail = false
  await remove.click()
  await page.getByRole('button', { name: 'Remove invitation', exact: true }).click()
  await expect(remove).toHaveCount(0)
})

test('does not show invitation removal to staff', async ({ page, baseURL }) => {
  await mockInvitations(page, baseURL!, 'STAFF')
  await page.goto('/dashboard/settings?tab=team')
  await expect(page.getByRole('heading', { name: 'Team Management', exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: /Remove invitation/ })).toHaveCount(0)
})
