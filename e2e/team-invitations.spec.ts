import { expect, test } from '@playwright/test'

test('shows pending and expired invitations and distinguishes email failure from success', async ({ page, baseURL }) => {
  // Every API request is intercepted; this test never touches the database or sends mail.
  const company = { id: 'company', name: 'Example Construction', appName: 'BuildFlo', currency: 'USD' }
  const user = { id: 'admin', firstName: 'Team', lastName: 'Admin', email: 'admin@example.test', companyId: company.id, company, role: 'ADMIN' }
  await page.context().addCookies([{ name: 'auth-token', value: 'mock-ui-session', url: baseURL! }])
  await page.addInitScript(({ user }) => {
    localStorage.setItem('auth-storage', JSON.stringify({ state: { user, token: 'mock-ui-session', isAuthenticated: true }, version: 0 }))
  }, { user })
  const invitations = [
    { id: 'pending', email: 'pending@example.test', firstName: 'Pending', lastName: 'Person', role: 'STAFF', createdAt: new Date().toISOString(), expiresAt: new Date(Date.now() + 86400000).toISOString() },
    { id: 'expired', email: 'expired@example.test', firstName: 'Expired', lastName: 'Person', role: 'STAFF', createdAt: '2020-01-01T00:00:00Z', expiresAt: '2020-01-08T00:00:00Z' }
  ]
  let emailSent = false
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname
    let response: unknown = []
    if (path === '/api/company/settings') response = { company }
    if (path === '/api/users') response = [user]
    if (path.includes('/notifications')) response = { notifications: [], unreadCount: 0 }
    if (path === '/api/team/invite') {
      response = invitations
      if (route.request().method() === 'POST') {
        const body = route.request().postDataJSON()
        const invite = invitations.find(i => i.email === body.email)!
        invite.expiresAt = new Date(Date.now() + 7 * 86400000).toISOString()
        response = { invite, inviteUrl: 'https://example.test/invite/test-link', emailSent, resent: true }
      }
    }
    await route.fulfill({ json: response })
  })
  await page.goto('/dashboard/settings?tab=team')
  const section = page.getByRole('region', { name: 'Invitations', exact: true })
  await expect(section.getByText('pending@example.test')).toBeVisible()
  await expect(section.getByText('Pending acceptance', { exact: true })).toHaveCount(1)
  await expect(section.getByText('Expired', { exact: true })).toHaveCount(1)
  await section.getByRole('button', { name: 'Renew and resend' }).click()
  await expect(page.getByRole('heading', { name: 'Invitation Saved — Email Not Sent' })).toBeVisible()
  await expect(page.locator('input[value="https://example.test/invite/test-link"]')).toBeVisible()
  await page.getByRole('button', { name: 'Close', exact: true }).click()
  await expect(section.getByText('Pending acceptance', { exact: true })).toHaveCount(2)
  emailSent = true
  await section.getByRole('button', { name: 'Resend invitation' }).first().click()
  await expect(page.getByRole('heading', { name: 'Invitation Email Sent' })).toBeVisible()
})
